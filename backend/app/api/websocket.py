import json
import time
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends, Query
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import decode_token
from app.models.user import User
from app.models.project import ProjectRole
from app.models.document import DesignDocument, DocumentVersion
from app.api.deps.auth import get_user_project_role
from app.services.collaboration_service import (
    collaboration_manager,
    Collaborator,
)
from app.services.ot_service import OTOperation

router = APIRouter(tags=["实时协作"])


async def get_user_from_token(token: str, db: Session) -> User | None:
    payload = decode_token(token)
    if not payload:
        return None
    username = payload.get("sub")
    if not username:
        return None
    user = db.query(User).filter(User.username == username).first()
    return user


@router.websocket("/ws/documents/{document_id}")
async def websocket_endpoint(
    document_id: int,
    websocket: WebSocket,
    token: str = Query(...),
):
    from app.core.database import SessionLocal
    db = SessionLocal()

    try:
        user = await get_user_from_token(token, db)
        if not user:
            await websocket.close(code=4001, reason="认证失败")
            return

        document = db.query(DesignDocument).filter(DesignDocument.id == document_id).first()
        if not document:
            await websocket.close(code=4004, reason="文档不存在")
            return

        user_role = get_user_project_role(document.project_id, user.id, db)
        if not user_role:
            await websocket.close(code=4003, reason="没有访问权限")
            return

        can_edit = user_role in [ProjectRole.ADMIN, ProjectRole.EDITOR]

        await websocket.accept()

        session = await collaboration_manager.get_session(document_id)
        collaborator = Collaborator(
            user_id=user.id,
            username=user.username,
            avatar_color=user.avatar_color,
            websocket=websocket,
        )
        await session.add_collaborator(collaborator)

        current_version = db.query(DocumentVersion).filter(
            DocumentVersion.document_id == document_id,
            DocumentVersion.version_number == document.current_version,
        ).first()

        await websocket.send_text(json.dumps({
            "type": "init",
            "document_id": document_id,
            "version": session.version,
            "content": current_version.content if current_version else {},
            "collaborators": await session.get_collaborators_info(),
            "can_edit": can_edit,
        }))

        await session.broadcast({
            "type": "user_joined",
            "user": {
                "user_id": user.id,
                "username": user.username,
                "avatar_color": user.avatar_color,
            },
        }, exclude_user_id=user.id)

        try:
            while True:
                data = await websocket.receive_text()
                message = json.loads(data)
                msg_type = message.get("type")

                if msg_type == "cursor_update":
                    collaborator.cursor_position = message.get("position")
                    collaborator.selected_element = message.get("selected_element")
                    collaborator.last_seen = time.time()
                    await session.broadcast({
                        "type": "cursor_update",
                        "user_id": user.id,
                        "username": user.username,
                        "avatar_color": user.avatar_color,
                        "position": message.get("position"),
                        "selected_element": message.get("selected_element"),
                    }, exclude_user_id=user.id)

                elif msg_type == "operation":
                    if not can_edit:
                        await websocket.send_text(json.dumps({
                            "type": "error",
                            "message": "没有编辑权限",
                            "op_id": message.get("op_id"),
                        }))
                        continue

                    op_data = message.get("operation", {})
                    since_version = message.get("since_version", 0)
                    operation = OTOperation.from_dict(op_data)
                    operation.user_id = user.id
                    operation.timestamp = time.time()

                    transformed_op, new_version = await session.apply_operation(
                        operation, since_version
                    )

                    if transformed_op is None:
                        await websocket.send_text(json.dumps({
                            "type": "operation_rejected",
                            "op_id": operation.op_id,
                            "reason": "操作冲突，目标已被删除",
                        }))
                    else:
                        await websocket.send_text(json.dumps({
                            "type": "operation_ack",
                            "op_id": operation.op_id,
                            "new_version": new_version,
                        }))

                        await session.broadcast({
                            "type": "operation",
                            "operation": transformed_op.to_dict(),
                            "version": new_version,
                            "user_id": user.id,
                            "username": user.username,
                            "avatar_color": user.avatar_color,
                        }, exclude_user_id=user.id)

                elif msg_type == "ping":
                    await websocket.send_text(json.dumps({
                        "type": "pong",
                        "timestamp": time.time(),
                    }))

        except WebSocketDisconnect:
            pass
        finally:
            await session.remove_collaborator(user.id)
            await session.broadcast({
                "type": "user_left",
                "user_id": user.id,
            })
            await collaboration_manager.remove_session_if_empty(document_id)

    except Exception as e:
        print(f"WebSocket error: {e}")
    finally:
        db.close()
