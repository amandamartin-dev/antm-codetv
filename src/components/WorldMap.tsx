"use client";

import { useState, useRef, useCallback, useEffect } from "react";

// ══════════════════════════════════════════════════════════════════════════════
// TYPES - Matching MVP_AGENT_SPEC.md Data Model
// ══════════════════════════════════════════════════════════════════════════════

type IssueStatus = "BACKLOG" | "TODO" | "IN_PROGRESS" | "IN_REVIEW" | "DONE" | "CANCELLED";
type IssuePriority = "URGENT" | "HIGH" | "MEDIUM" | "LOW" | "NONE";
type ProjectStatus = "PLANNING" | "ACTIVE" | "PAUSED" | "COMPLETED";

interface User {
  id: string;
  name: string;
  initials: string;
}

interface Project {
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
  terrain: "grass" | "desert" | "water" | "mountain" | "lava" | "cloud";
  color: string;
  shade: string;
}

interface Issue {
  id: string;
  key: string;
  title: string;
  status: IssueStatus;
  priority: IssuePriority;
  projectId: string;
  assigneeUserId?: string;
  // Position within project region
  x: number;
  y: number;
  size: "S" | "M" | "L";
}

interface IssueDependency {
  issueId: string;
  blockedByIssueId: string;
}

interface ProjectPath {
  from: string;
  to: string;
  pts: [number, number][];
}

interface WorldMapData {
  users: User[];
  projects: Project[];
  issues: Issue[];
  dependencies: IssueDependency[];
  projectPaths: ProjectPath[];
}

// ══════════════════════════════════════════════════════════════════════════════
// CONFIG
// ══════════════════════════════════════════════════════════════════════════════

const STATUS_CONFIG = {
  DONE: { color: "#5fc45a", icon: "★" },
  IN_REVIEW: { color: "#a855f7", icon: "◈" },
  IN_PROGRESS: { color: "#f5c842", icon: "▶" },
  TODO: { color: "#6366f1", icon: "◇" },
  BACKLOG: { color: "#aaaacc", icon: "○" },
  CANCELLED: { color: "#ef4444", icon: "✕" },
};

const TERRAIN_PATTERNS = {
  grass: { fill: "#4a8c3f", dots: "#3a6c2f", emoji: "🌲" },
  desert: { fill: "#c8883a", dots: "#a86020", emoji: "🌵" },
  water: { fill: "#3a7bbf", dots: "#2a5a9f", emoji: "🌊" },
  mountain: { fill: "#7a5fa0", dots: "#5a3f80", emoji: "⛰️" },
  lava: { fill: "#c2410c", dots: "#7c2d12", emoji: "🌋" },
  cloud: { fill: "#e0e7ff", dots: "#a5b4fc", emoji: "☁️" },
};

// ══════════════════════════════════════════════════════════════════════════════
// COMPONENTS
// ══════════════════════════════════════════════════════════════════════════════

