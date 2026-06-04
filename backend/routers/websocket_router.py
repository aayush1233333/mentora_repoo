"""
Mentora – WebSocket Router
ws://host/ws/{session_id}  → real-time fatigue stream
"""

import json
import asyncio
import logging
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query
from services.connection_manager import ConnectionManager
from services.firebase_service import FirebaseService

router   = APIRouter()
manager  = ConnectionManager()
firebase = FirebaseService()
logger   = logging.getLogger(__name__)


@router.websocket("/ws/{session_id}")
async def websocket_endpoint(websocket: WebSocket, session_id: str):
    await manager.connect(websocket, session_id)
    logger.info(f"WS connected: {session_id}")
    try:
        while True:
            raw = await asyncio.wait_for(websocket.receive_text(), timeout=30)
            data = json.loads(raw)

            # Client can push heartbeats or control messages
            if data.get("type") == "ping":
                await websocket.send_json({"type": "pong"})
            elif data.get("type") == "subscribe_session":
                pass  # already subscribed via route param

    except asyncio.TimeoutError:
        await websocket.send_json({"type": "ping"})
    except WebSocketDisconnect:
        manager.disconnect(websocket, session_id)
        logger.info(f"WS disconnected: {session_id}")
    except Exception as e:
        logger.error(f"WS error [{session_id}]: {e}")
        manager.disconnect(websocket, session_id)


class ConnectionManager:
    """Tracks active WebSocket connections per session."""

    def __init__(self):
        self.active: dict[str, list[WebSocket]] = {}

    async def connect(self, ws: WebSocket, session_id: str):
        await ws.accept()
        self.active.setdefault(session_id, []).append(ws)

    def disconnect(self, ws: WebSocket, session_id: str):
        if session_id in self.active:
            self.active[session_id] = [w for w in self.active[session_id] if w != ws]

    async def broadcast(self, session_id: str, data: dict):
        dead = []
        for ws in self.active.get(session_id, []):
            try:
                await ws.send_json(data)
            except Exception:
                dead.append(ws)
        for ws in dead:
            self.disconnect(ws, session_id)
