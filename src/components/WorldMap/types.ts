// Types matching MVP_AGENT_SPEC.md Data Model

export type IssueStatus = "BACKLOG" | "TODO" | "IN_PROGRESS" | "IN_REVIEW" | "DONE" | "CANCELLED";
export type IssuePriority = "URGENT" | "HIGH" | "MEDIUM" | "LOW" | "NONE";
export type ProjectStatus = "PLANNING" | "ACTIVE" | "PAUSED" | "COMPLETED";
export type TerrainType = "grass" | "desert" | "water" | "mountain" | "lava" | "cloud";

export interface User {
  id: string;
  name: string;
  initials: string;
}

export interface Project {
  id: string;
  key: string;
  name: string;
  status: ProjectStatus;
  leadUserId?: string;
  // Map positioning
  x: number;
  y: number;
  w: number;
  h: number;
  terrain: TerrainType;
  color: string;
  shade: string;
}

export interface Issue {
  id: string;
  key: string;
  title: string;
  description?: string;
  status: IssueStatus;
  priority: IssuePriority;
  projectId: string;
  assigneeUserId?: string;
  // Position within project region
  x: number;
  y: number;
  size: "S" | "M" | "L";
}

export interface IssueDependency {
  issueId: string;
  blockedByIssueId: string;
}

export interface ProjectPath {
  from: string;
  to: string;
  pts: [number, number][];
}

// Store actions
export interface WorldMapState {
  users: User[];
  projects: Project[];
  issues: Issue[];
  dependencies: IssueDependency[];
  paths: ProjectPath[];
}

export interface WorldMapActions {
  // Projects
  createProject: (data: Omit<Project, "id">) => Project;
  updateProject: (id: string, data: Partial<Project>) => void;
  deleteProject: (id: string) => void;
  
  // Issues
  createIssue: (data: Omit<Issue, "id" | "key">) => Issue;
  updateIssue: (id: string, data: Partial<Issue>) => void;
  deleteIssue: (id: string) => void;
  
  // Dependencies
  addDependency: (issueId: string, blockedByIssueId: string) => void;
  removeDependency: (issueId: string, blockedByIssueId: string) => void;
  
  // Paths
  addPath: (from: string, to: string, pts: [number, number][]) => void;
  removePath: (from: string, to: string) => void;
}

export type WorldMapStore = WorldMapState & WorldMapActions;
