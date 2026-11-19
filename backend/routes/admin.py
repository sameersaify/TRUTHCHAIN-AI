from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from config import settings
from database import repositories as db
from security import (ADMIN_TOKEN_MINUTES, check_admin_credentials, create_admin_token,
                      rate_limit, require_admin)

router = APIRouter(prefix="/api/v1/admin", tags=["admin"])


class LoginBody(BaseModel):
    email: str
    password: str


# 5 attempts per minute per IP slows down password guessing.
@router.post("/login", dependencies=[Depends(rate_limit("admin-login", 5, 60))])
def admin_login(body: LoginBody):
    if not settings.admin_configured:
        raise HTTPException(503, "Admin access is not configured on this server.")
    if not check_admin_credentials(body.email, body.password):
        raise HTTPException(401, "Invalid email or password.")
    return {"token": create_admin_token(body.email.strip().lower()),
            "expires_in_minutes": ADMIN_TOKEN_MINUTES}


@router.get("/stats")
def stats(admin: str = Depends(require_admin)):
    return db.admin_stats()


@router.get("/scans")
def list_all_scans(limit: int = 20, offset: int = 0, admin: str = Depends(require_admin)):
    limit = max(1, min(limit, 100))
    rows, total = db.admin_list_scans(limit, max(offset, 0))
    items = [{
        "scan_id": r["id"],
        "certificate_id": r["public_id"],
        "user": r["user_id"][:8],                       # shortened on purpose
        "media_type": r["media_type"],
        "is_demo": bool(r["is_demo"]),
        "model": f'{r["model_name"]} v{r["model_version"]}',
        "chain_status": r["chain_status"] or "not_registered",
        "tx_hash": r["tx_hash"],
        "file_hash": r["file_hash"],
        "created_at": r["created_at"],
        "revoked": bool(r["revoked_at"]),
    } for r in rows]
    return {"total": total, "items": items}


@router.post("/scans/{scan_id}/revoke")
def revoke(scan_id: str, admin: str = Depends(require_admin)):
    if not db.revoke_certificate(scan_id):
        raise HTTPException(404, "Scan not found or already revoked.")
    return {"revoked": True,
            "note": "The public certificate is hidden. Any on-chain record stays on the blockchain."}