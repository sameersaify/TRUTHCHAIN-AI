from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile

from blockchain import web3_client
from blockchain.certificate import build_certificate
from blockchain.hash_utils import file_hash as hash_file, is_hash, scan_id_to_bytes32
from config import settings
from database import repositories as db
from security import rate_limit
from utils.file_validator import read_limited

router = APIRouter(prefix="/api/v1", tags=["verification"],
                   dependencies=[Depends(rate_limit("verify", 30, 60))])


def _chain_read(scan: dict) -> dict:
    """Reads the contract independently. Failure is reported as 'unavailable', never as success."""
    if not settings.chain_configured:
        return {"available": False, "reason": "Blockchain is not configured on this server."}
    try:
        res = web3_client.read_verification(
            scan_id_to_bytes32(scan["id"]), scan["file_hash"], scan["report_hash"])
        return {"available": True, **res}
    except Exception:
        return {"available": False, "reason": "The blockchain could not be reached. Try again later."}


@router.get("/certificates/{certificate_id}")
def certificate_json(certificate_id: str):
    scan = db.get_by_public_id(certificate_id)
    if not scan or scan.get("revoked_at"):
        raise HTTPException(404, "Certificate not found.")
    return build_certificate(scan, db.get_chain_record(scan["id"]))


@router.get("/verify/{certificate_id}")
def verify_certificate(certificate_id: str):
    scan = db.get_by_public_id(certificate_id)
    if not scan or scan.get("revoked_at"):
        raise HTTPException(404, "Certificate not found.")
    chain_row = db.get_chain_record(scan["id"])
    cert = build_certificate(scan, chain_row)

    # 1) Is the stored report intact? Recompute its hash from the stored canonical JSON.
    from blockchain.hash_utils import sha256_hex, with_0x
    stored_report_ok = with_0x(sha256_hex(scan["report_json"].encode("utf-8"))) == scan["report_hash"]

    # 2) What does the chain say?
    chain = _chain_read(scan) if chain_row and chain_row["status"] != "failed" else \
        {"available": False, "reason": "This certificate has not been registered on-chain."}
    tx_status = chain_row["status"] if chain_row else "not_registered"

    def outcome(ok):
        return "match" if ok else "mismatch"

    return {
        "certificate": cert,
        "checks": {
            "stored_report_intact": outcome(stored_report_ok),
            "on_chain_record": ("found" if chain.get("on_chain_exists") else "not_found") if chain["available"] else "unavailable",
            "file_hash_on_chain": outcome(chain["file_hash_matches"]) if chain["available"] and chain.get("on_chain_exists") else "unavailable",
            "report_hash_on_chain": outcome(chain["report_hash_matches"]) if chain["available"] and chain.get("on_chain_exists") else "unavailable",
            "transaction": tx_status,
        },
        "chain_detail": chain,
        "notice": "A match proves the registered fingerprints are unchanged. It does not prove the detector's conclusion is correct.",
    }


@router.post("/verify/file")
async def verify_file(certificate_id: str = Form(...), file: UploadFile = File(...)):
    scan = db.get_by_public_id(certificate_id)
    if not scan or scan.get("revoked_at"):
        raise HTTPException(404, "Certificate not found.")
    data = await read_limited(file)
    submitted = hash_file(data)
    chain = _chain_read(scan)
    on_chain_file = chain.get("file_hash_matches") if chain.get("available") and chain.get("on_chain_exists") else None
    return {
        "submitted_file_hash": submitted,
        "matches_certificate": submitted == scan["file_hash"],
        "matches_on_chain_record": (submitted == scan["file_hash"] and on_chain_file) if on_chain_file is not None else "unavailable",
        "note": "Matching means these exact bytes were scanned. Any edit, re-save or re-compression changes the hash.",
    }


@router.get("/blockchain/tx/{tx_hash}")
def tx_status(tx_hash: str):
    if not is_hash(tx_hash.lower()):
        raise HTTPException(400, "Invalid transaction hash.")
    if not settings.chain_configured:
        raise HTTPException(503, "Blockchain is not configured on this server.")
    try:
        return web3_client.get_receipt(tx_hash)
    except Exception:
        raise HTTPException(503, "The blockchain could not be reached.")