function TerrainShape({ 
  project, 
  isHovered,
  onHover,
  onLeave,
}: { 
  project: Project;
  isHovered: boolean;
  onHover: () => void;
  onLeave: () => void;
}) {
  const t = TERRAIN_PATTERNS[project.terrain];
  const { x, y, w, h, id } = project;
  const cx = x + w / 2;
  const cy = y + h / 2;
  const isLocked = project.status === "PLANNING" || project.status === "PAUSED";
  const isComplete = project.status === "COMPLETED";
  const isCurrent = project.status === "ACTIVE";

  // Organic blob path
  const blobPath = `
    M ${cx} ${y + 10}
    C ${cx + w * 0.4} ${y} ${x + w + 10} ${cy - h * 0.2} ${x + w + 5} ${cy}
    C ${x + w + 15} ${cy + h * 0.35} ${cx + w * 0.3} ${y + h + 10} ${cx} ${y + h + 5}
    C ${cx - w * 0.35} ${y + h + 15} ${x - 10} ${cy + h * 0.3} ${x - 5} ${cy}
    C ${x - 15} ${cy - h * 0.4} ${cx - w * 0.3} ${y + 5} ${cx} ${y + 10}
    Z
  `;

  return (
    <g 
      className="terrain-region"
      style={{ 
        cursor: isLocked ? 'not-allowed' : 'pointer',
      }}
      onMouseEnter={onHover}
      onMouseLeave={onLeave}
    >
      <defs>
        <clipPath id={`clip-${id}`}>
          <path d={blobPath} />
        </clipPath>
        <pattern id={`dots-${id}`} x="0" y="0" width="12" height="12" patternUnits="userSpaceOnUse">
          <rect width="12" height="12" fill={t.fill} />
          <circle cx="6" cy="6" r="1.5" fill={t.dots} opacity="0.5" />
        </pattern>
        {/* Glow filter for hover */}
        <filter id={`glow-${id}`} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="4" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Shadow */}
      <path 
        d={blobPath} 
        fill="rgba(0,0,0,0.35)" 
        transform="translate(5,6)"
      />
      
      {/* Terrain fill */}
      <path d={blobPath} fill={`url(#dots-${id})`} />
      
      {/* Edge highlight */}
      <path 
        d={blobPath} 
        fill="none" 
        stroke={isLocked ? "#333" : isComplete ? "#5fc45a" : isCurrent ? "#f5c842" : t.dots} 
        strokeWidth={isCurrent ? 4 : 3} 
        opacity={0.8}
      />
      
      {/* Locked overlay */}
      {isLocked && (
        <path d={blobPath} fill="rgba(0,0,0,0.55)" />
      )}

      {/* Cliff edge blocks for texture */}
      {[0, 1, 2, 3].map(i => {
        const angle = (i / 4) * Math.PI * 2 + 0.4;
        const rx = w * 0.45;
        const ry = h * 0.45;
        const bx = cx + Math.cos(angle) * rx * 0.85;
        const by = cy + Math.sin(angle) * ry * 0.85;
        return (
          <rect
            key={i}
            x={bx - 5}
            y={by - 4}
            width={10}
            height={8}
            fill={project.shade}
            rx={1}
            clipPath={`url(#clip-${id})`}
          />
        );
      })}
    </g>
  );
}

function ProjectLabel({ project }: { project: Project }) {
  const isLocked = project.status === "PLANNING" || project.status === "PAUSED";
  const cx = project.x + project.w / 2;

  if (isLocked) {
    return (
      <text
        x={cx}
        y={project.y + project.h / 2 + 5}
        textAnchor="middle"
        fontSize={16}
        fill="rgba(255,255,255,0.4)"
      >
        🔒
      </text>
    );
  }

  return (
    <text
      x={cx}
      y={project.y + 24}
      textAnchor="middle"
      fontSize={8}
      fill="rgba(255,255,255,0.9)"
      fontFamily="'Press Start 2P', monospace"
      style={{ textShadow: "0 2px 4px rgba(0,0,0,0.8)" }}
    >
      {project.name}
    </text>
  );
}

function BossNode({ project }: { project: Project }) {
  const isLocked = project.status === "PLANNING" || project.status === "PAUSED";
  const isDefeated = project.status === "COMPLETED";
  if (isLocked) return null;

  const cx = project.x + project.w - 28;
  const cy = project.y + project.h - 28;

  return (
    <g>
      <circle
        cx={cx}
        cy={cy}
        r={16}
        fill={isDefeated ? "#2a4a2a" : "#4a0a0a"}
        stroke={isDefeated ? "#5fc45a" : "#ff4444"}
        strokeWidth={2}
      />
      <text x={cx} y={cy + 5} textAnchor="middle" fontSize={16}>
        {isDefeated ? "🏆" : "👹"}
      </text>
    </g>
  );
}

