import re

_EMAIL_RE = re.compile(r"^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$", re.IGNORECASE)


def normalize_email(value: str | None) -> str:
    return (value or "").strip().lower()


def is_valid_email(value: str | None) -> bool:
    email = normalize_email(value)
    return bool(email and len(email) <= 254 and _EMAIL_RE.fullmatch(email))
