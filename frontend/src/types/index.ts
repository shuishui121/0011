export interface User {
  id: number;
  username: string;
  email: string;
  full_name: string;
  avatar_color: string;
  is_active: boolean;
  created_at: string;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  user: User;
}

export type ProjectRole = "admin" | "editor" | "viewer";

export interface ProjectMember {
  id: number;
  user_id: number;
  role: ProjectRole;
  joined_at: string;
  user: User;
}

export interface Project {
  id: number;
  name: string;
  description: string;
  owner_id: number;
  created_at: string;
  updated_at: string;
  members: ProjectMember[];
}

export interface DesignDocument {
  id: number;
  project_id: number;
  name: string;
  description: string;
  current_version: number;
  created_by: number;
  created_at: string;
  updated_at: string;
  versions?: DocumentVersion[];
}

export interface DocumentVersion {
  id: number;
  document_id: number;
  version_number: number;
  description: string;
  created_by: number;
  created_at: string;
  creator: User;
  content?: DocumentContent;
}

export interface DocumentContent {
  elements: CanvasElement[];
  connections: Connection[];
  annotations: Annotation[];
  settings: CanvasSettings;
}

export interface CanvasElement {
  id: string;
  type: ElementType;
  x: number;
  y: number;
  width: number;
  height: number;
  label?: string;
  color?: string;
  properties?: Record<string, any>;
}

export type ElementType =
  | "gear"
  | "lever"
  | "pulley"
  | "spring"
  | "piston"
  | "wheel"
  | "box"
  | "arrow"
  | "bearing"
  | "cam";

export interface Connection {
  id: string;
  from: string;
  to: string;
  fromPort?: string;
  toPort?: string;
  type: "solid" | "dashed" | "dotted";
  label?: string;
  color?: string;
}

export interface Annotation {
  id: string;
  x: number;
  y: number;
  text: string;
  type: "note" | "dimension" | "comment";
  targetId?: string;
}

export interface CanvasSettings {
  gridSize: number;
  showGrid: boolean;
}

export interface Comment {
  id: number;
  document_id: number;
  author_id: number;
  parent_id: number | null;
  content: string;
  position: { x: number; y: number } | null;
  is_resolved: boolean;
  resolved_by: number | null;
  resolved_at: string | null;
  created_at: string;
  updated_at: string;
  author: User;
  resolver: User | null;
  replies: Comment[];
}

export interface Collaborator {
  user_id: number;
  username: string;
  avatar_color: string;
  cursor_position?: { x: number; y: number };
  selected_element?: string | null;
}

export interface OTOperationData {
  op_id: string;
  op_type: "add" | "delete" | "update";
  target_type: "element" | "connection" | "annotation";
  target_id: string;
  data: Record<string, any>;
  user_id?: number;
  timestamp?: number;
}

export interface VersionDiff {
  version_a: number;
  version_b: number;
  added: string[];
  removed: string[];
  modified: string[];
}
