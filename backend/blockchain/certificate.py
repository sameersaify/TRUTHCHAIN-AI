"""Builds the public certificate JSON. Contains only intentionally public fields:
no user id, no email, no media, no storage URL."""
import json

from config import settings


def build_certificate(scan: dict, chain: dict | None) -> dict:
    report = json.loads(scan["report_json"])
    chain = chain or {}
    tx_hash = chain.get("tx_hash")
    return {
        "certificate_id": scan["public_id"],
        "media_type": scan["media_type"],
        "scanned_at": report["scanned_at"],
        "is_demo": bool(scan["is_demo"]),
        "file_hash": scan["file_hash"],
        "report_hash": scan["report_hash"],
        "model": report["model"],
        "score": report["score"],
        "limitations": (
            "Estimated likelihood from a statistical model. Not proof of AI authorship. "
            "Edits, compression and unseen generators reduce reliability. A blockchain record "
            "shows the report was not altered after registration; it does not prove the report is correct."
        ),
        "blockchain": {
            "network": "polygon-amoy",
            "chain_id": chain.get("chain_id") or settings.chain_id,
            "contract_address": chain.get("contract_address"),
            "status": chain.get("status", "not_registered"),
            "transaction_hash": tx_hash,
            "explorer_url": f"{settings.explorer_base_url}/tx/{tx_hash}" if tx_hash else None,
        },
    }
