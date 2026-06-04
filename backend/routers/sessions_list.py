"""
Mentora – Sessions List Router
GET    /sessions        → paginated list of user's sessions
GET    /sessions/{id}   → single session detail
DELETE /sessions/{id}   → delete session and its sub-collection
"""

import time
from fastapi import APIRouter, Depends, HTTPException, Query
from services.firebase_service import FirebaseService
from services.auth_service import get_current_user

router   = APIRouter()
firebase = FirebaseService()


@router.get("/sessions")
async def list_sessions(
    limit: int  = Query(default=20, ge=1, le=100),
    offset: int = Query(default=0,  ge=0),
    user=Depends(get_current_user),
):
    """Returns sessions for the authenticated user, newest first."""
    sessions = firebase.get_user_sessions(user["uid"], limit=limit, offset=offset)
    return {
        "sessions": sessions,
        "count":    len(sessions),
        "limit":    limit,
        "offset":   offset,
    }


@router.get("/sessions/{session_id}")
async def get_session(session_id: str, user=Depends(get_current_user)):
    session = firebase.get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    if session["user_id"] != user["uid"]:
        raise HTTPException(status_code=403, detail="Forbidden")
    return session


@router.delete("/sessions/{session_id}")
async def delete_session(session_id: str, user=Depends(get_current_user)):
    session = firebase.get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    if session["user_id"] != user["uid"]:
        raise HTTPException(status_code=403, detail="Forbidden")
    firebase.delete_session(session_id)
    return {"message": "Session deleted", "session_id": session_id}
