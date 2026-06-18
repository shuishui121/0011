from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel

from app.schemas.user import UserResponse


class CommentBase(BaseModel):
    content: str


class CommentCreate(CommentBase):
    parent_id: Optional[int] = None
    position: Optional[Dict[str, Any]] = None


class CommentUpdate(BaseModel):
    content: Optional[str] = None
    is_resolved: Optional[bool] = None


class CommentResponse(BaseModel):
    id: int
    document_id: int
    author_id: int
    parent_id: Optional[int]
    content: str
    position: Optional[Dict[str, Any]]
    is_resolved: bool
    resolved_by: Optional[int]
    resolved_at: Optional[datetime]
    created_at: datetime
    updated_at: datetime
    author: UserResponse
    resolver: Optional[UserResponse] = None
    replies: List["CommentResponse"] = []

    class Config:
        from_attributes = True


CommentResponse.model_rebuild()
