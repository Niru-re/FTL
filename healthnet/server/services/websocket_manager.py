import asyncio
import json
import datetime
import logging
from typing import Dict, List, Optional, Set, Any
from fastapi import WebSocket, WebSocketDisconnect
from sqlalchemy.orm import Session

from ..database import SessionLocal
from ..auth import decode_access_token
from ..models import User, EventLog

logger = logging.getLogger("healthnet.websocket_manager")

class ConnectionContext:
    def __init__(
        self,
        websocket: WebSocket,
        user_id: Optional[int] = None,
        role: Optional[str] = None,
        hospital_id: Optional[int] = None,
        branch_id: Optional[int] = None,
        department_id: Optional[int] = None,
        user_name: Optional[str] = None
    ):
        self.websocket = websocket
        self.user_id = user_id
        self.role = role
        self.hospital_id = hospital_id
        self.branch_id = branch_id
        self.department_id = department_id
        self.user_name = user_name
        self.channels: Set[str] = {"network"}

        # Register standard contextual channels
        if self.role:
            self.channels.add(f"role:{self.role}")
        if self.hospital_id:
            self.channels.add(f"hospital:{self.hospital_id}")
        if self.branch_id:
            self.channels.add(f"branch:{self.branch_id}")
        if self.department_id:
            self.channels.add(f"department:{self.department_id}")
        if self.user_id:
            self.channels.add(f"user:{self.user_id}")

