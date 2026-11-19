"""Local SQLite storage for the MVP. database/schema.sql is the equivalent
Supabase/PostgreSQL schema with Row Level Security for the hosted version.
No media files are stored: only hashes, the report and metadata."""
import json
import os
import sqlite3
from contextlib import contextmanager
from datetime import datetime, timezone

from config import settings

SCHEMA = """
CREATE TABLE IF NOT EXISTS scans (
  id TEXT PRIMARY KEY, user_id TEXT NOT NULL, media_type TEXT NOT NULL,
  file_hash TEXT NOT NULL, report_hash TEXT NOT NULL, report_json TEXT NOT NULL,
  score_label TEXT NOT NULL, is_demo INTEGER NOT NULL DEFAULT 0,
  model_name TEXT NOT NULL, model_version TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'completed', created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS blockchain_records (
  id INTEGER PRIMARY KEY AUTOINCREMENT, scan_id TEXT NOT NULL UNIQUE,
  chain_id INTEGER, contract_address TEXT, tx_hash TEXT, block_number INTEGER,
  status TEXT NOT NULL, error TEXT, updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS certificates (
  public_id TEXT PRIMARY KEY, scan_id TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL, revoked_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_scans_user ON scans(user_id, created_at DESC);
"""


def now_iso() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


@contextmanager
def conn():
    os.makedirs(os.path.dirname(os.path.abspath(settings.database_path)), exist_ok=True)
    c = sqlite3.connect(settings.database_path)
    c.row_factory = sqlite3.Row
    try:
        yield c
        c.commit()
    finally:
        c.close()


def init_db():
    with conn() as c:
        c.executescript(SCHEMA)


def create_scan(scan, report: dict, public_id: str):
    with conn() as c:
        c.execute(
            "INSERT INTO scans (id,user_id,media_type,file_hash,report_hash,report_json,score_label,"
            "is_demo,model_name,model_version,status,created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)",
            (scan["id"], scan["user_id"], scan["media_type"], scan["file_hash"], scan["report_hash"],
             json.dumps(report, sort_keys=True, separators=(",", ":"), ensure_ascii=False),
             scan["score_label"], int(scan["is_demo"]), scan["model_name"], scan["model_version"],
             "completed", scan["created_at"]),
        )
        c.execute("INSERT INTO certificates (public_id,scan_id,created_at) VALUES (?,?,?)",
                  (public_id, scan["id"], now_iso()))


def get_scan(scan_id: str):
    with conn() as c:
        row = c.execute("SELECT s.*, c.public_id FROM scans s JOIN certificates c ON c.scan_id=s.id "
                        "WHERE s.id=?", (scan_id,)).fetchone()
    return dict(row) if row else None


def list_scans(user_id: str, limit: int = 20, offset: int = 0):
    with conn() as c:
        rows = c.execute("SELECT s.*, c.public_id FROM scans s JOIN certificates c ON c.scan_id=s.id "
                         "WHERE s.user_id=? ORDER BY s.created_at DESC LIMIT ? OFFSET ?",
                         (user_id, limit, offset)).fetchall()
        total = c.execute("SELECT COUNT(*) FROM scans WHERE user_id=?", (user_id,)).fetchone()[0]
    return [dict(r) for r in rows], total


def get_by_public_id(public_id: str):
    with conn() as c:
        row = c.execute("SELECT s.*, c.public_id, c.revoked_at FROM certificates c "
                        "JOIN scans s ON s.id=c.scan_id WHERE c.public_id=?", (public_id,)).fetchone()
    return dict(row) if row else None


def delete_scan(scan_id: str, user_id: str) -> bool:
    """Deletes the private database record. An already published on-chain hash cannot be erased."""
    with conn() as c:
        row = c.execute("SELECT id FROM scans WHERE id=? AND user_id=?", (scan_id, user_id)).fetchone()
        if not row:
            return False
        c.execute("DELETE FROM blockchain_records WHERE scan_id=?", (scan_id,))
        c.execute("UPDATE certificates SET revoked_at=? WHERE scan_id=?", (now_iso(), scan_id))
        c.execute("DELETE FROM scans WHERE id=?", (scan_id,))
        return True


def get_chain_record(scan_id: str):
    with conn() as c:
        row = c.execute("SELECT * FROM blockchain_records WHERE scan_id=?", (scan_id,)).fetchone()
    return dict(row) if row else None


def upsert_chain_record(scan_id: str, status: str, chain_id=None, contract_address=None,
                        tx_hash=None, block_number=None, error=None):
    with conn() as c:
        existing = c.execute("SELECT id FROM blockchain_records WHERE scan_id=?", (scan_id,)).fetchone()
        if existing:
            c.execute("UPDATE blockchain_records SET status=?, chain_id=COALESCE(?,chain_id), "
                      "contract_address=COALESCE(?,contract_address), tx_hash=COALESCE(?,tx_hash), "
                      "block_number=COALESCE(?,block_number), error=?, updated_at=? WHERE scan_id=?",
                      (status, chain_id, contract_address, tx_hash, block_number, error, now_iso(), scan_id))
        else:
            c.execute("INSERT INTO blockchain_records (scan_id,chain_id,contract_address,tx_hash,"
                      "block_number,status,error,updated_at) VALUES (?,?,?,?,?,?,?,?)",
                      (scan_id, chain_id, contract_address, tx_hash, block_number, status, error, now_iso()))


# ---------------- Admin queries ----------------
def admin_stats() -> dict:
    with conn() as c:
        def one(sql: str) -> int:
            return c.execute(sql).fetchone()[0] or 0

        by_chain = {r[0]: r[1] for r in c.execute(
            "SELECT status, COUNT(*) FROM blockchain_records GROUP BY status")}
        return {
            "total_scans": one("SELECT COUNT(*) FROM scans"),
            "unique_users": one("SELECT COUNT(DISTINCT user_id) FROM scans"),
            "demo_scans": one("SELECT COALESCE(SUM(is_demo), 0) FROM scans"),
            "scans_last_7_days": one(
                "SELECT COUNT(*) FROM scans WHERE created_at >= strftime('%Y-%m-%dT%H:%M:%SZ','now','-7 days')"),
            "revoked_certificates": one("SELECT COUNT(*) FROM certificates WHERE revoked_at IS NOT NULL"),
            "chain": {
                "pending": by_chain.get("pending", 0),
                "confirmed": by_chain.get("confirmed", 0),
                "failed": by_chain.get("failed", 0),
            },
        }


def admin_list_scans(limit: int = 20, offset: int = 0):
    with conn() as c:
        rows = c.execute(
            "SELECT s.id, s.user_id, s.media_type, s.file_hash, s.is_demo, s.model_name, s.model_version, "
            "s.created_at, c.public_id, c.revoked_at, b.status AS chain_status, b.tx_hash "
            "FROM scans s JOIN certificates c ON c.scan_id = s.id "
            "LEFT JOIN blockchain_records b ON b.scan_id = s.id "
            "ORDER BY s.created_at DESC LIMIT ? OFFSET ?", (limit, offset)).fetchall()
        total = c.execute("SELECT COUNT(*) FROM scans").fetchone()[0]
    return [dict(r) for r in rows], total


def revoke_certificate(scan_id: str) -> bool:
    """Hides the public certificate. An on-chain record cannot be removed."""
    with conn() as c:
        cur = c.execute("UPDATE certificates SET revoked_at=? WHERE scan_id=? AND revoked_at IS NULL",
                        (now_iso(), scan_id))
        return cur.rowcount > 0