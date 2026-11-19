import io
import asyncio
import pytest
from fastapi import HTTPException
from PIL import Image

from blockchain.hash_utils import file_hash, report_hash, scan_id_to_bytes32, is_hash
from utils.file_validator import validate_image_bytes


def png_bytes(color=(10, 20, 30)):
    buf = io.BytesIO()
    Image.new("RGB", (8, 8), color).save(buf, "PNG")
    return buf.getvalue()


def test_same_bytes_same_hash():
    assert file_hash(b"abc") == file_hash(b"abc")


def test_one_byte_changes_hash():
    assert file_hash(b"abc") != file_hash(b"abd")


def test_report_hash_ignores_key_order():
    a = {"x": 1, "y": {"b": 2, "a": 3}}
    b = {"y": {"a": 3, "b": 2}, "x": 1}
    assert report_hash(a) == report_hash(b)


def test_report_field_change_changes_hash():
    assert report_hash({"score": 0.5}) != report_hash({"score": 0.6})


def test_hash_format_and_scan_key():
    assert is_hash(file_hash(b"x"))
    assert is_hash(scan_id_to_bytes32("11111111-1111-1111-1111-111111111111"))


def test_valid_png_passes():
    info = validate_image_bytes(png_bytes(), "photo.png")
    assert info["format"] == "PNG" and info["width"] == 8


def test_wrong_extension_rejected():
    with pytest.raises(HTTPException) as e:
        validate_image_bytes(png_bytes(), "photo.jpg")
    assert e.value.status_code == 415


def test_not_an_image_rejected():
    with pytest.raises(HTTPException):
        validate_image_bytes(b"MZ not an image", "photo.png")


def test_corrupt_png_rejected():
    with pytest.raises(HTTPException) as e:
        validate_image_bytes(png_bytes()[:40], "photo.png")
    assert e.value.status_code == 422