class WebSocketManager:
    def __init__(self):
        # Map websocket to ConnectionContext
        self.connections: Dict[WebSocket, ConnectionContext] = {}
        # Channel to set of WebSockets
        self.channel_subscribers: Dict[str, Set[WebSocket]] = {}

    async def connect(self, websocket: WebSocket, token: Optional[str] = None) -> ConnectionContext:
        await websocket.accept()
        ctx = ConnectionContext(websocket=websocket)

        if token:
            try:
                payload = decode_access_token(token)
                if payload and "sub" in payload:
                    db: Session = SessionLocal()
                    try:
                        user = db.query(User).filter(User.email == payload["sub"]).first()
                        if user:
                            role_str = user.role.name if user.role else "ADMIN"
                            hosp_id = user.hospital_id
                            branch_id = user.branch_id
                            dept_id = getattr(user, "department_id", None)
                            user_name = user.full_name or user.email

                            ctx = ConnectionContext(
                                websocket=websocket,
                                user_id=user.id,
                                role=role_str,
                                hospital_id=hosp_id,
                                branch_id=branch_id,
                                department_id=dept_id,
                                user_name=user_name
                            )
                    finally:
                        db.close()
            except Exception as e:
                logger.warning(f"WebSocket auth token validation error: {e}")

        self.connections[websocket] = ctx

        # Register subscriptions
        for ch in ctx.channels:
            if ch not in self.channel_subscribers:
                self.channel_subscribers[ch] = set()
            self.channel_subscribers[ch].add(websocket)

        logger.info(f"WebSocket client connected: user={ctx.user_name} (role={ctx.role}, channels={list(ctx.channels)}). Total active: {len(self.connections)}")

        # Send initial confirmation event
        welcome_event = {
            "event": "CONNECTION_ESTABLISHED",
            "type": "CONNECTION_ESTABLISHED",
            "timestamp": datetime.datetime.utcnow().isoformat(),
            "data": {
                "status": "CONNECTED",
                "user_id": ctx.user_id,
                "role": ctx.role,
                "channels": list(ctx.channels)
            }
        }
        try:
            await websocket.send_text(json.dumps(welcome_event))
        except Exception:
            pass

        return ctx

    def disconnect(self, websocket: WebSocket):
        ctx = self.connections.pop(websocket, None)
        if ctx:
            for ch in ctx.channels:
                if ch in self.channel_subscribers and websocket in self.channel_subscribers[ch]:
                    self.channel_subscribers[ch].remove(websocket)
                    if not self.channel_subscribers[ch]:
                        del self.channel_subscribers[ch]
            logger.info(f"WebSocket client disconnected: user={ctx.user_name}. Remaining active: {len(self.connections)}")

    def subscribe_channel(self, websocket: WebSocket, channel: str):
        ctx = self.connections.get(websocket)
        if ctx:
            ctx.channels.add(channel)
            if channel not in self.channel_subscribers:
                self.channel_subscribers[channel] = set()
            self.channel_subscribers[channel].add(websocket)

    def unsubscribe_channel(self, websocket: WebSocket, channel: str):
        ctx = self.connections.get(websocket)
        if ctx and channel in ctx.channels:
            ctx.channels.remove(channel)
            if channel in self.channel_subscribers and websocket in self.channel_subscribers[channel]:
                self.channel_subscribers[channel].remove(websocket)

    def log_event_to_db(
        self,
        event_name: str,
        data: Any,
        hospital_id: Optional[int] = None,
        branch_id: Optional[int] = None,
        user_id: Optional[int] = None,
        role: Optional[str] = None,
        related_entity: Optional[str] = None,
        channel: str = "network"
    ):
        try:
            db: Session = SessionLocal()
            try:
                log_entry = EventLog(
                    event_type=event_name,
                    hospital_id=hospital_id,
                    branch_id=branch_id,
                    user_id=user_id,
                    role=role,
                    related_entity=related_entity,
                    channel=channel,
                    payload_json=json.dumps(data, default=str),
                    timestamp=datetime.datetime.utcnow()
                )
                db.add(log_entry)
                db.commit()
            finally:
                db.close()
        except Exception as e:
            logger.warning(f"Failed to record EventLog: {e}")

    def format_event_payload(
        self,
        event_name: str,
        data: Any,
        hospital_id: Optional[int] = None,
        branch_id: Optional[int] = None
    ) -> Dict[str, Any]:
        """
        Consistent event structure conforming to Section 3:
        {
          "event": "EVENT_NAME",
          "type": "EVENT_NAME", # Dual support
          "timestamp": "ISO timestamp",
          "hospital_id": hospital_id,
          "branch_id": branch_id,
          "data": { ... }
        }
        """
        now_iso = datetime.datetime.utcnow().isoformat()
        return {
            "event": event_name,
            "type": event_name,
            "timestamp": now_iso,
            "hospital_id": hospital_id,
            "branch_id": branch_id,
            "data": data
        }

    async def broadcast_event(
        self,
        event_name: str,
        data: Any,
        hospital_id: Optional[int] = None,
        branch_id: Optional[int] = None,
        channel: str = "network",
        target_roles: Optional[List[str]] = None,
        target_user_id: Optional[int] = None,
        related_entity: Optional[str] = None
    ):
        # 1. Prepare standardized payload
        payload = self.format_event_payload(event_name, data, hospital_id, branch_id)
        json_str = json.dumps(payload, default=str)

        # 2. Determine recipient WebSocket connections
        recipients: Set[WebSocket] = set()

        if target_user_id:
            user_ch = f"user:{target_user_id}"
            recipients.update(self.channel_subscribers.get(user_ch, set()))
        elif target_roles:
            for r in target_roles:
                role_ch = f"role:{r}"
                recipients.update(self.channel_subscribers.get(role_ch, set()))
        elif channel != "network" and channel in self.channel_subscribers:
            recipients.update(self.channel_subscribers[channel])
        else:
            # Broadcast to network subscribers (all connected clients)
            recipients.update(self.channel_subscribers.get("network", set()))

        # Also fallback to any socket if channel registry is empty
        if not recipients and self.connections:
            recipients.update(self.connections.keys())

        # 3. Transmit payload
        dead_connections: List[WebSocket] = []
        for ws in recipients:
            try:
                await ws.send_text(json_str)
            except Exception:
                dead_connections.append(ws)

        for ws in dead_connections:
            self.disconnect(ws)

        # 4. Asynchronously log to database for audit & activity feed
        self.log_event_to_db(
            event_name=event_name,
            data=data,
            hospital_id=hospital_id,
            branch_id=branch_id,
            user_id=target_user_id,
            role=target_roles[0] if target_roles else None,
            related_entity=related_entity,
            channel=channel
        )

    def broadcast_sync(
        self,
        event_name: str,
        data: Any,
        hospital_id: Optional[int] = None,
        branch_id: Optional[int] = None,
        channel: str = "network",
        target_roles: Optional[List[str]] = None,
        target_user_id: Optional[int] = None,
        related_entity: Optional[str] = None
    ):
        """Synchronous, thread-safe wrapper to schedule async broadcast on running loop"""
        # Always log to database
        self.log_event_to_db(
            event_name=event_name,
            data=data,
            hospital_id=hospital_id,
            branch_id=branch_id,
            user_id=target_user_id,
            role=target_roles[0] if target_roles else None,
            related_entity=related_entity,
            channel=channel
        )

        try:
            loop = None
            try:
                loop = asyncio.get_running_loop()
            except RuntimeError:
                loop = getattr(self, "_main_loop", None)

            if loop and loop.is_running():
                asyncio.run_coroutine_threadsafe(
                    self.broadcast_event(
                        event_name=event_name,
                        data=data,
                        hospital_id=hospital_id,
                        branch_id=branch_id,
                        channel=channel,
                        target_roles=target_roles,
                        target_user_id=target_user_id,
                        related_entity=related_entity
                    ),
                    loop
                )
        except Exception as e:
            logger.debug(f"Async dispatch skipped: {e}")

# Global Singleton Manager
websocket_manager = WebSocketManager()
