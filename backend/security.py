"""Authentication and a small in-memory rate limiter."""
import base64
import hashlib
import hmac
import time
from collections import defaultdict, deque
import jwt
from fastapi import Header, HTTPException, Request

from config import settings


def current_user(authorization: str | None = Header(default=None)) -> str:
    """Returns the user id. AUTH_MODE=dev is for local testing only."""
    if settings.auth_mode == "dev":
        return "dev-user"
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(401, "Sign in required.")
    token = authorization.split(" ", 1)[1].strip()
    try:
        payload = jwt.decode(token, settings.supabase_jwt_secret, algorithms=["HS256"],
                             audience="authenticated")
    except jwt.PyJWTError:
        raise HTTPException(401, "Invalid or expired session.")
    sub = payload.get("sub")
    if not sub:
        raise HTTPException(401, "Invalid session.")
    return sub


_hits: dict = defaultdict(deque)


def rate_limit(bucket: str, limit: int, window_s: int):
    """Dependency factory: allow `limit` requests per `window_s` seconds per client IP."""
    def dep(request: Request):
        key = f"{bucket}:{request.client.host if request.client else 'unknown'}"
        now = time.monotonic()
        q = _hits[key]
        while q and now - q[0] > window_s:
            q.popleft()
        if len(q) >= limit:
            raise HTTPException(429, "Too many requests. Please wait and try again.")
        q.append(now)
    return dep


# ---------------- Admin login ----------------
ADMIN_TOKEN_MINUTES = 30


def verify_password(password: str, stored: str) -> bool:
    """stored looks like: pbkdf2$200000$<salt_b64>$<hash_b64>"""
    try:
        scheme, iterations, salt_b64, hash_b64 = stored.split("$")
        if scheme != "pbkdf2":
            return False
        expected = base64.b64decode(hash_b64)
        actual = hashlib.pbkdf2_hmac(
            "sha256", password.encode("utf-8"), base64.b64decode(salt_b64), int(iterations)
        )
        return hmac.compare_digest(actual, expected)
    except Exception:
        return False


def check_admin_credentials(email: str, password: str) -> bool:
    # Both checks always run, so response time does not reveal which part was wrong.
    email_ok = hmac.compare_digest(
        email.strip().lower().encode("utf-8"), settings.admin_email.strip().lower().encode("utf-8")
    )
    password_ok = verify_password(password, settings.admin_password_hash)
    return email_ok and password_ok


def create_admin_token(email: str) -> str:
    now = int(time.time())
    return jwt.encode(
        {"sub": email, "role": "admin", "aud": "truthchain-admin",
         "iat": now, "exp": now + ADMIN_TOKEN_MINUTES * 60},
        settings.admin_jwt_secret, algorithm="HS256",
    )


def require_admin(authorization: str | None = Header(default=None)) -> str:
    """Dependency: only requests with a valid admin token get through."""
    if not settings.admin_configured:
        raise HTTPException(503, "Admin access is not configured on this server.")
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(401, "Admin sign-in required.")
    token = authorization.split(" ", 1)[1].strip()
    try:
        payload = jwt.decode(token, settings.admin_jwt_secret, algorithms=["HS256"],
                             audience="truthchain-admin")
    except jwt.PyJWTError:
        raise HTTPException(401, "Admin session expired. Sign in again.")
    if payload.get("role") != "admin":
        raise HTTPException(403, "Not an administrator.")
    return payload["sub"]