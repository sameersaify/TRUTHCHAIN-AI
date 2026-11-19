"""Strict upload validation. Never trust filename or browser MIME type."""
import io
from fastapi import HTTPException, UploadFile
from PIL import Image, UnidentifiedImageError

from config import settings

ALLOWED = {
    # extension: (MIME type, Pillow format)
    ".jpg": ("image/jpeg", "JPEG"),
    ".jpeg": ("image/jpeg", "JPEG"),
    ".png": ("image/png", "PNG"),
    ".webp": ("image/webp", "WEBP"),
}
MAX_PIXELS = 50_000_000  # blocks "decompression bomb" images
Image.MAX_IMAGE_PIXELS = MAX_PIXELS


def _sniff(data: bytes):
    """Identify the real format from the first bytes (magic bytes)."""
    if data.startswith(b"\xff\xd8\xff"):
        return "JPEG"
    if data.startswith(b"\x89PNG\r\n\x1a\n"):
        return "PNG"
    if data[:4] == b"RIFF" and data[8:12] == b"WEBP":
        return "WEBP"
    return None


async def read_limited(upload: UploadFile) -> bytes:
    """Read the upload in chunks and stop early if it is too large."""
    limit = settings.max_upload_bytes
    chunks, total = [], 0
    while True:
        chunk = await upload.read(1024 * 1024)
        if not chunk:
            break
        total += len(chunk)
        if total > limit:
            raise HTTPException(413, f"File too large. Maximum is {limit // (1024 * 1024)} MB.")
        chunks.append(chunk)
    if total == 0:
        raise HTTPException(400, "The file is empty.")
    return b"".join(chunks)


def validate_image_bytes(data: bytes, filename) -> dict:
    """Checks extension, magic bytes and that the image really decodes."""
    name = filename or ""
    ext = ("." + name.rsplit(".", 1)[-1].lower()) if "." in name else ""
    if ext not in ALLOWED:
        raise HTTPException(415, "Unsupported file type. Use JPG, PNG or WEBP.")
    sniffed = _sniff(data)
    if sniffed is None:
        raise HTTPException(415, "File content is not a supported image.")
    if sniffed != ALLOWED[ext][1]:
        raise HTTPException(415, "File extension does not match the file content.")
    try:
        with Image.open(io.BytesIO(data)) as probe:
            probe.verify()  # structural check
        with Image.open(io.BytesIO(data)) as img:
            img.load()  # full decode
            width, height = img.size
    except (UnidentifiedImageError, OSError, Image.DecompressionBombError, SyntaxError, ValueError):
        raise HTTPException(422, "The image is corrupted or cannot be decoded.")
    return {"format": sniffed, "mime": ALLOWED[ext][0], "width": width, "height": height}
