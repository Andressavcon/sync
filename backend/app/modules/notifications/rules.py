"""When a card reminder is due (section 6). Pure functions, no database."""

from datetime import date, timedelta


def reminder_is_due(due_date: date, remind_days_before: int | None, today: date) -> bool:
    """From `remind_days_before` days before the due date on (0 = on the day itself)."""
    if remind_days_before is None:
        return False
    return due_date - timedelta(days=remind_days_before) <= today


def countdown_text(due_date: date, today: date) -> str:
    days = (due_date - today).days
    if days == 0:
        return "é hoje"
    if days == 1:
        return "é amanhã"
    if days > 1:
        return f"faltam {days} dias"
    return "já passou"
