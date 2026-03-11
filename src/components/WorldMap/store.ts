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

// Generate unique IDs (used for optimistic updates, will be replaced by server ID)
const generateTempId = () => `temp-${Math.random().toString(36).substring(2, 15)}`;

// Generate issue key based on project (temporary, server will generate the real one)
const generateTempIssueKey = (projectKey: string, issues: Issue[]) => {
  const projectIssues = issues.filter((i) =>
    i.key.startsWith(projectKey + "-")
  );
  const maxNum = projectIssues.reduce((max, issue) => {
    const num = parseInt(issue.key.split("-")[1] || "0");
    return num > max ? num : max;
  }, 0);
  return `${projectKey}-${maxNum + 1}`;
};

// Map WorldMap status to DB status
const mapProjectStatusToDb = (status: Project["status"]): string => {
  switch (status) {
    case "PLANNING": return "PLANNED";
    case "ACTIVE": return "ACTIVE";
    case "PAUSED": return "ARCHIVED";
    case "COMPLETED": return "COMPLETED";
    default: return "PLANNED";
  }
};

// Map WorldMap issue status to DB status
const mapIssueStatusToDb = (status: Issue["status"]): string => {
  switch (status) {
    case "BACKLOG": return "BACKLOG";
    case "TODO": return "TODO";
    case "IN_PROGRESS": return "IN_PROGRESS";
    case "IN_REVIEW": return "IN_PROGRESS"; // DB doesn't have IN_REVIEW
    case "DONE": return "DONE";
    case "CANCELLED": return "CANCELED";
    default: return "BACKLOG";
  }
};

// Map WorldMap priority to DB priority
const mapPriorityToDb = (priority: Issue["priority"]): string => {
  switch (priority) {
    case "URGENT": return "URGENT";
    case "HIGH": return "HIGH";
    case "MEDIUM": return "MEDIUM";
    case "LOW": return "LOW";
    case "NONE": return "LOW";
    default: return "MEDIUM";
  }
};

interface Team {
  id: string;
  key: string;
  name: string;
}

interface ExtendedWorldMapStore extends WorldMapStore {
  // Loading state
  isLoading: boolean;
  error: string | null;
  lastFetched: number | null;
  
  // Teams for issue creation
  teams: Team[];
  defaultTeamId: string | null;
  
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
      teams: [],
      defaultTeamId: null,
      isLoading: false,
      error: null,
      lastFetched: null,

