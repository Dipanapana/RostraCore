"""Biometric authentication services."""

# Core verification functions (no external dependencies beyond numpy)
from .verification import verify_face_embedding, process_verification
from .adaptive_threshold import get_adaptive_threshold

__all__ = [
    "verify_face_embedding",
    "process_verification",
    "get_adaptive_threshold",
]

# Optional imports - will be available when dependencies fully installed
try:
    from .encryption import encrypt_template, decrypt_template
    __all__.extend(["encrypt_template", "decrypt_template"])
except (ImportError, Exception):
    pass

try:
    from .liveness import check_liveness
    __all__.extend(["check_liveness"])
except (ImportError, ValueError, Exception):
    # DeepFace/cv2/tf-keras not installed or misconfigured
    pass

try:
    from .enrollment import start_enrollment_session, enroll_face, get_enrollment_status
    __all__.extend(["start_enrollment_session", "enroll_face", "get_enrollment_status"])
except (ImportError, ValueError, Exception):
    # DeepFace/cv2/tf-keras not installed or misconfigured
    pass
