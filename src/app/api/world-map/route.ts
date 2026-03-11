import { NextResponse } from "next/server";
import { requireAppUser } from "@/lib/auth";
import { projectAccessWhere } from "@/lib/access";
import { prisma } from "@/lib/db";
import { handleRouteError } from "@/lib/route-errors";
import { ProjectStatus, IssueStatus, IssuePriority } from "@prisma/client";

// Visual positioning config - maps project index to map layout
const TERRAIN_TYPES = ["grass", "desert", "water", "mountain", "lava"] as const;
const TERRAIN_COLORS: Record<string, { color: string; shade: string }> = {
  grass: { color: "#4a8c3f", shade: "#2d5a27" },
  desert: { color: "#c8883a", shade: "#8a5a1f" },
  water: { color: "#3a7bbf", shade: "#1a4a80" },
  mountain: { color: "#7a5fa0", shade: "#4a3060" },
  lava: { color: "#c2410c", shade: "#7c2d12" },
};

// Map DB status to WorldMap status
function mapProjectStatus(status: ProjectStatus): "PLANNING" | "ACTIVE" | "PAUSED" | "COMPLETED" {
  switch (status) {
    case "PLANNED": return "PLANNING";
    case "ACTIVE": return "ACTIVE";
    case "ARCHIVED": return "PAUSED";
    case "COMPLETED": return "COMPLETED";
    default: return "PLANNING";
  }
}

function mapIssueStatus(status: IssueStatus): "BACKLOG" | "TODO" | "IN_PROGRESS" | "IN_REVIEW" | "DONE" | "CANCELLED" {
  switch (status) {
    case "BACKLOG": return "BACKLOG";
    case "TODO": return "TODO";
    case "IN_PROGRESS": return "IN_PROGRESS";
    case "DONE": return "DONE";
    case "CANCELED": return "CANCELLED";
    default: return "BACKLOG";
  }
}

function mapIssuePriority(priority: IssuePriority): "URGENT" | "HIGH" | "MEDIUM" | "LOW" | "NONE" {
  switch (priority) {
    case "URGENT": return "URGENT";
    case "HIGH": return "HIGH";
    case "MEDIUM": return "MEDIUM";
    case "LOW": return "LOW";
    default: return "NONE";
  }
}

// Generate visual position for a project based on index
function generateProjectPosition(index: number, total: number) {
  // Arrange projects in a roughly circular/grid pattern
  const cols = Math.ceil(Math.sqrt(total));
  const row = Math.floor(index / cols);
  const col = index % cols;
  
  const baseX = 80 + col * 260;
  const baseY = 150 + row * 200;
  
  // Add some variation
  const offsetX = (index * 37) % 60 - 30;
  const offsetY = (index * 23) % 40 - 20;
  
  return {
    x: baseX + offsetX,
    y: baseY + offsetY,
    w: 200 + (index % 3) * 20,
    h: 140 + (index % 2) * 20,
  };
}

// Generate visual position for an issue within its project region
function generateIssuePosition(
  issueIndex: number,
  projectX: number,
  projectY: number,
  projectW: number,
  projectH: number
) {
  // Distribute issues within the project region
  const angle = (issueIndex * 1.3) % (Math.PI * 2);
  const radius = 30 + (issueIndex * 17) % 50;
  
  const cx = projectX + projectW / 2;
  const cy = projectY + projectH / 2;
  
  return {
    x: Math.round(cx + Math.cos(angle) * radius),
    y: Math.round(cy + Math.sin(angle) * radius),
  };
}

// Generate paths between projects
function generateProjectPaths(projects: Array<{ id: string; x: number; y: number; w: number; h: number }>) {
  const paths: Array<{ from: string; to: string; pts: [number, number][] }> = [];
  
  // Connect adjacent projects
  for (let i = 0; i < projects.length - 1; i++) {
    const from = projects[i];
    const to = projects[i + 1];
    
    const fromCx = from.x + from.w / 2;
    const fromCy = from.y + from.h / 2;
    const toCx = to.x + to.w / 2;
    const toCy = to.y + to.h / 2;
    
    // Create a midpoint for the path
    const midX = (fromCx + toCx) / 2 + ((i * 13) % 40 - 20);
    const midY = (fromCy + toCy) / 2 + ((i * 17) % 30 - 15);
    
    paths.push({
      from: from.id,
      to: to.id,
      pts: [[Math.round(midX), Math.round(midY)]],
    });
  }
  
  return paths;
}

