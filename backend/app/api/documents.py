from typing import List, Dict, Any, Set
from fastapi import APIRouter, Depends, HTTPException, status, Path
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.user import User
from app.models.project import Project, ProjectRole
from app.models.document import DesignDocument, DocumentVersion
from app.schemas.document import (
    DesignDocumentCreate,
    DesignDocumentUpdate,
    DesignDocumentResponse,
    DesignDocumentDetailResponse,
    DocumentVersionCreate,
    DocumentVersionResponse,
    DocumentVersionDetailResponse,
    VersionDiffResponse,
)
from app.api.deps.auth import (
    get_current_active_user,
    require_project_role,
    get_user_project_role,
)

router = APIRouter(prefix="/documents", tags=["设计文档"])


def get_document_with_permission(
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


def _get_project_with_permission(
    project_id: int,
    current_user: User,
    db: Session,
    min_role: str = ProjectRole.VIEWER,
) -> Project:
    from app.api.deps.auth import get_user_project_role
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="项目不存在")

    user_role = get_user_project_role(project_id, current_user.id, db)
    if not user_role:
        raise HTTPException(status_code=403, detail="没有项目访问权限")

    role_hierarchy = {
        ProjectRole.VIEWER: 1,
        ProjectRole.EDITOR: 2,
        ProjectRole.ADMIN: 3,
    }
    if role_hierarchy.get(user_role, 0) < role_hierarchy.get(min_role, 0):
        raise HTTPException(status_code=403, detail="权限不足")
    return project


@router.get("/project/{project_id}", response_model=List[DesignDocumentResponse])
def list_documents(
    project_id: int = Path(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    project = _get_project_with_permission(project_id, current_user, db, ProjectRole.VIEWER)
    documents = (
        db.query(DesignDocument)
        .filter(DesignDocument.project_id == project.id)
        .order_by(DesignDocument.updated_at.desc())
        .all()
    )
    return documents


@router.post(
    "/project/{project_id}",
    response_model=DesignDocumentResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_document(
    doc_data: DesignDocumentCreate,
    project_id: int = Path(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    project = _get_project_with_permission(project_id, current_user, db, ProjectRole.EDITOR)
    document = DesignDocument(
        project_id=project.id,
        name=doc_data.name,
        description=doc_data.description,
        created_by=current_user.id,
    )
    db.add(document)
    db.flush()

    initial_content = {
        "elements": [],
        "connections": [],
        "annotations": [],
        "settings": {
            "gridSize": 20,
            "showGrid": True,
        },
    }
    version = DocumentVersion(
        document_id=document.id,
        version_number=1,
        content=initial_content,
        description="初始版本",
        created_by=current_user.id,
    )
    db.add(version)
    db.commit()
    db.refresh(document)
    return document


@router.get("/{document_id}", response_model=DesignDocumentDetailResponse)
def get_document(
    document_id: int = Path(...),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    document = get_document_with_permission(document_id, current_user, db)
    return document


@router.put("/{document_id}", response_model=DesignDocumentResponse)
def update_document(
    doc_data: DesignDocumentUpdate,
    document_id: int = Path(...),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    document = get_document_with_permission(document_id, current_user, db, ProjectRole.EDITOR)

    if doc_data.name is not None:
        document.name = doc_data.name
    if doc_data.description is not None:
        document.description = doc_data.description

    db.commit()
    db.refresh(document)
    return document


@router.delete("/{document_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_document(
    document_id: int = Path(...),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    document = get_document_with_permission(document_id, current_user, db, ProjectRole.ADMIN)
    db.delete(document)
    db.commit()
    return None


@router.get("/{document_id}/versions", response_model=List[DocumentVersionResponse])
def list_versions(
    document_id: int = Path(...),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    document = get_document_with_permission(document_id, current_user, db)
    return document.versions


@router.get("/{document_id}/versions/{version_number}", response_model=DocumentVersionDetailResponse)
def get_version(
    document_id: int,
    version_number: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    document = get_document_with_permission(document_id, current_user, db)
    version = (
        db.query(DocumentVersion)
        .filter(
            DocumentVersion.document_id == document.id,
            DocumentVersion.version_number == version_number,
        )
        .first()
    )
    if not version:
        raise HTTPException(status_code=404, detail="版本不存在")
    return version


@router.post(
    "/{document_id}/versions",
    response_model=DocumentVersionResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_version(
    version_data: DocumentVersionCreate,
    document_id: int = Path(...),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    document = get_document_with_permission(document_id, current_user, db, ProjectRole.EDITOR)

    new_version_num = document.current_version + 1
    version = DocumentVersion(
        document_id=document.id,
        version_number=new_version_num,
        content=version_data.content,
        description=version_data.description,
        created_by=current_user.id,
    )
    db.add(version)
    document.current_version = new_version_num
    db.commit()
    db.refresh(version)
    return version


@router.post("/{document_id}/versions/{version_number}/revert", response_model=DocumentVersionResponse)
def revert_to_version(
    document_id: int,
    version_number: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    document = get_document_with_permission(document_id, current_user, db, ProjectRole.EDITOR)

    target_version = (
        db.query(DocumentVersion)
        .filter(
            DocumentVersion.document_id == document.id,
            DocumentVersion.version_number == version_number,
        )
        .first()
    )
    if not target_version:
        raise HTTPException(status_code=404, detail="目标版本不存在")

    new_version_num = document.current_version + 1
    new_version = DocumentVersion(
        document_id=document.id,
        version_number=new_version_num,
        content=target_version.content,
        description=f"回退到版本 {version_number}",
        created_by=current_user.id,
    )
    db.add(new_version)
    document.current_version = new_version_num
    db.commit()
    db.refresh(new_version)
    return new_version


@router.get("/{document_id}/versions/diff", response_model=VersionDiffResponse)
def compare_versions(
    document_id: int,
    version_a: int,
    version_b: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    document = get_document_with_permission(document_id, current_user, db)

    v_a = (
        db.query(DocumentVersion)
        .filter(
            DocumentVersion.document_id == document.id,
            DocumentVersion.version_number == version_a,
        )
        .first()
    )
    v_b = (
        db.query(DocumentVersion)
        .filter(
            DocumentVersion.document_id == document.id,
            DocumentVersion.version_number == version_b,
        )
        .first()
    )

    if not v_a or not v_b:
        raise HTTPException(status_code=404, detail="版本不存在")

    content_a = v_a.content
    content_b = v_b.content

    def get_element_ids(content: Dict[str, Any]) -> Set[str]:
        return {elem.get("id") for elem in content.get("elements", [])}

    ids_a = get_element_ids(content_a)
    ids_b = get_element_ids(content_b)

    added = list(ids_b - ids_a)
    removed = list(ids_a - ids_b)

    common = ids_a & ids_b
    modified = []
    elem_map_a = {elem["id"]: elem for elem in content_a.get("elements", [])}
    elem_map_b = {elem["id"]: elem for elem in content_b.get("elements", [])}

    for elem_id in common:
        if elem_map_a[elem_id] != elem_map_b[elem_id]:
            modified.append(elem_id)

    return VersionDiffResponse(
        version_a=version_a,
        version_b=version_b,
        added=added,
        removed=removed,
        modified=modified,
    )
