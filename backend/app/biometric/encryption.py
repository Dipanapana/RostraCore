"""Biometric template encryption using PostgreSQL pgcrypto."""

from sqlalchemy import text
from sqlalchemy.orm import Session
import json
import os


def get_encryption_key() -> str:
    """Get biometric encryption key from environment."""
    key = os.getenv("BIOMETRIC_ENCRYPTION_KEY")
    if not key:
        raise RuntimeError(
            "BIOMETRIC_ENCRYPTION_KEY environment variable not set. "
            "Generate one with: python -c \"import secrets; print(secrets.token_hex(32))\" "
            "and add it to backend/.env"
        )
    return key


def encrypt_template(db: Session, embedding: list[float]) -> bytes:
    """
    Encrypt a biometric embedding using pgcrypto.

    Args:
        db: SQLAlchemy session (for pgcrypto SQL call)
        embedding: List of floats (e.g., 512-d face vector)

    Returns:
        Encrypted bytes ready for storage in BYTEA column
    """
    key = get_encryption_key()
    embedding_json = json.dumps(embedding)
    result = db.execute(
        text("SELECT pgp_sym_encrypt(:data, :key, 'cipher-algo=aes256')"),
        {"data": embedding_json, "key": key}
    )
    return result.scalar()


def decrypt_template(db: Session, encrypted_data: bytes) -> list[float]:
    """
    Decrypt a biometric embedding from pgcrypto-encrypted storage.

    Args:
        db: SQLAlchemy session
        encrypted_data: BYTEA from biometric_templates.encrypted_template

    Returns:
        List of floats (the original embedding)
    """
    key = get_encryption_key()
    result = db.execute(
        text("SELECT pgp_sym_decrypt(:data, :key)"),
        {"data": encrypted_data, "key": key}
    )
    decrypted_json = result.scalar()
    return json.loads(decrypted_json)
