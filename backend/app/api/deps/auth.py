from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.database import get_db
from app.core.security import decode_token
from app.models.user import User
from app.models.project import Project, ProjectMember, ProjectRole

oauth2_scheme = OAuth2PasswordBearer(tokenUrl=f"{settings.API_V1_PREFIX}/auth/login")


def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
) -> User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="无法验证凭据",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = decode_token(token)
        if payload is None:
            raise credentials_exception
        username: str = payload.get("sub")
        if username is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
    user = db.query(User).filter(User.username == username).first()
    if user is None:
        raise credentials_exception
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="用户已被禁用",
        )
    return user


def get_current_active_user(
    current_user: User = Depends(get_current_user),
) -> User:
    if not current_user.is_active:
        raise HTTPException(status_code=400, detail="用户未激活")
    return current_user


def get_project_with_permission(
    project_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Project:
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="项目不存在")
    return project


def require_project_role(min_role: str = ProjectRole.VIEWER):
    def role_checker(
        project: Project = Depends(get_project_with_permission),
        current_user: User = Depends(get_current_user),
        db: Session = Depends(get_db),
    ) -> Project:
        if project.owner_id == current_user.id:
            return project

        membership = (
            db.query(ProjectMember)
            .filter(
                ProjectMember.project_id == project.id,
                ProjectMember.user_id == current_user.id,
            )
            .first()
        )

        if not membership:
            raise HTTPException(status_code=403, detail="没有项目访问权限")

        role_hierarchy = {
            ProjectRole.VIEWER: 1,
            ProjectRole.EDITOR: 2,
            ProjectRole.ADMIN: 3,
        }

        if role_hierarchy.get(membership.role, 0) < role_hierarchy.get(min_role, 0):
            raise HTTPException(status_code=403, detail="权限不足")

        return project

    return role_checker


def get_user_project_role(project_id: int, user_id: int, db: Session) -> str:
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        return None
    if project.owner_id == user_id:
        return ProjectRole.ADMIN

    membership = (
        db.query(ProjectMember)
        .filter(
            ProjectMember.project_id == project_id,
            ProjectMember.user_id == user_id,
        )
        .first()
    )
    return membership.role if membership else None
