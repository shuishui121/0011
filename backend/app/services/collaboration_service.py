import json
import asyncio
import time
from typing import Dict, List, Set, Optional
from fastapi import WebSocket, WebSocketDisconnect

from app.services.ot_service import OTOperation, OTAlgorithm
from app.core.redis_client import get_redis


class Collaborator:
    def __init__(self, user_id: int, username: str, avatar_color: str, websocket: WebSocket):
        self.user_id = user_id
        self.username = username
        self.avatar_color = avatar_color
        self.websocket = websocket
        self.cursor_position = None
        self.selected_element = None
        self.last_seen = time.time()


class DocumentSession:
    def __init__(self, document_id: int):
        self.document_id = document_id
        self.collaborators: Dict[int, Collaborator] = {}
        self.operation_history: List[OTOperation] = []
        self.version = 0
        self._lock = asyncio.Lock()

    async def add_collaborator(self, collaborator: Collaborator) -> bool:
        async with self._lock:
            self.collaborators[collaborator.user_id] = collaborator
            return True

    async def remove_collaborator(self, user_id: int):
        async with self._lock:
            self.collaborators.pop(user_id, None)

    async def broadcast(self, message: dict, exclude_user_id: Optional[int] = None):
        message_str = json.dumps(message)
        for user_id, collab in list(self.collaborators.items()):
            if exclude_user_id and user_id == exclude_user_id:
                continue
            try:
                await collab.websocket.send_text(message_str)
            except Exception:
                pass

    async def get_collaborators_info(self) -> List[dict]:
        return [
            {
                "user_id": c.user_id,
                "username": c.username,
                "avatar_color": c.avatar_color,
                "cursor_position": c.cursor_position,
                "selected_element": c.selected_element,
            }
            for c in self.collaborators.values()
        ]

    async def apply_operation(
        self,
        operation: OTOperation,
        since_version: int,
    ) -> tuple:
        async with self._lock:
            pending_ops = self.operation_history[since_version:]
            transformed_op = OTAlgorithm.transform_operations(pending_ops, operation)

            if transformed_op is None:
                return None, self.version

            self.operation_history.append(transformed_op)
            self.version += 1

            return transformed_op, self.version


class CollaborationManager:
    def __init__(self):
        self.sessions: Dict[int, DocumentSession] = {}
        self._sessions_lock = asyncio.Lock()

    async def get_session(self, document_id: int) -> DocumentSession:
        async with self._sessions_lock:
            if document_id not in self.sessions:
                self.sessions[document_id] = DocumentSession(document_id)
            return self.sessions[document_id]

    async def remove_session_if_empty(self, document_id: int):
        async with self._sessions_lock:
            session = self.sessions.get(document_id)
            if session and len(session.collaborators) == 0:
                del self.sessions[document_id]


collaboration_manager = CollaborationManager()
