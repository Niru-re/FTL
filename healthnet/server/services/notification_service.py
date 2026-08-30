import asyncio
import json
import logging
from typing import List, Dict, Any, Optional
from fastapi import WebSocket

from .websocket_manager import websocket_manager

logger = logging.getLogger("healthnet.notification_service")

class NotificationService:
    """Compatibility layer delegating to centralized WebSocketManager"""

    async def connect(self, websocket: WebSocket, token: Optional[str] = None):
        return await websocket_manager.connect(websocket, token)

    def disconnect(self, websocket: WebSocket):
        websocket_manager.disconnect(websocket)

    async def broadcast(self, event_type: Any, data: Any = None):
        if isinstance(event_type, dict) and data is None:
            ev_name = event_type.get("event") or event_type.get("type", "GENERAL_NOTIFICATION")
            ev_data = event_type.get("data", {})
            hosp_id = event_type.get("hospital_id")
            branch_id = event_type.get("branch_id")
        else:
            ev_name = str(event_type)
            ev_data = data or {}
            hosp_id = ev_data.get("hospital_id") if isinstance(ev_data, dict) else None
            branch_id = ev_data.get("branch_id") if isinstance(ev_data, dict) else None

        await websocket_manager.broadcast_event(
            event_name=ev_name,
            data=ev_data,
            hospital_id=hosp_id,
            branch_id=branch_id
        )

    def broadcast_sync(self, event_type: Any, data: Any = None):
        if isinstance(event_type, dict) and data is None:
            ev_name = event_type.get("event") or event_type.get("type", "GENERAL_NOTIFICATION")
            ev_data = event_type.get("data", {})
            hosp_id = event_type.get("hospital_id")
            branch_id = event_type.get("branch_id")
        else:
            ev_name = str(event_type)
            ev_data = data or {}
            hosp_id = ev_data.get("hospital_id") if isinstance(ev_data, dict) else None
            branch_id = ev_data.get("branch_id") if isinstance(ev_data, dict) else None

        websocket_manager.broadcast_sync(
            event_name=ev_name,
            data=ev_data,
            hospital_id=hosp_id,
            branch_id=branch_id
        )

notification_service = NotificationService()