function PathLine({ path, projects }: { path: ProjectPath; projects: Project[] }) {
  const fromP = projects.find(p => p.id === path.from);
  const toP = projects.find(p => p.id === path.to);
  if (!fromP || !toP) return null;

  const fx = fromP.x + fromP.w / 2;
  const fy = fromP.y + fromP.h / 2;
  const tx = toP.x + toP.w / 2;
  const ty = toP.y + toP.h / 2;

  const pts: [number, number][] = [[fx, fy], ...path.pts, [tx, ty]];
  const d = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p[0]},${p[1]}`).join(" ");

  const isFromComplete = fromP.status === "COMPLETED";
  const isToLocked = toP.status === "PLANNING" || toP.status === "PAUSED";

  return (
    <g>
      {/* Path glow */}
      <path
        d={d}
        fill="none"
        stroke="rgba(255,255,255,0.08)"
        strokeWidth="10"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Main path */}
      <path
        d={d}
        fill="none"
        stroke={isToLocked ? "#555" : "#e8d88a"}
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeDasharray={isFromComplete ? "none" : "12 8"}
        opacity={isToLocked ? 0.4 : 0.8}
      />
    </g>
  );
}

function IssueNode({
  issue,
  isSelected,
  isHovered,
  onClick,
  onHover,
  onLeave,
  projects,
  users,
}: {
  issue: Issue;
  isSelected: boolean;
  isHovered: boolean;
  onClick: () => void;
  onHover: () => void;
  onLeave: () => void;
  projects: Project[];
  users: User[];
}) {
  const project = projects.find(p => p.id === issue.projectId);
  const isLocked = project?.status === "PLANNING" || project?.status === "PAUSED";
  const s = STATUS_CONFIG[issue.status];
  const size = issue.size === "L" ? 14 : issue.size === "M" ? 12 : 10;
  const assignee = users.find(u => u.id === issue.assigneeUserId);

  return (
    <g
      onClick={() => !isLocked && onClick()}
      onMouseEnter={onHover}
      onMouseLeave={onLeave}
      style={{ cursor: isLocked ? "not-allowed" : "pointer" }}
      className="issue-node"
    >
      {/* Active glow */}
      {issue.status === "IN_PROGRESS" && !isLocked && (
        <circle cx={issue.x} cy={issue.y} r={size + 6} fill="#f5c842" opacity="0.2">
          <animate attributeName="r" values={`${size + 4};${size + 10};${size + 4}`} dur="1.5s" repeatCount="indefinite" />
          <animate attributeName="opacity" values="0.25;0.08;0.25" dur="1.5s" repeatCount="indefinite" />
        </circle>
      )}

      {/* Selection ring */}
      {isSelected && (
        <circle
          cx={issue.x}
          cy={issue.y}
          r={size + 5}
          fill="none"
          stroke="#fff"
          strokeWidth={2}
          opacity={0.8}
        />
      )}

      {/* Node shadow */}
      <ellipse
        cx={issue.x}
        cy={issue.y + 3}
        rx={size}
        ry={size * 0.7}
        fill="rgba(0,0,0,0.4)"
      />

      {/* Main node */}
      <circle
        cx={issue.x}
        cy={issue.y}
        r={size}
        fill={isLocked ? "#2a2a3a" : isSelected ? "#fff" : s.color}
        stroke={isSelected ? s.color : "rgba(0,0,0,0.4)"}
        strokeWidth={isSelected ? 3 : 2}
        opacity={isLocked ? 0.4 : 1}
      />

      {/* Status icon */}
      <text
        x={issue.x}
        y={issue.y + 4}
        textAnchor="middle"
        fontSize={size * 0.9}
        fill={isSelected ? s.color : "#0a0a14"}
        fontFamily="monospace"
        fontWeight="bold"
      >
        {isLocked ? "·" : s.icon}
      </text>

      {/* Assignee indicator */}
      {assignee && !isLocked && (
        <circle
          cx={issue.x + size - 2}
          cy={issue.y - size + 2}
          r={5}
          fill="#fff"
          stroke="#333"
          strokeWidth={1}
        />
      )}

      {/* Tooltip on hover */}
      {isHovered && !isLocked && (
        <g className="tooltip" style={{ pointerEvents: 'none' }}>
          <rect
            x={issue.x - 70}
            y={issue.y - size - 45}
            width={140}
            height={36}
            rx={6}
            fill="rgba(0,0,0,0.9)"
            stroke="rgba(255,255,255,0.15)"
            strokeWidth={1}
          />
          {/* Arrow */}
          <polygon
            points={`${issue.x - 6},${issue.y - size - 9} ${issue.x + 6},${issue.y - size - 9} ${issue.x},${issue.y - size - 2}`}
            fill="rgba(0,0,0,0.9)"
          />
          {/* Issue key */}
          <text
            x={issue.x}
            y={issue.y - size - 30}
            textAnchor="middle"
            fontSize={7}
            fill={s.color}
            fontFamily="'Press Start 2P', monospace"
          >
            {issue.key}
          </text>
          {/* Issue title (truncated) */}
          <text
            x={issue.x}
            y={issue.y - size - 16}
            textAnchor="middle"
            fontSize={6}
            fill="rgba(255,255,255,0.8)"
            fontFamily="'Press Start 2P', monospace"
          >
            {issue.title.length > 18 ? issue.title.slice(0, 18) + '...' : issue.title}
          </text>
        </g>
      )}
    </g>
  );
}

function PlayerMarker({ projects }: { projects: Project[] }) {
  // Find the current active project
  const currentProject = projects.find(p => p.status === "ACTIVE");
  if (!currentProject) return null;

  const cx = currentProject.x + currentProject.w / 2;
  const cy = currentProject.y + currentProject.h / 2 + 10;

  return (
    <text
      x={cx}
      y={cy}
      textAnchor="middle"
      fontSize={28}
      style={{ animation: "float 0.8s ease-in-out infinite" }}
    >
      🧑‍💻
    </text>
  );
}

function HUD({ issues }: { issues: Issue[] }) {
  const done = issues.filter(i => i.status === "DONE").length;
  const inProgress = issues.filter(i => i.status === "IN_PROGRESS" || i.status === "IN_REVIEW").length;
  const todo = issues.filter(i => i.status === "TODO").length;

  return (
    <div
      style={{
        position: "absolute",
        top: 16,
        left: 16,
        background: "rgba(0,0,0,0.75)",
        border: "2px solid rgba(255,255,255,0.15)",
        borderRadius: 8,
        padding: "12px 18px",
        backdropFilter: "blur(8px)",
        fontFamily: "'Press Start 2P', monospace",
      }}
    >
      <div style={{ fontSize: 9, color: "#FFD700", letterSpacing: "0.12em", marginBottom: 6 }}>
        SPRINT MAP
      </div>
      <div style={{ fontSize: 7, color: "rgba(255,255,255,0.4)", letterSpacing: "0.1em", marginBottom: 10 }}>
        Q1 2026
      </div>
      <div style={{ display: "flex", gap: 14 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
          <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#5fc45a" }} />
          <span style={{ fontSize: 7, color: "rgba(255,255,255,0.6)" }}>{done} DONE</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
          <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#f5c842" }} />
          <span style={{ fontSize: 7, color: "rgba(255,255,255,0.6)" }}>{inProgress} ACTIVE</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
          <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#aaaacc" }} />
          <span style={{ fontSize: 7, color: "rgba(255,255,255,0.6)" }}>{todo} TODO</span>
        </div>
      </div>
    </div>
  );
}

function DetailPanel({
  issue,
  onClose,
  onNavigate,
  projects,
  users,
  issues,
  dependencies,
}: {
  issue: Issue;
  onClose: () => void;
  onNavigate: (issue: Issue) => void;
  projects: Project[];
  users: User[];
  issues: Issue[];
  dependencies: IssueDependency[];
}) {
  const project = projects.find(p => p.id === issue.projectId);
  const assignee = users.find(u => u.id === issue.assigneeUserId);
  const s = STATUS_CONFIG[issue.status];

  // Find dependencies
  const blockedBy = dependencies
    .filter(d => d.issueId === issue.id)
    .map(d => issues.find(i => i.id === d.blockedByIssueId))
    .filter(Boolean) as Issue[];

  const blocks = dependencies
    .filter(d => d.blockedByIssueId === issue.id)
    .map(d => issues.find(i => i.id === d.issueId))
    .filter(Boolean) as Issue[];

  // Get other issues in same project
  const regionIssues = issues.filter(i => i.projectId === issue.projectId && i.id !== issue.id);

  return (
    <div
      style={{
        position: "absolute",
        right: 0,
        top: 0,
        bottom: 0,
        width: 320,
        background: "rgba(10,10,20,0.95)",
        borderLeft: "2px solid rgba(255,255,255,0.1)",
        backdropFilter: "blur(16px)",
        display: "flex",
        flexDirection: "column",
        overflowY: "auto",
        fontFamily: "'Press Start 2P', monospace",
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: "20px 18px 16px",
          borderBottom: "1px solid rgba(255,255,255,0.08)",
          background: project ? `linear-gradient(135deg, ${project.color}33, transparent)` : "transparent",
        }}
      >
        <div style={{ fontSize: 7, color: "rgba(255,255,255,0.4)", letterSpacing: "0.15em", marginBottom: 8 }}>
          {project?.name.toUpperCase()}
        </div>
        <div style={{ fontSize: 11, color: "#fff", marginBottom: 14, lineHeight: 1.4 }}>
          {issue.title}
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <span
            style={{
              fontSize: 7,
              padding: "4px 10px",
              background: s.color + "33",
              color: s.color,
              borderRadius: 4,
              letterSpacing: "0.1em",
            }}
          >
            {s.icon} {issue.status.replace("_", " ")}
          </span>
          <span
            style={{
              fontSize: 7,
              padding: "4px 10px",
              background: "rgba(255,255,255,0.08)",
              color: "rgba(255,255,255,0.5)",
              borderRadius: 4,
            }}
          >
            SIZE {issue.size}
          </span>
          <span style={{ fontSize: 7, color: "rgba(255,255,255,0.3)", letterSpacing: "0.1em" }}>
            {issue.key}
          </span>
        </div>
      </div>

      {/* Assignee */}
      <div style={{ padding: "16px 18px", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
        <div style={{ fontSize: 7, color: "rgba(255,255,255,0.3)", marginBottom: 10, letterSpacing: "0.1em" }}>
          OWNER
        </div>
        {assignee ? (
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div
              style={{
                width: 28,
                height: 28,
                borderRadius: "50%",
                background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 9,
                fontWeight: 700,
                color: "#fff",
              }}
            >
              {assignee.initials}
            </div>
            <span style={{ fontSize: 9, color: "rgba(255,255,255,0.7)" }}>{assignee.name}</span>
          </div>
        ) : (
          <div
            style={{
              fontSize: 8,
              color: "#ff6b6b",
              padding: "8px 12px",
              border: "1px dashed rgba(255,100,100,0.3)",
              borderRadius: 4,
              cursor: "pointer",
              letterSpacing: "0.1em",
              textAlign: "center",
            }}
          >
            ⚑ GRAB THIS QUEST
          </div>
        )}
      </div>

      {/* Blocked by */}
      {blockedBy.length > 0 && (
        <div style={{ padding: "16px 18px", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
          <div style={{ fontSize: 7, color: "rgba(255,255,255,0.3)", marginBottom: 10, letterSpacing: "0.1em" }}>
            🔒 BLOCKED BY
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {blockedBy.map(dep => (
              <button
                key={dep.id}
                onClick={() => onNavigate(dep)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "8px 10px",
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.06)",
                  borderRadius: 5,
                  cursor: "pointer",
                  textAlign: "left",
                }}
              >
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: STATUS_CONFIG[dep.status].color }} />
                <span style={{ fontSize: 7, color: "rgba(255,255,255,0.5)" }}>{dep.key}</span>
                <span style={{ fontSize: 8, color: "rgba(255,255,255,0.7)", flex: 1 }}>{dep.title}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Unlocks */}
      {blocks.length > 0 && (
        <div style={{ padding: "16px 18px", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
          <div style={{ fontSize: 7, color: "rgba(255,255,255,0.3)", marginBottom: 10, letterSpacing: "0.1em" }}>
            🔓 UNLOCKS
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {blocks.map(dep => (
              <button
                key={dep.id}
                onClick={() => onNavigate(dep)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "8px 10px",
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.06)",
                  borderRadius: 5,
                  cursor: "pointer",
                  textAlign: "left",
                }}
              >
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: STATUS_CONFIG[dep.status].color }} />
                <span style={{ fontSize: 7, color: "rgba(255,255,255,0.5)" }}>{dep.key}</span>
                <span style={{ fontSize: 8, color: "rgba(255,255,255,0.7)", flex: 1 }}>{dep.title}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Other issues in region */}
      <div style={{ padding: "16px 18px", flex: 1 }}>
        <div style={{ fontSize: 7, color: "rgba(255,255,255,0.3)", marginBottom: 10, letterSpacing: "0.1em" }}>
          ALSO IN THIS REGION
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
          {regionIssues.slice(0, 5).map(t => (
            <button
              key={t.id}
              onClick={() => onNavigate(t)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "7px 10px",
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.05)",
                borderRadius: 5,
                cursor: "pointer",
                textAlign: "left",
              }}
            >
              <div style={{ width: 7, height: 7, borderRadius: "50%", background: STATUS_CONFIG[t.status].color }} />
              <span style={{ fontSize: 8, color: "rgba(255,255,255,0.6)", flex: 1 }}>{t.title}</span>
              <span style={{ fontSize: 7, color: "rgba(255,255,255,0.25)" }}>{t.key}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Close */}
      <div style={{ padding: "14px 18px", borderTop: "1px solid rgba(255,255,255,0.08)" }}>
        <button
          onClick={onClose}
          style={{
            width: "100%",
            fontSize: 7,
            color: "rgba(255,255,255,0.4)",
            background: "transparent",
            border: "none",
            cursor: "pointer",
            letterSpacing: "0.15em",
            padding: 8,
          }}
        >
          ✕ CLOSE
        </button>
      </div>
    </div>
  );
}

function LoadingState() {
  return (
    <div
      style={{
        width: "100%",
        height: "100vh",
        background: "linear-gradient(180deg, #4a8fc8 0%, #6aafea 50%, #8ecfff 100%)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "'Press Start 2P', monospace",
      }}
    >
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: 32, marginBottom: 20 }}>🗺️</div>
        <div style={{ fontSize: 10, color: "#fff", letterSpacing: "0.15em" }}>
          LOADING WORLD MAP...
        </div>
      </div>
    </div>
  );
}

function ErrorState({ error, onRetry }: { error: string; onRetry: () => void }) {
  return (
    <div
      style={{
        width: "100%",
        height: "100vh",
        background: "linear-gradient(180deg, #4a8fc8 0%, #6aafea 50%, #8ecfff 100%)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "'Press Start 2P', monospace",
      }}
    >
      <div style={{ textAlign: "center", maxWidth: 400 }}>
        <div style={{ fontSize: 32, marginBottom: 20 }}>⚠️</div>
        <div style={{ fontSize: 10, color: "#fff", letterSpacing: "0.1em", marginBottom: 16 }}>
          FAILED TO LOAD MAP
        </div>
        <div style={{ fontSize: 8, color: "rgba(255,255,255,0.6)", marginBottom: 20 }}>
          {error}
        </div>
        <button
          onClick={onRetry}
          style={{
            fontSize: 8,
            color: "#fff",
            background: "rgba(0,0,0,0.5)",
            border: "2px solid rgba(255,255,255,0.3)",
            borderRadius: 6,
            padding: "10px 20px",
            cursor: "pointer",
            letterSpacing: "0.1em",
          }}
        >
          RETRY
        </button>
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div
      style={{
        width: "100%",
        height: "100vh",
        background: "linear-gradient(180deg, #4a8fc8 0%, #6aafea 50%, #8ecfff 100%)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "'Press Start 2P', monospace",
      }}
    >
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: 32, marginBottom: 20 }}>🏝️</div>
        <div style={{ fontSize: 10, color: "#fff", letterSpacing: "0.15em", marginBottom: 10 }}>
          NO PROJECTS YET
        </div>
        <div style={{ fontSize: 8, color: "rgba(255,255,255,0.6)" }}>
          Create some projects to see them on the map
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ══════════════════════════════════════════════════════════════════════════════

export default function WorldMap() {
  const [data, setData] = useState<WorldMapData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [selected, setSelected] = useState<Issue | null>(null);
  const [hoveredIssue, setHoveredIssue] = useState<string | null>(null);
  const [hoveredProject, setHoveredProject] = useState<string | null>(null);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const dragStart = useRef<{ mx: number; my: number; px: number; py: number } | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/world-map");
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }
      const result = await response.json();
      setData(result.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.target instanceof Element && (e.target.tagName === "svg" || e.target.tagName === "rect")) {
      dragStart.current = { mx: e.clientX, my: e.clientY, px: pan.x, py: pan.y };
      setDragging(true);
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!dragging || !dragStart.current) return;
    setPan({
      x: dragStart.current.px + (e.clientX - dragStart.current.mx),
      y: dragStart.current.py + (e.clientY - dragStart.current.my),
    });
  };

  const handleMouseUp = () => setDragging(false);

  if (loading) return <LoadingState />;
  if (error) return <ErrorState error={error} onRetry={fetchData} />;
  if (!data || data.projects.length === 0) return <EmptyState />;

  const { users, projects, issues, dependencies, projectPaths } = data;

  return (
    <div
      style={{
        width: "100%",
        height: "100vh",
        background: "#5b9bd4",
        overflow: "hidden",
        position: "relative",
        cursor: dragging ? "grabbing" : "grab",
        fontFamily: "'Press Start 2P', monospace",
      }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap');
        * { box-sizing: border-box; }
        
        @keyframes float { 
          0%, 100% { transform: translateY(0); } 
          50% { transform: translateY(-6px); } 
        }
      `}</style>

      {/* Sky gradient */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: "linear-gradient(180deg, #4a8fc8 0%, #6aafea 50%, #8ecfff 100%)",
        }}
      />

      {/* Floating clouds */}
      {[
        { x: 60, y: 50, delay: 0, size: 32 },
        { x: 280, y: 30, delay: 0.8, size: 28 },
        { x: 520, y: 60, delay: 1.5, size: 36 },
        { x: 720, y: 40, delay: 2.2, size: 30 },
        { x: 900, y: 55, delay: 0.4, size: 34 },
      ].map((cloud, i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            left: cloud.x + pan.x,
            top: cloud.y + pan.y,
            fontSize: cloud.size,
            opacity: 0.8,
            animation: `float ${3 + cloud.delay}s ease-in-out infinite`,
            animationDelay: `${cloud.delay}s`,
            pointerEvents: "none",
          }}
        >
          ☁️
        </div>
      ))}

      {/* SVG Map */}
      <svg
        width="100%"
        height="100%"
        viewBox="0 0 900 580"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        style={{ position: "absolute", inset: 0 }}
      >
        <g transform={`translate(${pan.x * 0.8},${pan.y * 0.8})`}>
          {/* Paths between regions (render first, below everything) */}
          {projectPaths.map((path, i) => (
            <PathLine key={i} path={path} projects={projects} />
          ))}

          {/* Project regions */}
          {projects.map(project => (
            <g key={project.id}>
              <TerrainShape 
                project={project}
                isHovered={hoveredProject === project.id}
                onHover={() => !dragging && setHoveredProject(project.id)}
                onLeave={() => setHoveredProject(null)}
              />
              <ProjectLabel project={project} />
              <BossNode project={project} />
            </g>
          ))}

          {/* Issue nodes */}
          {issues.map(issue => (
            <IssueNode
              key={issue.id}
              issue={issue}
              isSelected={selected?.id === issue.id}
              isHovered={hoveredIssue === issue.id}
              onClick={() => setSelected(issue)}
              onHover={() => !dragging && setHoveredIssue(issue.id)}
              onLeave={() => setHoveredIssue(null)}
              projects={projects}
              users={users}
            />
          ))}

          {/* Player marker */}
          <PlayerMarker projects={projects} />
        </g>
      </svg>

      {/* HUD */}
      <HUD issues={issues} />

      {/* Hint */}
      <div
        style={{
          position: "absolute",
          bottom: 16,
          left: 16,
          fontSize: 7,
          color: "rgba(255,255,255,0.35)",
          letterSpacing: "0.1em",
          fontFamily: "'Press Start 2P', monospace",
        }}
      >
        DRAG TO EXPLORE · CLICK QUESTS
      </div>

      {/* Detail panel */}
      {selected && (
        <DetailPanel
          issue={selected}
          onClose={() => setSelected(null)}
          onNavigate={setSelected}
          projects={projects}
          users={users}
          issues={issues}
          dependencies={dependencies}
        />
      )}
    </div>
  );
}
