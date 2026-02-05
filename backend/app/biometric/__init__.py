"""Biometric authentication services."""

# Optional imports - will be available when dependencies installed
try:
    from .encryption import encrypt_template, decrypt_template
    from .liveness import check_liveness
    __all__ = [
        "encrypt_template",
        "decrypt_template",
        "check_liveness",
    ]
except ImportError:
    # DeepFace or cv2 not installed yet
    __all__ = []
