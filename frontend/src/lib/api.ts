import axios from "axios";
import type {
  User,
  AuthResponse,
  Project,
  ProjectMember,
  DesignDocument,
  DocumentVersion,
  Comment,
  VersionDiff,
} from "@/types";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000/api/v1";

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      window.location.href = "/login";
    }
    return Promise.reject(error);
  }
);

export const authAPI = {
  register: (username: string, email: string, password: string, fullName?: string) =>
    api.post<AuthResponse>("/auth/register", { username, email, password, full_name: fullName }).then((r) => r.data),

  login: (username: string, password: string) =>
    api.post<AuthResponse>("/auth/login", { username, password }).then((r) => r.data),

  getMe: () => api.get<User>("/auth/me").then((r) => r.data),
};

export const projectsAPI = {
  list: () => api.get<Project[]>("/projects").then((r) => r.data),

  get: (id: number) => api.get<Project>(`/projects/${id}`).then((r) => r.data),

  create: (name: string, description?: string) =>
    api.post<Project>("/projects", { name, description }).then((r) => r.data),

  update: (id: number, data: { name?: string; description?: string }) =>
    api.put<Project>(`/projects/${id}`, data).then((r) => r.data),

  delete: (id: number) => api.delete(`/projects/${id}`).then((r) => r.data),

  listMembers: (projectId: number) =>
    api.get<ProjectMember[]>(`/projects/${projectId}/members`).then((r) => r.data),

  addMember: (projectId: number, userId: number, role: string) =>
    api.post<ProjectMember>(`/projects/${projectId}/members`, { user_id: userId, role }).then((r) => r.data),

  updateMemberRole: (projectId: number, memberId: number, role: string) =>
    api.put<ProjectMember>(`/projects/${projectId}/members/${memberId}`, { role }).then((r) => r.data),

  removeMember: (projectId: number, memberId: number) =>
    api.delete(`/projects/${projectId}/members/${memberId}`).then((r) => r.data),
};

export const documentsAPI = {
  list: (projectId: number) =>
    api.get<DesignDocument[]>(`/documents/project/${projectId}`).then((r) => r.data),

  get: (id: number) => api.get<DesignDocument>(`/documents/${id}`).then((r) => r.data),

  create: (projectId: number, name: string, description?: string) =>
    api.post<DesignDocument>(`/documents/project/${projectId}`, { name, description }).then((r) => r.data),

  update: (id: number, data: { name?: string; description?: string }) =>
    api.put<DesignDocument>(`/documents/${id}`, data).then((r) => r.data),

  delete: (id: number) => api.delete(`/documents/${id}`).then((r) => r.data),

  listVersions: (documentId: number) =>
    api.get<DocumentVersion[]>(`/documents/${documentId}/versions`).then((r) => r.data),

  getVersion: (documentId: number, versionNumber: number) =>
    api.get<DocumentVersion>(`/documents/${documentId}/versions/${versionNumber}`).then((r) => r.data),

  createVersion: (documentId: number, content: any, description?: string) =>
    api.post<DocumentVersion>(`/documents/${documentId}/versions`, { content, description }).then((r) => r.data),

  revertToVersion: (documentId: number, versionNumber: number) =>
    api.post<DocumentVersion>(`/documents/${documentId}/versions/${versionNumber}/revert`).then((r) => r.data),

  compareVersions: (documentId: number, versionA: number, versionB: number) =>
    api.get<VersionDiff>(`/documents/${documentId}/versions/diff`, {
      params: { version_a: versionA, version_b: versionB },
    }).then((r) => r.data),
};

export const commentsAPI = {
  list: (documentId: number) =>
    api.get<Comment[]>(`/comments/document/${documentId}`).then((r) => r.data),

  create: (documentId: number, content: string, parentId?: number, position?: { x: number; y: number }) =>
    api.post<Comment>(`/comments/document/${documentId}`, {
      content,
      parent_id: parentId,
      position,
    }).then((r) => r.data),

  update: (commentId: number, data: { content?: string; is_resolved?: boolean }) =>
    api.put<Comment>(`/comments/${commentId}`, data).then((r) => r.data),

  delete: (commentId: number) => api.delete(`/comments/${commentId}`).then((r) => r.data),
};

export default api;
