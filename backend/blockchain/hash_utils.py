"""SHA-256 helpers. A hash is a fingerprint of exact bytes; it is not encryption."""
import hashlib
import re

from utils.canonical_json import canonical_report_bytes

_HASH_RE = re.compile(r"^0x[0-9a-f]{64}$")


def sha256_hex(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def with_0x(hex_digest: str) -> str:
    return "0x" + hex_digest


def file_hash(data: bytes) -> str:
    """0x-prefixed SHA-256 of the exact uploaded bytes."""
    return with_0x(sha256_hex(data))


def report_hash(report: dict) -> str:
    """0x-prefixed SHA-256 of the canonical JSON bytes of a report."""
    return with_0x(sha256_hex(canonical_report_bytes(report)))


def scan_id_to_bytes32(scan_id: str) -> str:
    """Stable on-chain key for a scan: SHA-256 of the scan UUID string."""
    return with_0x(sha256_hex(scan_id.encode("utf-8")))


def is_hash(value: str) -> bool:
    return bool(_HASH_RE.match(value or ""))
