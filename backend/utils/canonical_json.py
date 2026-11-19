"""Deterministic JSON: same data -> same bytes -> same hash."""
import json


def canonical_report_bytes(report: dict) -> bytes:
    return json.dumps(
        report, sort_keys=True, separators=(",", ":"), ensure_ascii=False
    ).encode("utf-8")
