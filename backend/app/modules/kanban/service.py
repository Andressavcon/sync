import uuid
from collections.abc import Sequence

from app.core.exceptions import ConflictError, InvalidDataError, NotFoundError
from app.core.models import utc_now
from app.modules.kanban.models import Card, CardStatus, Tag
from app.modules.kanban.repository import CardRepository, TagRepository
from app.modules.kanban.schemas import CardCreate, CardUpdate, TagCreate, TagUpdate


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


class CardService:
    def __init__(self, cards: CardRepository, tags: TagRepository):
        self.cards = cards
        self.tags = tags

    def list(self, user_id: uuid.UUID) -> Sequence[Card]:
        return self.cards.list(user_id)

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
            tags=self._load_tags(user_id, data.tag_ids),
            completed_at=utc_now() if data.status == CardStatus.DONE else None,
        )
        return self.cards.add(card)

    def update(self, user_id: uuid.UUID, card_id: uuid.UUID, data: CardUpdate) -> Card:
        card = self.get(user_id, card_id)
        # Only the fields the client actually sent (PATCH semantics)
        changes = data.model_dump(exclude_unset=True, exclude_none=True)

        if "tag_ids" in changes:
            card.tags = self._load_tags(user_id, changes.pop("tag_ids"))

        new_status = changes.get("status")
        if new_status is not None and new_status != card.status:
            # Section 4.4: keep when it was marked as done
            card.completed_at = utc_now() if new_status == CardStatus.DONE else None

        for field, value in changes.items():
            setattr(card, field, value)

        return self.cards.save(card)

    def delete(self, user_id: uuid.UUID, card_id: uuid.UUID) -> None:
        self.cards.delete(self.get(user_id, card_id))

    def _load_tags(self, user_id: uuid.UUID, tag_ids: list[uuid.UUID]) -> list[Tag]:
        unique_ids = list(dict.fromkeys(tag_ids))  # drop repeated ids, keep order
        tags = list(self.tags.get_many(user_id, unique_ids))
        if len(tags) != len(unique_ids):
            raise InvalidDataError("One or more tags do not exist")
        return tags
