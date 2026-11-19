import json
import uuid

from fastapi import APIRouter, BackgroundTasks, Depends, File, HTTPException, UploadFile

from blockchain import web3_client
from blockchain.certificate import build_certificate
from blockchain.hash_utils import file_hash as hash_file, report_hash as hash_report, scan_id_to_bytes32
from config import settings
from database import repositories as db
from detection.image_detector import analyze_image
from security import current_user, rate_limit
from utils.file_validator import read_limited, validate_image_bytes

router = APIRouter(prefix="/api/v1/scans", tags=["scans"])


def _scan_response(scan: dict) -> dict:
    report = json.loads(scan["report_json"])
    chain = db.get_chain_record(scan["id"])
    return {
        "scan_id": scan["id"],
        "certificate_id": scan["public_id"],
        "media_type": scan["media_type"],
        "is_demo": bool(scan["is_demo"]),
        "score_label": report["score"]["label"],
        "ai_likelihood": report["score"]["calibrated"],   # 0-1, or null if uncalibrated
        "model_score": report["score"]["raw"],            # 0-1 raw model output
        "model": report["model"],
        "file_hash": scan["file_hash"],
        "report_hash": scan["report_hash"],
        "scanned_at": report["scanned_at"],
        "report": report,
        "certificate": build_certificate(scan, chain),
        "blockchain": {
            "network": "polygon-amoy",
            "status": chain["status"] if chain else "not_registered",
            "transaction_hash": chain["tx_hash"] if chain else None,
            "block_number": chain["block_number"] if chain else None,
            "error": chain["error"] if chain else None,
        },
    }


@router.post("/image", dependencies=[Depends(rate_limit("upload", 20, 60))])
async def scan_image(file: UploadFile = File(...), user_id: str = Depends(current_user)):
    data = await read_limited(file)
    validate_image_bytes(data, file.filename)

    fhash = hash_file(data)                       # exact uploaded bytes
    result = analyze_image(data, fhash)           # server-side inference only
    scan_id = str(uuid.uuid4())
    calibrated = result["calibrated"]
    label = "estimated_ai_likelihood" if calibrated is not None else "uncalibrated_model_score"

    report = {
        "schema_version": "1.0",
        "scan_id": scan_id,
        "media_type": "image",
        "file_hash": fhash,
        "file_hash_scope": "original_upload_bytes",
        "is_demo": result["is_demo"],
        "model": {**result["model"], "calibration_version": result["calibration_version"]},
        "score": {"raw": result["raw_score"], "calibrated": calibrated, "label": label},
        "scanned_at": db.now_iso(),
    }
    rhash = hash_report(report)
    public_id = "tc_" + uuid.uuid4().hex[:16]
    db.create_scan(
        {"id": scan_id, "user_id": user_id, "media_type": "image", "file_hash": fhash,
         "report_hash": rhash, "score_label": label, "is_demo": result["is_demo"],
         "model_name": report["model"]["name"], "model_version": report["model"]["version"],
         "created_at": report["scanned_at"]},
        report, public_id)
    return _scan_response(db.get_scan(scan_id))


@router.post("/video")
async def scan_video(user_id: str = Depends(current_user)):
    raise HTTPException(501, "Video analysis is planned for Release 2 (frame extraction with FFmpeg).")


@router.get("")
def list_scans(limit: int = 20, offset: int = 0, user_id: str = Depends(current_user)):
    limit = max(1, min(limit, 100))
    rows, total = db.list_scans(user_id, limit, max(offset, 0))
    return {"total": total, "items": [_scan_response(r) for r in rows]}


def _owned(scan_id: str, user_id: str) -> dict:
    scan = db.get_scan(scan_id)
    if not scan or scan["user_id"] != user_id:   # same answer for "missing" and "not yours"
        raise HTTPException(404, "Scan not found.")
    return scan


@router.get("/{scan_id}")
def get_scan(scan_id: str, user_id: str = Depends(current_user)):
    return _scan_response(_owned(scan_id, user_id))


@router.delete("/{scan_id}")
def delete_scan(scan_id: str, user_id: str = Depends(current_user)):
    _owned(scan_id, user_id)
    db.delete_scan(scan_id, user_id)
    return {"deleted": True, "note": "Any hash already published on-chain cannot be erased."}


def _register_job(scan_id: str, scan: dict):
    """Background task: send the transaction, then record confirmed / failed / pending."""
    try:
        tx = web3_client.send_registration(
            scan_id_to_bytes32(scan_id), scan["file_hash"], scan["report_hash"], scan["media_type"])
        db.upsert_chain_record(scan_id, "pending", settings.chain_id, settings.contract_address, tx)
        receipt = web3_client.wait_for_receipt(tx)
        db.upsert_chain_record(scan_id, receipt["status"], block_number=receipt["block_number"])
    except Exception as exc:  # RPC outage, revert, bad key ... never shown as success
        db.upsert_chain_record(scan_id, "failed", error=str(exc)[:300])


@router.post("/{scan_id}/register", status_code=202)
def register_scan(scan_id: str, background: BackgroundTasks, user_id: str = Depends(current_user)):
    scan = _owned(scan_id, user_id)
    if not settings.chain_configured:
        raise HTTPException(503, "Blockchain registration is not configured on this server.")
    existing = db.get_chain_record(scan_id)
    if existing and existing["status"] in ("pending", "confirmed"):   # idempotent: no duplicates
        return _scan_response(scan)["blockchain"]
    db.upsert_chain_record(scan_id, "pending", settings.chain_id, settings.contract_address)
    background.add_task(_register_job, scan_id, scan)
    return _scan_response(db.get_scan(scan_id))["blockchain"]