      // Fetch data from API
      fetchData: async () => {
        set({ isLoading: true, error: null });
        try {
          // Fetch world map data and teams in parallel
          const [worldMapResponse, teamsResponse] = await Promise.all([
            fetch("/api/world-map"),
            fetch("/api/teams"),
          ]);
          
          if (!worldMapResponse.ok) {
            throw new Error(`Failed to fetch world map: ${worldMapResponse.statusText}`);
          }
          
          const json = await worldMapResponse.json();
          // API returns { data: { ... } } so unwrap it
          const data = json.data || json;
          
          // Parse teams if available
          let teams: Team[] = [];
          let defaultTeamId: string | null = null;
          if (teamsResponse.ok) {
            const teamsJson = await teamsResponse.json();
            teams = teamsJson.data || [];
            // Use first team as default
            if (teams.length > 0) {
              defaultTeamId = teams[0].id;
            }
          }
          
          set({
            users: data.users || [],
            projects: data.projects || [],
            issues: data.issues || [],
            dependencies: data.dependencies || [],
            paths: data.projectPaths || [],
            teams,
            defaultTeamId,
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
        const state = get();
        
        // Generate a unique key by appending numbers if needed
        let uniqueKey = data.key;
        const existingKeys = new Set(state.projects.map((p) => p.key.toUpperCase()));
        if (existingKeys.has(uniqueKey.toUpperCase())) {
          let counter = 2;
          while (existingKeys.has(`${data.key}${counter}`.toUpperCase())) {
            counter++;
          }
          uniqueKey = `${data.key}${counter}`;
        }
        
        const tempId = generateTempId();
        const newProject: Project = {
          ...data,
          id: tempId,
          key: uniqueKey,
        };
        
        // Optimistic update
        set((state) => ({
          projects: [...state.projects, newProject],
        }));
        
        // POST to /api/projects
        (async () => {
          try {
            const response = await fetch("/api/projects", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                key: uniqueKey,
                name: data.name,
                status: mapProjectStatusToDb(data.status),
                leadUserId: data.leadUserId || null,
              }),
            });
            
            if (!response.ok) {
              const errorData = await response.json().catch(() => ({}));
              // If it's still a duplicate (race condition or DB has more), retry with timestamp
              if (response.status === 409) {
                const timestamp = Date.now().toString(36).slice(-4).toUpperCase();
                const retryKey = `${data.key}${timestamp}`;
                const retryResponse = await fetch("/api/projects", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    key: retryKey,
                    name: data.name,
                    status: mapProjectStatusToDb(data.status),
                    leadUserId: data.leadUserId || null,
                  }),
                });
                if (retryResponse.ok) {
                  const retryResult = await retryResponse.json();
                  const serverProject = retryResult.data;
                  set((state) => ({
                    projects: state.projects.map((p) =>
                      p.id === tempId
                        ? { ...newProject, id: serverProject.id, key: serverProject.key }
                        : p
                    ),
                    issues: state.issues.map((i) =>
                      i.projectId === tempId
                        ? { ...i, projectId: serverProject.id }
                        : i
                    ),
                  }));
                  return;
                }
              }
              throw new Error(errorData.error || `Failed to create project: ${response.statusText}`);
            }
            
            const result = await response.json();
            const serverProject = result.data;
            
            // Replace temp project with server project
            set((state) => ({
              projects: state.projects.map((p) =>
                p.id === tempId
                  ? { ...newProject, id: serverProject.id }
                  : p
              ),
              // Also update any issues that might reference the temp ID
              issues: state.issues.map((i) =>
                i.projectId === tempId
                  ? { ...i, projectId: serverProject.id }
                  : i
              ),
            }));
          } catch (error) {
            console.error("Failed to create project:", error);
            // Rollback optimistic update
            set((state) => ({
              projects: state.projects.filter((p) => p.id !== tempId),
            }));
            // Show error to user
            const message = error instanceof Error ? error.message : "Failed to create project";
            alert(`Error: ${message}`);
            // Re-fetch to ensure consistency
            get().fetchData();
          }
        })();
        
        return newProject;
      },

      // Local-only update (no API call) - used for dragging
      updateProjectLocal: (id, data) => {
        set((state) => ({
          projects: state.projects.map((p) =>
            p.id === id ? { ...p, ...data } : p
          ),
        }));
      },

      updateProject: (id, data) => {
        // Optimistic update
        set((state) => ({
          projects: state.projects.map((p) =>
            p.id === id ? { ...p, ...data } : p
          ),
        }));
        
        // Skip API call for temp IDs (they're still being created)
        if (id.startsWith("temp-")) return;
        
        // PATCH to /api/projects/:id
        (async () => {
          try {
            const updateData: Record<string, unknown> = {};
            if (data.name !== undefined) updateData.name = data.name;
            if (data.status !== undefined) updateData.status = mapProjectStatusToDb(data.status);
            if (data.leadUserId !== undefined) updateData.leadUserId = data.leadUserId || null;
            
            const response = await fetch(`/api/projects/${id}`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(updateData),
            });
            
            if (!response.ok) {
              throw new Error(`Failed to update project: ${response.statusText}`);
            }
          } catch (error) {
            console.error("Failed to update project:", error);
            // Re-fetch to restore correct state
            get().fetchData();
          }
        })();
      },

      deleteProject: (id) => {
        // Optimistic update
        set((state) => ({
          projects: state.projects.filter((p) => p.id !== id),
          issues: state.issues.filter((i) => i.projectId !== id),
          paths: state.paths.filter((p) => p.from !== id && p.to !== id),
        }));
        
        // Skip API call for temp IDs
        if (id.startsWith("temp-")) return;
        
        // DELETE /api/projects/:id
        (async () => {
          try {
            const response = await fetch(`/api/projects/${id}`, {
              method: "DELETE",
            });
            
            if (!response.ok) {
              throw new Error(`Failed to delete project: ${response.statusText}`);
            }
          } catch (error) {
            console.error("Failed to delete project:", error);
            // Re-fetch to restore correct state
            get().fetchData();
          }
        })();
      },

      // Issue CRUD
      createIssue: (data) => {
        const state = get();
        const project = state.projects.find((p) => p.id === data.projectId);
        const projectKey = project?.key || "ISSUE";
        
        const tempId = generateTempId();
        const tempKey = generateTempIssueKey(projectKey, state.issues);
        
        const newIssue: Issue = {
          ...data,
          id: tempId,
          key: tempKey,
        };
        
        // Optimistic update
        set((state) => ({
          issues: [...state.issues, newIssue],
        }));
        
        // POST to /api/issues
        (async () => {
          try {
            // Get teamId - use defaultTeamId or find from project
            let teamId = state.defaultTeamId;
            if (!teamId) {
              // Try to fetch teams if we don't have one
              const teamsResponse = await fetch("/api/teams");
              if (teamsResponse.ok) {
                const teamsData = await teamsResponse.json();
                const teams = teamsData.data || [];
                if (teams.length > 0) {
                  teamId = teams[0].id;
                  set({ teams, defaultTeamId: teamId });
                }
              }
            }
            
            if (!teamId) {
              throw new Error("No team available. Please create a team first.");
            }
            
            // Get the real projectId (in case it was a temp ID that got replaced)
            const currentState = get();
            let realProjectId = data.projectId;
            const currentProject = currentState.projects.find(
              (p) => p.id === data.projectId || p.key === project?.key
            );
            if (currentProject && !currentProject.id.startsWith("temp-")) {
              realProjectId = currentProject.id;
            }
            
            const response = await fetch("/api/issues", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                title: data.title,
                description: data.description || null,
                status: mapIssueStatusToDb(data.status),
                priority: mapPriorityToDb(data.priority),
                teamId,
                projectId: realProjectId.startsWith("temp-") ? null : realProjectId,
                assigneeUserId: data.assigneeUserId || null,
              }),
            });
            
            if (!response.ok) {
              const errorData = await response.json().catch(() => ({}));
              throw new Error(errorData.error || `Failed to create issue: ${response.statusText}`);
            }
            
            const result = await response.json();
            const serverIssue = result.data;
            
            // Replace temp issue with server issue
            set((state) => ({
              issues: state.issues.map((i) =>
                i.id === tempId
                  ? { ...newIssue, id: serverIssue.id, key: serverIssue.key }
                  : i
              ),
            }));
          } catch (error) {
            console.error("Failed to create issue:", error);
            // Rollback optimistic update
            set((state) => ({
              issues: state.issues.filter((i) => i.id !== tempId),
            }));
            // Show error to user
            const message = error instanceof Error ? error.message : "Failed to create issue";
            alert(`Error: ${message}`);
            // Re-fetch to ensure consistency
            get().fetchData();
          }
        })();
        
        return newIssue;
      },

      // Local-only update (no API call) - used for dragging
      updateIssueLocal: (id, data) => {
        set((state) => ({
          issues: state.issues.map((i) =>
            i.id === id ? { ...i, ...data } : i
          ),
        }));
      },

      updateIssue: (id, data) => {
        // Optimistic update
        set((state) => ({
          issues: state.issues.map((i) =>
            i.id === id ? { ...i, ...data } : i
          ),
        }));
        
        // Skip API call for temp IDs
        if (id.startsWith("temp-")) return;
        
        // PATCH to /api/issues/:id
        (async () => {
          try {
            const updateData: Record<string, unknown> = {};
            if (data.title !== undefined) updateData.title = data.title;
            if (data.description !== undefined) updateData.description = data.description || null;
            if (data.status !== undefined) updateData.status = mapIssueStatusToDb(data.status);
            if (data.priority !== undefined) updateData.priority = mapPriorityToDb(data.priority);
            if (data.assigneeUserId !== undefined) updateData.assigneeUserId = data.assigneeUserId || null;
            
            const response = await fetch(`/api/issues/${id}`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(updateData),
            });
            
            if (!response.ok) {
              throw new Error(`Failed to update issue: ${response.statusText}`);
            }
          } catch (error) {
            console.error("Failed to update issue:", error);
            // Re-fetch to restore correct state
            get().fetchData();
          }
        })();
      },

      deleteIssue: (id) => {
        // Optimistic update
        set((state) => ({
          issues: state.issues.filter((i) => i.id !== id),
          dependencies: state.dependencies.filter(
            (d) => d.issueId !== id && d.blockedByIssueId !== id
          ),
        }));
        
        // Skip API call for temp IDs
        if (id.startsWith("temp-")) return;
        
        // DELETE /api/issues/:id
        (async () => {
          try {
            const response = await fetch(`/api/issues/${id}`, {
              method: "DELETE",
            });
            
            if (!response.ok) {
              throw new Error(`Failed to delete issue: ${response.statusText}`);
            }
          } catch (error) {
            console.error("Failed to delete issue:", error);
            // Re-fetch to restore correct state
            get().fetchData();
          }
        })();
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
        teams: state.teams,
        defaultTeamId: state.defaultTeamId,
        lastFetched: state.lastFetched,
      }),
    }
  )
);
