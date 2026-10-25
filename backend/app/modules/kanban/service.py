import uuid
from collections.abc import Sequence
from datetime import date, datetime

from app.core.exceptions import ConflictError, InvalidDataError, NotFoundError
from app.core.models import utc_now
from app.modules.kanban.board import Board, build_board, week_bounds
from app.modules.kanban.models import Card, CardStatus, RecurrenceRule, Tag
from app.modules.kanban.recurrence import ONE_DAY, dates_between, next_date, validate_schedule
from app.modules.kanban.repository import CardRepository, RecurrenceRepository, TagRepository
from app.modules.kanban.schemas import (
    CardCreate,
    CardUpdate,
    RecurrenceCreate,
    RecurrenceUpdate,
    Scope,
    TagCreate,
    TagUpdate,
)

# Fields copied from a recurrence rule to its cards
TEMPLATE_FIELDS = ("title", "content", "due_time")


def load_tags(tags: TagRepository, user_id: uuid.UUID, tag_ids: list[uuid.UUID]) -> list[Tag]:
    """The user's tags with these ids; fails if any of them doesn't exist."""
    unique_ids = list(dict.fromkeys(tag_ids))  # drop repeated ids, keep order
    found = list(tags.get_many(user_id, unique_ids))
    if len(found) != len(unique_ids):
        raise InvalidDataError("One or more tags do not exist")
    return found


class TagService:
    def __init__(self, tags: TagRepository):
        self.tags = tags

    def list(self, user_id: uuid.UUID) -> Sequence[Tag]:
        return self.tags.list(user_id)

    def create(self, user_id: uuid.UUID, data: TagCreate) -> Tag:
        self._ensure_name_is_free(user_id, data.name)
        return self.tags.add(Tag(user_id=user_id, name=data.name))

    def update(self, user_id: uuid.UUID, tag_id: uuid.UUID, data: TagUpdate) -> Tag:
        tag = self._get_or_404(user_id, tag_id)
        self._ensure_name_is_free(user_id, data.name, ignore_id=tag.id)
        tag.name = data.name
        return self.tags.save(tag)

    def delete(self, user_id: uuid.UUID, tag_id: uuid.UUID) -> None:
        # The tag leaves its cards; the cards themselves are kept
        self.tags.delete(self._get_or_404(user_id, tag_id))

    def _get_or_404(self, user_id: uuid.UUID, tag_id: uuid.UUID) -> Tag:
        tag = self.tags.get(user_id, tag_id)
        if tag is None:
            raise NotFoundError("Tag not found")
        return tag

    def _ensure_name_is_free(
        self, user_id: uuid.UUID, name: str, ignore_id: uuid.UUID | None = None
    ) -> None:
        existing = self.tags.find_by_name(user_id, name)
        if existing is not None and existing.id != ignore_id:
            raise ConflictError(f'A tag named "{name}" already exists')


class RecurrenceService:
    """Recurring cards (section 4.10): rules and the cards generated from them."""

    def __init__(self, rules: RecurrenceRepository, cards: CardRepository, tags: TagRepository):
        self.rules = rules
        self.cards = cards
        self.tags = tags

    def list(self, user_id: uuid.UUID) -> Sequence[RecurrenceRule]:
        return self.rules.list(user_id)

    def get(self, user_id: uuid.UUID, rule_id: uuid.UUID) -> RecurrenceRule:
        rule = self.rules.get(user_id, rule_id)
        if rule is None:
            raise NotFoundError("Recurrence not found")
        return rule

    def create(self, user_id: uuid.UUID, data: RecurrenceCreate, today: date) -> RecurrenceRule:
        rule = RecurrenceRule(
            id=uuid.uuid4(),  # needed now: the generated cards point to it
            user_id=user_id,
            title=data.title,
            content=data.content,
            due_time=data.due_time,
            tags=load_tags(self.tags, user_id, data.tag_ids),
            frequency=data.frequency,
            weekdays=sorted(set(data.weekdays)),
            month_day=data.month_day,
            start_date=data.start_date,
            end_date=data.end_date,
        )
        validate_schedule(rule)
        self.rules.add(rule)
        self._generate(rule, today)
        self.rules.commit()
        return rule

    def update(
        self, user_id: uuid.UUID, rule_id: uuid.UUID, data: RecurrenceUpdate, today: date
    ) -> RecurrenceRule:
        """Changes the rule from today on: open future occurrences are recreated."""
        rule = self.get(user_id, rule_id)
        changes = data.model_dump(exclude_unset=True)
        # Only end_date and month_day may be cleared with null
        changes = {
            k: v for k, v in changes.items() if v is not None or k in ("end_date", "month_day")
        }

        if "tag_ids" in changes:
            rule.tags = load_tags(self.tags, user_id, changes.pop("tag_ids"))
        if "weekdays" in changes:
            changes["weekdays"] = sorted(set(changes["weekdays"]))
        for field, value in changes.items():
            setattr(rule, field, value)
        validate_schedule(rule)

        self.cards.delete_many(self.cards.open_occurrences(rule.id, today))
        self.cards.flush()  # deletes reach the database before new cards reuse those dates
        rule.generated_until = today - ONE_DAY
        self._generate(rule, today)
        self.rules.commit()
        return rule

    def delete(self, user_id: uuid.UUID, rule_id: uuid.UUID, today: date) -> None:
        """Stops repeating: open occurrences from today on go away, past ones stay."""
        rule = self.get(user_id, rule_id)
        self.cards.delete_many(self.cards.open_occurrences(rule.id, today))
        self.rules.delete(rule)
        self.rules.commit()

    def ensure_occurrences(self, user_id: uuid.UUID, today: date) -> None:
        """Creates the cards each rule needs for the current week (called by the board)."""
        for rule in self.rules.list(user_id):
            self._generate(rule, today)
        self.rules.commit()

    def _generate(self, rule: RecurrenceRule, today: date) -> None:
        """Cards for every date until the end of this week, plus only the next one after it.

        `generated_until` remembers how far it went, so a deleted occurrence is not recreated.
        """
        _, week_end = week_bounds(today)
        after = rule.generated_until or rule.start_date - ONE_DAY

        dates = dates_between(rule, after, week_end)
        last = max(after, week_end)
        if after <= week_end:
            # Upcoming events show only the next occurrence (section 4.10)
            upcoming = next_date(rule, last)
            if upcoming is not None:
                dates.append(upcoming)
                last = upcoming

        if dates:
            existing = self.cards.occurrence_dates(rule.id, dates[0])
            self.cards.add_all(
                [self._card_from_rule(rule, day) for day in dates if day not in existing]
            )
        rule.generated_until = last

    @staticmethod
    def _card_from_rule(rule: RecurrenceRule, day: date) -> Card:
        return Card(
            user_id=rule.user_id,
            title=rule.title,
            content=rule.content,
            due_date=day,
            due_time=rule.due_time,
            tags=list(rule.tags),
            status=CardStatus.PENDING,
            recurrence=rule,
            occurrence_date=day,
        )


