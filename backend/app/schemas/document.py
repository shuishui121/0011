from datetime import datetime
from typing import Optional, List, Any, Dict
from pydantic import BaseModel, Field

from app.schemas.user import UserResponse


class DesignDocumentBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=200)
    description: Optional[str] = ""


class DesignDocumentCreate(DesignDocumentBase):
    pass


class DesignDocumentUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None


class DocumentVersionCreate(BaseModel):
    content: Dict[str, Any]
    description: Optional[str] = ""


class DocumentVersionResponse(BaseModel):
    id: int
    document_id: int
    version_number: int
    description: str
    created_by: int
    created_at: datetime
    creator: UserResponse

    class Config:
        from_attributes = True


class DocumentVersionDetailResponse(DocumentVersionResponse):
    content: Dict[str, Any]


class DesignDocumentResponse(DesignDocumentBase):
    id: int
    project_id: int
    current_version: int
    created_by: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class DesignDocumentDetailResponse(DesignDocumentResponse):
    versions: List[DocumentVersionResponse] = []
    content: Optional[Dict[str, Any]] = None


class VersionDiffResponse(BaseModel):
    version_a: int
    version_b: int
    added: List[str]
    removed: List[str]
    modified: List[str]
