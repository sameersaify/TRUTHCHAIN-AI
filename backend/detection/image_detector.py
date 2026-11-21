"""Real AI image detection using Smaug."""

"""Real AI image detection using Smaug."""

import io
from functools import lru_cache

from PIL import Image, ImageOps
from huggingface_hub import snapshot_download

from config import settings

PREPROCESSING_VERSION = "Smaug-1.0: EXIF-orient, RGB"

@lru_cache(maxsize=1)
def _get_detector():
    """Download and load Smaug only once."""
    model_id = settings.model_id

    if not model_id:
        raise RuntimeError("MODEL_ID is empty in backend/.env")

    print("Loading Smaug AI Image Detector...")

    model_path = snapshot_download(model_id)

    import sys
    sys.path.insert(0, model_path)

    from smaug_image_detect import SmaugImageDetect

    detector = SmaugImageDetect.from_pretrained(model_path)

    print("Smaug model loaded successfully!")

    return detector


def analyze_image(data: bytes, file_hash_hex: str) -> dict:
    """Analyze uploaded image bytes using Smaug."""

    if settings.detector_mode != "real":
        raise RuntimeError(
            "Real detector requested, but DETECTOR_MODE is not set to real."
        )

    detector = _get_detector()

    with Image.open(io.BytesIO(data)) as img:
        image = ImageOps.exif_transpose(img).convert("RGB")
        score = detector(image, crops=1)

    raw_score = float(score)

    if not 0 <= raw_score <= 1:
        raise ValueError("Smaug returned a score outside the expected range.")

    return {
        "is_demo": False,
        "model": {
            "name": settings.model_id,
            "version": settings.model_version,
            "preprocessing_version": PREPROCESSING_VERSION,
        },
        "raw_score": round(raw_score, 6),
        "calibrated": None,
        "calibration_version": "not_independently_calibrated",
        "raw_output": [],
    }
