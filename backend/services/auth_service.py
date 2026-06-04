"""
Mentora – Auth Service
Verifies Firebase ID tokens sent in the Authorization header.
"""

import os
import logging
from fastapi import Header, HTTPException, status

logger = logging.getLogger(__name__)
_STUB_USER = {"uid": "dev-user-001", "email": "dev@mentora.ai"}


async def get_current_user(authorization: str = Header(default="")) -> dict:
    """
    Expects: Authorization: Bearer <firebase-id-token>
    Falls back to a dev stub when Firebase is not configured.
    """
    env = os.getenv("ENV", "development")

    if not authorization.startswith("Bearer "):
        if env == "development":
            return _STUB_USER
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing Bearer token",
        )

    token = authorization.removeprefix("Bearer ").strip()

    try:
        import firebase_admin
        from firebase_admin import auth as firebase_auth

        if not firebase_admin._apps:
            if env == "development":
                logger.warning("Firebase Admin not initialized – returning stub user.")
                return _STUB_USER
            raise RuntimeError("Firebase Admin is not initialized")

        decoded = firebase_auth.verify_id_token(token)
        return {"uid": decoded["uid"], "email": decoded.get("email", "")}
    except ImportError:
        if env == "development":
            logger.warning("firebase_admin not available – returning stub user.")
            return _STUB_USER
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="firebase_admin not installed",
        )
    except Exception as e:
        if env == "development":
            logger.warning(f"Token verification failed in development – returning stub user. Error: {e}")
            return _STUB_USER
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid token: {e}",
        )
