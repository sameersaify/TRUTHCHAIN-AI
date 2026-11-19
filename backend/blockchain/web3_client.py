"""Talks to the TruthChainRegistry contract on Polygon Amoy via Web3.py.
Reads work with any RPC. Writes use the server-side REGISTRAR_PRIVATE_KEY."""
import json
from functools import lru_cache

from web3 import Web3
from web3.exceptions import TransactionNotFound
from web3.middleware import ExtraDataToPOAMiddleware

from config import settings

MEDIA_CODES = {"image": 0, "video": 1, "audio": 2, "text": 3}


class ChainNotConfigured(Exception):
    pass


@lru_cache(maxsize=1)
def _w3() -> Web3:
    if not settings.chain_configured:
        raise ChainNotConfigured("Blockchain settings are missing in backend/.env")
    w3 = Web3(Web3.HTTPProvider(settings.amoy_rpc_url, request_kwargs={"timeout": 20}))
    w3.middleware_onion.inject(ExtraDataToPOAMiddleware, layer=0)  # Polygon is a PoA-style chain
    return w3


@lru_cache(maxsize=1)
def _contract():
    with open(settings.contract_abi_path, "r", encoding="utf-8") as f:
        abi = json.load(f)["abi"]
    w3 = _w3()
    return w3.eth.contract(address=Web3.to_checksum_address(settings.contract_address), abi=abi)


def _b32(hex_str: str) -> bytes:
    return bytes.fromhex(hex_str[2:])


def check_network():
    """Refuses to run against the wrong chain."""
    chain = _w3().eth.chain_id
    if chain != settings.chain_id:
        raise RuntimeError(f"Wrong chain: RPC reports {chain}, expected {settings.chain_id}")


def send_registration(scan_id_b32: str, file_hash: str, report_hash: str, media_type: str) -> str:
    """Signs and broadcasts registerScan(). Returns the transaction hash immediately."""
    check_network()
    w3, contract = _w3(), _contract()
    account = w3.eth.account.from_key(settings.registrar_private_key)
    tx = contract.functions.registerScan(
        _b32(scan_id_b32), _b32(file_hash), _b32(report_hash), MEDIA_CODES[media_type]
    ).build_transaction({
        "from": account.address,
        "nonce": w3.eth.get_transaction_count(account.address, "pending"),
        "chainId": settings.chain_id,
    })
    signed = w3.eth.account.sign_transaction(tx, settings.registrar_private_key)
    return w3.to_hex(w3.eth.send_raw_transaction(signed.raw_transaction))  # always 0x-prefixed


def get_receipt(tx_hash: str):
    """Returns {'status': 'pending'|'confirmed'|'failed', 'block_number': int|None}."""
    check_network()
    try:
        receipt = _w3().eth.get_transaction_receipt(tx_hash)
    except TransactionNotFound:
        return {"status": "pending", "block_number": None}
    ok = receipt["status"] == 1 and receipt["to"] and \
        receipt["to"].lower() == settings.contract_address.lower()
    return {"status": "confirmed" if ok else "failed", "block_number": receipt["blockNumber"]}


def wait_for_receipt(tx_hash: str, timeout_s: int = 120):
    """Waits for a receipt. On timeout returns 'pending' (never pretends it confirmed)."""
    try:
        _w3().eth.wait_for_transaction_receipt(tx_hash, timeout=timeout_s)
    except Exception:
        pass
    return get_receipt(tx_hash)


def read_verification(scan_id_b32: str, file_hash: str, report_hash: str) -> dict:
    """Independent read from the contract (no database involved)."""
    check_network()
    exists, file_ok, report_ok = _contract().functions.verifyScan(
        _b32(scan_id_b32), _b32(file_hash), _b32(report_hash)).call()
    return {"on_chain_exists": exists, "file_hash_matches": file_ok, "report_hash_matches": report_ok}
