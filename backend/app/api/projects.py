from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.user import User
from app.models.project import Project, ProjectMember, ProjectRole
from app.schemas.project import (
    ProjectCreate,
    ProjectUpdate,
    ProjectResponse,
    ProjectMemberCreate,
    ProjectMemberUpdate,
    ProjectMemberResponse,
)
from app.api.deps.auth import (
    get_current_active_user,
    get_project_with_permission,
    require_project_role,
)

router = APIRouter(prefix="/projects", tags=["项目管理"])


@router.get("", response_model=List[ProjectResponse])
def list_projects(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    owned_projects = db.query(Project).filter(Project.owner_id == current_user.id).all()
    member_projects = (
        db.query(Project)
        .join(ProjectMember)
        .filter(ProjectMember.user_id == current_user.id)
        .all()
    )
    all_projects = list({p.id: p for p in owned_projects + member_projects}.values())
    return all_projects


@router.post("", response_model=ProjectResponse, status_code=status.HTTP_201_CREATED)
def create_project(
    project_data: ProjectCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    project = Project(
        name=project_data.name,
        description=project_data.description,
        owner_id=current_user.id,
    )
    db.add(project)
    db.flush()

    admin_member = ProjectMember(
        project_id=project.id,
        user_id=current_user.id,
        role=ProjectRole.ADMIN,
    )
    db.add(admin_member)
    db.commit()
    db.refresh(project)
    return project


@router.get("/{project_id}", response_model=ProjectResponse)
def get_project(
    project: Project = Depends(get_project_with_permission),
):
    return project


@router.put("/{project_id}", response_model=ProjectResponse)
def update_project(
    project_data: ProjectUpdate,
    project: Project = Depends(require_project_role(ProjectRole.ADMIN)),
    db: Session = Depends(get_db),
):
    if project_data.name is not None:
        project.name = project_data.name
    if project_data.description is not None:
        project.description = project_data.description
    db.commit()
    db.refresh(project)
    return project


@router.delete("/{project_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_project(
    project: Project = Depends(require_project_role(ProjectRole.ADMIN)),
    db: Session = Depends(get_db),
):
    db.delete(project)
    db.commit()
    return None


@router.get("/{project_id}/members", response_model=List[ProjectMemberResponse])
def list_members(
    project: Project = Depends(require_project_role(ProjectRole.VIEWER)),
    db: Session = Depends(get_db),
):
    members = (
        db.query(ProjectMember)
        .filter(ProjectMember.project_id == project.id)
        .all()
    )
    return members


@router.post("/{project_id}/members", response_model=ProjectMemberResponse, status_code=status.HTTP_201_CREATED)
def add_member(
    member_data: ProjectMemberCreate,
    project: Project = Depends(require_project_role(ProjectRole.ADMIN)),
    db: Session = Depends(get_db),
):
    existing = (
        db.query(ProjectMember)
        .filter(
            ProjectMember.project_id == project.id,
            ProjectMember.user_id == member_data.user_id,
        )
        .first()
    )
    if existing:
        raise HTTPException(status_code=400, detail="该用户已是项目成员")

    user = db.query(User).filter(User.id == member_data.user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="用户不存在")

    if member_data.role not in [ProjectRole.ADMIN, ProjectRole.EDITOR, ProjectRole.VIEWER]:
        raise HTTPException(status_code=400, detail="无效的角色")

    member = ProjectMember(
        project_id=project.id,
        user_id=member_data.user_id,
        role=member_data.role,
    )
    db.add(member)
    db.commit()
    db.refresh(member)
    return member


@router.put("/{project_id}/members/{member_id}", response_model=ProjectMemberResponse)
def update_member_role(
    member_id: int,
    member_data: ProjectMemberUpdate,
    project: Project = Depends(require_project_role(ProjectRole.ADMIN)),
    db: Session = Depends(get_db),
):
    member = (
        db.query(ProjectMember)
        .filter(
            ProjectMember.id == member_id,
            ProjectMember.project_id == project.id,
        )
        .first()
    )
    if not member:
        raise HTTPException(status_code=404, detail="成员不存在")

    if member.user_id == project.owner_id:
        raise HTTPException(status_code=400, detail="不能修改项目所有者的角色")

    if member_data.role not in [ProjectRole.ADMIN, ProjectRole.EDITOR, ProjectRole.VIEWER]:
        raise HTTPException(status_code=400, detail="无效的角色")

    member.role = member_data.role
    db.commit()
    db.refresh(member)
    return member


@router.delete("/{project_id}/members/{member_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_member(
    member_id: int,
    project: Project = Depends(require_project_role(ProjectRole.ADMIN)),
    db: Session = Depends(get_db),
):
    member = (
        db.query(ProjectMember)
        .filter(
            ProjectMember.id == member_id,
            ProjectMember.project_id == project.id,
        )
        .first()
    )
    if not member:
        raise HTTPException(status_code=404, detail="成员不存在")

    if member.user_id == project.owner_id:
        raise HTTPException(status_code=400, detail="不能移除项目所有者")

    db.delete(member)
    db.commit()
    return None
