"""Passive liveness detection for biometric enrollment and verification."""

import numpy as np
import cv2
from deepface import DeepFace


def check_liveness(image_bytes: bytes) -> dict:
    """
    Passive liveness detection on enrollment/verification image.

    Checks:
    1. Face detected by DeepFace (retinaface backend for quality)
    2. Image sharpness (Laplacian variance) - detects printed photos
    3. Brightness distribution - detects screen displays

    Args:
        image_bytes: Raw image bytes (JPEG/PNG)

    Returns:
        {
            "is_live": bool,
            "face_detected": bool,
            "sharpness_score": float,
            "brightness_ok": bool,
            "face_confidence": float,
            "issues": list[str]  # Human-readable issues
        }
    """
    issues = []

    # Convert bytes to numpy array
    nparr = np.frombuffer(image_bytes, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

    if img is None:
        return {
            "is_live": False,
            "face_detected": False,
            "sharpness_score": 0.0,
            "brightness_ok": False,
            "face_confidence": 0.0,
            "issues": ["Invalid image format - could not decode image"]
        }

    # 1. Face detection with confidence
    face_detected = False
    face_confidence = 0.0
    face_region = None

    try:
        faces = DeepFace.extract_faces(
            img_path=img,
            detector_backend="retinaface",
            enforce_detection=False,
            align=True
        )

        if faces and len(faces) > 0:
            face_detected = True
            face_confidence = faces[0].get("confidence", 0.0)

            # Get face region coordinates for brightness check
            face_area = faces[0].get("facial_area", {})
            if face_area:
                x, y, w, h = face_area.get("x", 0), face_area.get("y", 0), face_area.get("w", 0), face_area.get("h", 0)
                if w > 0 and h > 0:
                    face_region = img[y:y+h, x:x+w]

        if not face_detected or face_confidence < 0.9:
            issues.append("No face detected - position face in frame")

    except Exception as e:
        issues.append(f"Face detection failed: {str(e)}")

    # 2. Sharpness check (Laplacian variance)
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    laplacian_var = cv2.Laplacian(gray, cv2.CV_64F).var()
    sharpness_score = float(laplacian_var)

    if sharpness_score < 100:
        issues.append("Image too blurry - hold device steady")

    # 3. Brightness check (use face region if available, else full image)
    brightness_ok = False
    target_region = face_region if face_region is not None else img

    if target_region is not None and target_region.size > 0:
        # Convert to grayscale if not already
        if len(target_region.shape) == 3:
            gray_region = cv2.cvtColor(target_region, cv2.COLOR_BGR2GRAY)
        else:
            gray_region = target_region

        mean_brightness = float(np.mean(gray_region))

        if mean_brightness < 60:
            issues.append("Too dark - need more light")
        elif mean_brightness > 220:
            issues.append("Too bright - reduce lighting or avoid screen glare")
        else:
            brightness_ok = True
    else:
        issues.append("Could not analyze brightness")

    # Overall liveness decision
    is_live = (
        face_detected and
        face_confidence >= 0.9 and
        sharpness_score >= 100 and
        brightness_ok
    )

    return {
        "is_live": is_live,
        "face_detected": face_detected,
        "sharpness_score": sharpness_score,
        "brightness_ok": brightness_ok,
        "face_confidence": face_confidence,
        "issues": issues if issues else []
    }
