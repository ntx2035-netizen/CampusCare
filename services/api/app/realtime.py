import uuid
from collections import defaultdict

from fastapi import WebSocket

from app.enums import Role


class ConnectionManager:
    def __init__(self) -> None:
        self.connections: dict[uuid.UUID, set[WebSocket]] = defaultdict(set)
        self.roles: dict[uuid.UUID, Role] = {}

    async def connect(self, user_id: uuid.UUID, role: Role, websocket: WebSocket) -> None:
        await websocket.accept(subprotocol="campuscare")
        self.connections[user_id].add(websocket)
        self.roles[user_id] = role

    def disconnect(self, user_id: uuid.UUID, websocket: WebSocket) -> None:
        self.connections[user_id].discard(websocket)
        if not self.connections[user_id]:
            self.connections.pop(user_id, None)
            self.roles.pop(user_id, None)

    async def send_user(self, user_id: uuid.UUID, payload: dict) -> None:
        for socket in list(self.connections.get(user_id, set())):
            try:
                await socket.send_json(payload)
            except RuntimeError:
                self.disconnect(user_id, socket)

    async def broadcast(self, payload: dict) -> None:
        for user_id in list(self.connections):
            await self.send_user(user_id, payload)

    async def broadcast_roles(self, roles: set[Role], payload: dict) -> None:
        for user_id, role in list(self.roles.items()):
            if role in roles:
                await self.send_user(user_id, payload)


manager = ConnectionManager()