class CardService:
    def __init__(self, cards: CardRepository, tags: TagRepository, recurrences: RecurrenceService):
        self.cards = cards
        self.tags = tags
        self.recurrences = recurrences

    def list(self, user_id: uuid.UUID) -> Sequence[Card]:
        return self.cards.list(user_id)

    def board(
        self, user_id: uuid.UUID, now: datetime, tag_ids: list[uuid.UUID] | None = None
    ) -> Board:
        """The current week, already split into days and sections."""
        self.recurrences.ensure_occurrences(user_id, now.date())
        return build_board(self.cards.list(user_id, tag_ids), now)

    def get(self, user_id: uuid.UUID, card_id: uuid.UUID) -> Card:
        card = self.cards.get(user_id, card_id)
        if card is None:
            raise NotFoundError("Card not found")
        return card

    def create(self, user_id: uuid.UUID, data: CardCreate) -> Card:
        card = Card(
            user_id=user_id,
            title=data.title,
            content=data.content,
            status=data.status,
            due_date=data.due_date,
            due_time=data.due_time,
            tags=load_tags(self.tags, user_id, data.tag_ids),
            completed_at=utc_now() if data.status == CardStatus.DONE else None,
        )
        return self.cards.add(card)

    def update(
        self, user_id: uuid.UUID, card_id: uuid.UUID, data: CardUpdate, scope: Scope = Scope.THIS
    ) -> Card:
        card = self.get(user_id, card_id)
        # Only the fields the client actually sent (PATCH semantics)
        changes = data.model_dump(exclude_unset=True, exclude_none=True)

        new_tags = None
        if "tag_ids" in changes:
            new_tags = load_tags(self.tags, user_id, changes.pop("tag_ids"))
            card.tags = new_tags

        new_status = changes.get("status")
        if new_status is not None and new_status != card.status:
            # Section 4.4: keep when it was marked as done
            card.completed_at = utc_now() if new_status == CardStatus.DONE else None

        for field, value in changes.items():
            setattr(card, field, value)

        if scope == Scope.FOLLOWING:
            # Title, content, time and tags also go to the rule and the next open occurrences.
            # Status and date stay only on this card.
            rule = self._rule_of(user_id, card)
            template = {k: v for k, v in changes.items() if k in TEMPLATE_FIELDS}
            following = self.cards.open_occurrences(rule.id, card.occurrence_date)
            for target in [rule, *(c for c in following if c.id != card.id)]:
                for field, value in template.items():
                    setattr(target, field, value)
                if new_tags is not None:
                    target.tags = list(new_tags)

        return self.cards.save(card)

    def delete(self, user_id: uuid.UUID, card_id: uuid.UUID, scope: Scope = Scope.THIS) -> None:
        card = self.get(user_id, card_id)
        if scope == Scope.FOLLOWING:
            # The rule ends the day before this occurrence; the next open ones go away
            rule = self._rule_of(user_id, card)
            rule.end_date = card.occurrence_date - ONE_DAY
            following = self.cards.open_occurrences(rule.id, card.occurrence_date)
            self.cards.delete_many([c for c in following if c.id != card.id])
        self.cards.delete(card)

    def _rule_of(self, user_id: uuid.UUID, card: Card) -> RecurrenceRule:
        if card.recurrence_id is None or card.occurrence_date is None:
            raise InvalidDataError("This card is not recurring")
        return self.recurrences.get(user_id, card.recurrence_id)
