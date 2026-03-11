import { create } from "zustand";
import { persist } from "zustand/middleware";
import type {
  User,
  Project,
  Issue,
  IssueDependency,
  ProjectPath,
  WorldMapStore,
} from "./types";

// Generate unique IDs
const generateId = () => Math.random().toString(36).substring(2, 15);

// Generate issue key based on project
const generateIssueKey = (projectKey: string, issues: Issue[]) => {
  const projectIssues = issues.filter((i) =>
    i.key.startsWith(projectKey + "-")
  );
  const maxNum = projectIssues.reduce((max, issue) => {
    const num = parseInt(issue.key.split("-")[1] || "0");
    return num > max ? num : max;
  }, 0);
  return `${projectKey}-${maxNum + 1}`;
};

interface ExtendedWorldMapStore extends WorldMapStore {
  // Loading state
  isLoading: boolean;
  error: string | null;
  lastFetched: number | null;
  
  // Fetch from API
  fetchData: () => Promise<void>;
  
  // Set all data at once
  setData: (data: {
    users: User[];
    projects: Project[];
    issues: Issue[];
    dependencies: IssueDependency[];
    paths: ProjectPath[];
  }) => void;
}

export const useWorldMapStore = create<ExtendedWorldMapStore>()(
  persist(
    (set, get) => ({
      // Initial state
      users: [],
      projects: [],
      issues: [],
      dependencies: [],
      paths: [],
      isLoading: false,
      error: null,
      lastFetched: null,

      // Fetch data from API
      fetchData: async () => {
        set({ isLoading: true, error: null });
        try {
          const response = await fetch("/api/world-map");
          if (!response.ok) {
            throw new Error(`Failed to fetch: ${response.statusText}`);
          }
          const json = await response.json();
          // API returns { data: { ... } } so unwrap it
          const data = json.data || json;
          set({
            users: data.users || [],
            projects: data.projects || [],
            issues: data.issues || [],
            dependencies: data.dependencies || [],
            paths: data.projectPaths || [],
            isLoading: false,
            lastFetched: Date.now(),
          });
        } catch (error) {
          set({
            isLoading: false,
            error: error instanceof Error ? error.message : "Unknown error",
          });
        }
      },

      // Set all data at once
      setData: (data) => {
        set({
          users: data.users,
          projects: data.projects,
          issues: data.issues,
          dependencies: data.dependencies,
          paths: data.paths,
          lastFetched: Date.now(),
        });
      },

      // Project CRUD
      createProject: (data) => {
        const newProject: Project = {
          ...data,
          id: generateId(),
        };
        
        // Optimistic update
        set((state) => ({
          projects: [...state.projects, newProject],
        }));
        
        // TODO: POST to /api/world-map/projects
        // For now, just return the new project
        return newProject;
      },

      updateProject: (id, data) => {
        set((state) => ({
          projects: state.projects.map((p) =>
            p.id === id ? { ...p, ...data } : p
          ),
        }));
        
        // TODO: PATCH to /api/world-map/projects/:id
      },

      deleteProject: (id) => {
        set((state) => ({
          projects: state.projects.filter((p) => p.id !== id),
          issues: state.issues.filter((i) => i.projectId !== id),
          paths: state.paths.filter((p) => p.from !== id && p.to !== id),
        }));
        
        // TODO: DELETE to /api/world-map/projects/:id
      },

      // Issue CRUD
      createIssue: (data) => {
        const state = get();
        const project = state.projects.find((p) => p.id === data.projectId);
        const projectKey = project?.key || "ISSUE";
        
        const newIssue: Issue = {
          ...data,
          id: generateId(),
          key: generateIssueKey(projectKey, state.issues),
        };
        
        set((state) => ({
          issues: [...state.issues, newIssue],
        }));
        
        // TODO: POST to /api/world-map/issues
        return newIssue;
      },

      updateIssue: (id, data) => {
        set((state) => ({
          issues: state.issues.map((i) =>
            i.id === id ? { ...i, ...data } : i
          ),
        }));
        
        // TODO: PATCH to /api/world-map/issues/:id
      },

      deleteIssue: (id) => {
        set((state) => ({
          issues: state.issues.filter((i) => i.id !== id),
          dependencies: state.dependencies.filter(
            (d) => d.issueId !== id && d.blockedByIssueId !== id
          ),
        }));
        
        // TODO: DELETE to /api/world-map/issues/:id
      },

      // Dependency management
      addDependency: (issueId, blockedByIssueId) => {
        set((state) => {
          // Check if dependency already exists
          const exists = state.dependencies.some(
            (d) => d.issueId === issueId && d.blockedByIssueId === blockedByIssueId
          );
          if (exists) return state;
          
          return {
            dependencies: [
              ...state.dependencies,
              { issueId, blockedByIssueId },
            ],
          };
        });
        
        // TODO: POST to /api/world-map/dependencies
      },

      removeDependency: (issueId, blockedByIssueId) => {
        set((state) => ({
          dependencies: state.dependencies.filter(
            (d) =>
              !(d.issueId === issueId && d.blockedByIssueId === blockedByIssueId)
          ),
        }));
        
        // TODO: DELETE to /api/world-map/dependencies
      },

      // Path management
      addPath: (from, to, pts) => {
        set((state) => {
          // Check if path already exists
          const exists = state.paths.some(
            (p) => p.from === from && p.to === to
          );
          if (exists) return state;
          
          return {
            paths: [...state.paths, { from, to, pts }],
          };
        });
      },

      removePath: (from, to) => {
        set((state) => ({
          paths: state.paths.filter(
            (p) => !(p.from === from && p.to === to)
          ),
        }));
      },
    }),
    {
      name: "world-map-storage",
      // Only persist certain fields
      partialize: (state) => ({
        users: state.users,
        projects: state.projects,
        issues: state.issues,
        dependencies: state.dependencies,
        paths: state.paths,
        lastFetched: state.lastFetched,
      }),
    }
  )
);
