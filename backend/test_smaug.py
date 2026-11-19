import sys
from pathlib import Path

from huggingface_hub import snapshot_download

MODEL_ID = "abacusai/Smaug-AI-Image-Detector"

print("Loading Smaug AI Image Detector...")

# Download model files (cached for future runs)
model_path = snapshot_download(MODEL_ID)

# Add model directory to Python path
sys.path.insert(0, model_path)

from smaug_image_detect import SmaugImageDetect

# Load detector
detector = SmaugImageDetect.from_pretrained(model_path)

# Get image location
image_path = input("Enter the full path of an image: ").strip().strip('"')

# Validate image path
if not Path(image_path).is_file():
    raise FileNotFoundError("Image file not found.")

# Run actual AI detection
score = detector(image_path)

print("\n========== SMAUG DETECTION RESULT ==========")
print(f"AI-generated score: {float(score):.4f}")
print(f"AI-generated percentage: {float(score) * 100:.2f}%")
print("============================================")