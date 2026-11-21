"""Lightweight AI image detection using ONNX Runtime."""

import io
from functools import lru_cache
from pathlib import Path

import numpy as np
import onnxruntime as ort
from PIL import Image, ImageOps

from config import settings


PREPROCESSING_VERSION = (
    "CommunityForensics-INT8: "
    "EXIF-orient, RGB, shortest-edge-440, "
    "center-crop-384, CLIP-normalize"
)

MODEL_NAME = "CommunityForensics-DeepfakeDet-ViT-INT8"
MODEL_VERSION = "onnx-int8-v1"


@lru_cache(maxsize=1)
def _get_detector():
    """Load the ONNX model once and reuse it."""

    model_path = (
        Path(__file__).resolve().parent
        / "models"
        / "model_int8.onnx"
    )

    if not model_path.exists():
        raise RuntimeError(
            f"ONNX model not found: {model_path}"
        )

    print("Loading lightweight ONNX AI detector...")

    options = ort.SessionOptions()
    options.intra_op_num_threads = 1
    options.inter_op_num_threads = 1
    options.execution_mode = (
        ort.ExecutionMode.ORT_SEQUENTIAL
    )

    session = ort.InferenceSession(
        str(model_path),
        sess_options=options,
        providers=["CPUExecutionProvider"],
    )

    print("ONNX AI detector loaded successfully!")

    return session


def _preprocess_image(image: Image.Image) -> np.ndarray:
    """Prepare an image using the model's documented preprocessing."""

    image = image.convert("RGB")

    width, height = image.size

    scale = 440 / min(width, height)

    new_width = int(width * scale)
    new_height = int(height * scale)

    image = image.resize(
        (new_width, new_height),
        Image.Resampling.BICUBIC,
    )

    left = (new_width - 384) // 2
    top = (new_height - 384) // 2

    image = image.crop(
        (left, top, left + 384, top + 384)
    )

    array = np.asarray(
        image,
        dtype=np.float32,
    ) / 255.0

    mean = np.array(
        [0.4815, 0.4578, 0.4082],
        dtype=np.float32,
    )

    std = np.array(
        [0.2686, 0.2613, 0.2758],
        dtype=np.float32,
    )

    array = (array - mean) / std

    array = array.transpose(2, 0, 1)

    array = np.expand_dims(array, axis=0)

    return np.ascontiguousarray(array)


def analyze_image(data: bytes, file_hash_hex: str) -> dict:
    """Analyze uploaded image bytes using ONNX Runtime."""

    if settings.detector_mode != "real":
        raise RuntimeError(
            "Real detector requested, but "
            "DETECTOR_MODE is not set to real."
        )

    session = _get_detector()

    with Image.open(io.BytesIO(data)) as img:
        image = ImageOps.exif_transpose(img)
        input_array = _preprocess_image(image)

    output = session.run(
        None,
        {"pixel_values": input_array},
    )[0]

    logit = float(output[0, 0])

    # Convert the model's logit into an AI/fake score.
    if logit >= 0:
        raw_score = 1.0 / (1.0 + np.exp(-logit))
    else:
        exp_value = np.exp(logit)
        raw_score = exp_value / (1.0 + exp_value)

    raw_score = float(raw_score)

    if not 0 <= raw_score <= 1:
        raise ValueError(
            "ONNX model returned an invalid score."
        )

    return {
        "is_demo": False,
        "model": {
            "name": MODEL_NAME,
            "version": MODEL_VERSION,
            "preprocessing_version": PREPROCESSING_VERSION,
        },
        "raw_score": round(raw_score, 6),
        "calibrated": None,
        "calibration_version": (
            "not_independently_calibrated"
        ),
        "raw_output": [],
    }
