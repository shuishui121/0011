from typing import List
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status, Path
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.user import User
from app.models.project import ProjectRole
from app.models.comment import Comment
from app.models.document import DesignDocument
from app.schemas.comment import CommentCreate, CommentUpdate, CommentResponse
from app.api.deps.auth import get_current_active_user, get_user_project_role

router = APIRouter(prefix="/comments", tags=["评论"])


def get_document_for_comments(
    document_id: int,
    current_user: User,
    db: Session,
    min_role: str = ProjectRole.VIEWER,
) -> DesignDocument:
    document = db.query(DesignDocument).filter(DesignDocument.id == document_id).first()
    if not document:
        raise HTTPException(status_code=404, detail="文档不存在")

    user_role = get_user_project_role(document.project_id, current_user.id, db)
    if not user_role:
        raise HTTPException(status_code=403, detail="没有访问权限")

    role_hierarchy = {
        ProjectRole.VIEWER: 1,
        ProjectRole.EDITOR: 2,
        ProjectRole.ADMIN: 3,
    }
    if role_hierarchy.get(user_role, 0) < role_hierarchy.get(min_role, 0):
        raise HTTPException(status_code=403, detail="权限不足")

    return document


@router.get("/document/{document_id}", response_model=List[CommentResponse])
def list_comments(
    document_id: int = Path(...),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    get_document_for_comments(document_id, current_user, db)

    comments = (
        db.query(Comment)
        .filter(
            Comment.document_id == document_id,
            Comment.parent_id.is_(None),
        )
        .order_by(Comment.created_at.desc())
        .all()
    )
    return comments


@router.post(
    "/document/{document_id}",
    response_model=CommentResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_comment(
    comment_data: CommentCreate,
    document_id: int = Path(...),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    get_document_for_comments(document_id, current_user, db, ProjectRole.EDITOR)

    if comment_data.parent_id:
        parent = db.query(Comment).filter(Comment.id == comment_data.parent_id).first()
        if not parent or parent.document_id != document_id:
            raise HTTPException(status_code=404, detail="父评论不存在")

    comment = Comment(
        document_id=document_id,
        author_id=current_user.id,
        parent_id=comment_data.parent_id,
        content=comment_data.content,
        position=comment_data.position,
    )
    db.add(comment)
    db.commit()
    db.refresh(comment)
    return comment


@router.put("/{comment_id}", response_model=CommentResponse)
def update_comment(
    comment_id: int,
    comment_data: CommentUpdate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    comment = db.query(Comment).filter(Comment.id == comment_id).first()
    if not comment:
        raise HTTPException(status_code=404, detail="评论不存在")

    document = db.query(DesignDocument).filter(DesignDocument.id == comment.document_id).first()
    user_role = get_user_project_role(document.project_id, current_user.id, db)
    role_hierarchy = {
        ProjectRole.VIEWER: 1,
        ProjectRole.EDITOR: 2,
        ProjectRole.ADMIN: 3,
    }
    if not user_role or role_hierarchy.get(user_role, 0) < role_hierarchy[ProjectRole.EDITOR]:
        raise HTTPException(status_code=403, detail="权限不足")

    if comment_data.content is not None:
        if comment.author_id != current_user.id:
            raise HTTPException(status_code=403, detail="只能修改自己的评论")
        comment.content = comment_data.content

    if comment_data.is_resolved is not None:
        if comment_data.is_resolved:
            comment.is_resolved = True
            comment.resolved_by = current_user.id
            comment.resolved_at = datetime.utcnow()
        else:
            comment.is_resolved = False
            comment.resolved_by = None
            comment.resolved_at = None

    db.commit()
    db.refresh(comment)
    return comment


@router.delete("/{comment_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_comment(
    comment_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    comment = db.query(Comment).filter(Comment.id == comment_id).first()
    if not comment:
        raise HTTPException(status_code=404, detail="评论不存在")

    document = db.query(DesignDocument).filter(DesignDocument.id == comment.document_id).first()
    user_role = get_user_project_role(document.project_id, current_user.id, db)
    role_hierarchy = {
        ProjectRole.VIEWER: 1,
        ProjectRole.EDITOR: 2,
        ProjectRole.ADMIN: 3,
    }

    is_admin = user_role and role_hierarchy.get(user_role, 0) >= role_hierarchy[ProjectRole.ADMIN]
    is_author = comment.author_id == current_user.id

    if not is_admin and not is_author:
        raise HTTPException(status_code=403, detail="权限不足")

    db.delete(comment)
    db.commit()
    return None
