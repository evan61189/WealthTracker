"""Supabase JWT verification.

The backend no longer issues its own JWTs or manages passwords.
Supabase Auth handles all of that. We just verify the Supabase-issued
JWT on incoming requests.
"""

import jwt

from app.core.config import settings


def decode_supabase_token(token: str) -> dict | None:
    """Verify and decode a Supabase Auth JWT token."""
    try:
        payload = jwt.decode(
            token,
            settings.SUPABASE_JWT_SECRET,
            algorithms=["HS256"],
            audience="authenticated",
        )
        return payload
    except (jwt.InvalidTokenError, jwt.ExpiredSignatureError):
        return None