export async function GET(request: Request) {
  try {
    const user = await requireAppUser(request);

    // Fetch projects with access control
    const projects = await prisma.project.findMany({
      where: projectAccessWhere(user),
      include: {
        lead: {
          select: { id: true, name: true, email: true },
        },
        issues: {
          include: {
            assignee: {
              select: { id: true, name: true, email: true },
            },
            dependencies: true,
            blockedBy: true,
          },
          orderBy: { createdAt: "asc" },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    // Transform to WorldMap format
    const worldMapProjects = projects.map((project, projectIndex) => {
      const pos = generateProjectPosition(projectIndex, projects.length);
      const terrain = TERRAIN_TYPES[projectIndex % TERRAIN_TYPES.length];
      const colors = TERRAIN_COLORS[terrain];

      return {
        id: project.id,
        key: project.key,
        name: project.name,
        status: mapProjectStatus(project.status),
        leadUserId: project.leadUserId,
        x: pos.x,
        y: pos.y,
        w: pos.w,
        h: pos.h,
        terrain,
        color: colors.color,
        shade: colors.shade,
      };
    });

    // Build issue position map (need project positions first)
    const projectPositions = new Map(
      worldMapProjects.map(p => [p.id, { x: p.x, y: p.y, w: p.w, h: p.h }])
    );

    // Track issue index per project for positioning
    const projectIssueIndex = new Map<string, number>();

    const worldMapIssues = projects.flatMap(project => 
      project.issues.map(issue => {
        const projectPos = projectPositions.get(project.id)!;
        const issueIdx = projectIssueIndex.get(project.id) || 0;
        projectIssueIndex.set(project.id, issueIdx + 1);
        
        const pos = generateIssuePosition(
          issueIdx,
          projectPos.x,
          projectPos.y,
          projectPos.w,
          projectPos.h
        );

        // Determine size based on some heuristic (could be based on story points, etc.)
        const size: "S" | "M" | "L" = 
          issue.priority === "URGENT" ? "L" :
          issue.priority === "HIGH" ? "M" : "S";

        return {
          id: issue.id,
          key: issue.key,
          title: issue.title,
          status: mapIssueStatus(issue.status),
          priority: mapIssuePriority(issue.priority),
          projectId: project.id,
          assigneeUserId: issue.assigneeUserId,
          x: pos.x,
          y: pos.y,
          size,
        };
      })
    );

    // Get all dependencies
    const dependencies = projects.flatMap(project =>
      project.issues.flatMap(issue =>
        issue.blockedBy.map(dep => ({
          issueId: issue.id,
          blockedByIssueId: dep.blockedByIssueId,
        }))
      )
    );

    // Get unique users from assignees and leads
    const userMap = new Map<string, { id: string; name: string; initials: string }>();
    projects.forEach(project => {
      if (project.lead) {
        const initials = project.lead.name
          .split(" ")
          .map(n => n[0])
          .join("")
          .toUpperCase()
          .slice(0, 2);
        userMap.set(project.lead.id, {
          id: project.lead.id,
          name: project.lead.name,
          initials,
        });
      }
      project.issues.forEach(issue => {
        if (issue.assignee) {
          const initials = issue.assignee.name
            .split(" ")
            .map(n => n[0])
            .join("")
            .toUpperCase()
            .slice(0, 2);
          userMap.set(issue.assignee.id, {
            id: issue.assignee.id,
            name: issue.assignee.name,
            initials,
          });
        }
      });
    });

    // Generate paths between projects
    const projectPaths = generateProjectPaths(
      worldMapProjects.map(p => ({ id: p.id, x: p.x, y: p.y, w: p.w, h: p.h }))
    );

    return NextResponse.json({
      data: {
        users: Array.from(userMap.values()),
        projects: worldMapProjects,
        issues: worldMapIssues,
        dependencies,
        projectPaths,
      },
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
