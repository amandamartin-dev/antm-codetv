"use client";

import { useState, useRef, useEffect } from "react";
import { useWorldMapStore } from "./store";
import { ProjectModal, IssueModal, FloatingActionButton } from "./modals";
import PixelSkyBackground from "./PixelSkyBackground";
import RegionView from "./RegionView";
import type { Project, Issue } from "./types";

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
  grass: { fill: "#4a8c3f", dots: "#3a6c2f" },
  desert: { fill: "#c8883a", dots: "#a86020" },
  water: { fill: "#3a7bbf", dots: "#2a5a9f" },
  mountain: { fill: "#7a5fa0", dots: "#5a3f80" },
  lava: { fill: "#c2410c", dots: "#7c2d12" },
  cloud: { fill: "#e0e7ff", dots: "#a5b4fc" },
};

// ══════════════════════════════════════════════════════════════════════════════
// SUB-COMPONENTS
// ══════════════════════════════════════════════════════════════════════════════

function TerrainShape({ project }: { project: Project }) {
  const t = TERRAIN_PATTERNS[project.terrain];
  const { x, y, w, h, id } = project;
  const cx = x + w / 2;
  const cy = y + h / 2;
  const isLocked = project.status === "PLANNING" || project.status === "PAUSED";
  const isComplete = project.status === "COMPLETED";
  const isCurrent = project.status === "ACTIVE";

  const blobPath = `
    M ${cx} ${y + 10}
    C ${cx + w * 0.4} ${y} ${x + w + 10} ${cy - h * 0.2} ${x + w + 5} ${cy}
    C ${x + w + 15} ${cy + h * 0.35} ${cx + w * 0.3} ${y + h + 10} ${cx} ${y + h + 5}
    C ${cx - w * 0.35} ${y + h + 15} ${x - 10} ${cy + h * 0.3} ${x - 5} ${cy}
    C ${x - 15} ${cy - h * 0.4} ${cx - w * 0.3} ${y + 5} ${cx} ${y + 10}
    Z
  `;

  return (
    <g>
      <defs>
        <clipPath id={`clip-${id}`}>
          <path d={blobPath} />
        </clipPath>
        <pattern id={`dots-${id}`} x="0" y="0" width="12" height="12" patternUnits="userSpaceOnUse">
          <rect width="12" height="12" fill={t.fill} />
          <circle cx="6" cy="6" r="1.5" fill={t.dots} opacity="0.5" />
        </pattern>
      </defs>

      <path d={blobPath} fill="transparent" style={{ cursor: "pointer" }} />
      <path d={blobPath} fill="rgba(0,0,0,0.35)" transform="translate(5,6)" />
      <path d={blobPath} fill={`url(#dots-${id})`} />
      <path
        d={blobPath}
        fill="none"
        stroke={isLocked ? "#333" : isComplete ? "#5fc45a" : isCurrent ? "#f5c842" : t.dots}
        strokeWidth={isCurrent ? 4 : 3}
        opacity={0.8}
      />
      {isLocked && <path d={blobPath} fill="rgba(0,0,0,0.55)" />}

      {[0, 1, 2, 3].map(i => {
        const angle = (i / 4) * Math.PI * 2 + 0.4;
        const rx = w * 0.45;
        const ry = h * 0.45;
        const bx = cx + Math.cos(angle) * rx * 0.85;
        const by = cy + Math.sin(angle) * ry * 0.85;
        return (
          <rect key={i} x={bx - 5} y={by - 4} width={10} height={8} fill={project.shade} rx={1} clipPath={`url(#clip-${id})`} />
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
      <text x={cx} y={project.y + project.h / 2 + 5} textAnchor="middle" fontSize={16} fill="rgba(255,255,255,0.4)" style={{ pointerEvents: "none" }}>
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
      style={{ textShadow: "0 2px 4px rgba(0,0,0,0.8)", pointerEvents: "none" }}
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
    <g style={{ pointerEvents: "none" }}>
      <circle cx={cx} cy={cy} r={16} fill={isDefeated ? "#2a4a2a" : "#4a0a0a"} stroke={isDefeated ? "#5fc45a" : "#ff4444"} strokeWidth={2} />
      <text x={cx} y={cy + 5} textAnchor="middle" fontSize={16}>{isDefeated ? "🏆" : "👹"}</text>
    </g>
  );
}

function PathLine({ path, projects }: { path: { from: string; to: string; pts: [number, number][] }; projects: Project[] }) {
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
      <path d={d} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="10" strokeLinecap="round" strokeLinejoin="round" />
      <path d={d} fill="none" stroke={isToLocked ? "#555" : "#e8d88a"} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" strokeDasharray={isFromComplete ? "none" : "12 8"} opacity={isToLocked ? 0.4 : 0.8} />
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
  onDoubleClick,
  projects,
}: {
  issue: Issue;
  isSelected: boolean;
  isHovered: boolean;
  onClick: () => void;
  onHover: () => void;
  onLeave: () => void;
  onDoubleClick: () => void;
  projects: Project[];
}) {
  const project = projects.find(p => p.id === issue.projectId);
  const isLocked = project?.status === "PLANNING" || project?.status === "PAUSED";
  const s = STATUS_CONFIG[issue.status];
  const size = issue.size === "L" ? 14 : issue.size === "M" ? 12 : 10;

  return (
    <g
      onClick={() => !isLocked && onClick()}
      onDoubleClick={() => !isLocked && onDoubleClick()}
      onMouseEnter={onHover}
      onMouseLeave={onLeave}
      style={{ cursor: isLocked ? "not-allowed" : "pointer" }}
    >
      {issue.status === "IN_PROGRESS" && !isLocked && (
        <circle cx={issue.x} cy={issue.y} r={size + 6} fill="#f5c842" opacity="0.2">
          <animate attributeName="r" values={`${size + 4};${size + 10};${size + 4}`} dur="1.5s" repeatCount="indefinite" />
          <animate attributeName="opacity" values="0.25;0.08;0.25" dur="1.5s" repeatCount="indefinite" />
        </circle>
      )}

      {isSelected && (
        <circle cx={issue.x} cy={issue.y} r={size + 5} fill="none" stroke="#fff" strokeWidth={2} opacity={0.8} />
      )}

      <ellipse cx={issue.x} cy={issue.y + 3} rx={size} ry={size * 0.7} fill="rgba(0,0,0,0.4)" />

      <circle
        cx={issue.x}
        cy={issue.y}
        r={size}
        fill={isLocked ? "#2a2a3a" : isSelected ? "#fff" : s.color}
        stroke={isSelected ? s.color : "rgba(0,0,0,0.4)"}
        strokeWidth={isSelected ? 3 : 2}
        opacity={isLocked ? 0.4 : 1}
      />

      <text x={issue.x} y={issue.y + 4} textAnchor="middle" fontSize={size * 0.9} fill={isSelected ? s.color : "#0a0a14"} fontFamily="monospace" fontWeight="bold">
        {isLocked ? "·" : s.icon}
      </text>

      {isHovered && !isLocked && (
        <g style={{ pointerEvents: "none" }}>
          <rect x={issue.x - 70} y={issue.y - size - 45} width={140} height={36} rx={6} fill="rgba(0,0,0,0.9)" stroke="rgba(255,255,255,0.15)" strokeWidth={1} />
          <polygon points={`${issue.x - 6},${issue.y - size - 9} ${issue.x + 6},${issue.y - size - 9} ${issue.x},${issue.y - size - 2}`} fill="rgba(0,0,0,0.9)" />
          <text x={issue.x} y={issue.y - size - 30} textAnchor="middle" fontSize={7} fill={s.color} fontFamily="'Press Start 2P', monospace">{issue.key}</text>
          <text x={issue.x} y={issue.y - size - 16} textAnchor="middle" fontSize={6} fill="rgba(255,255,255,0.8)" fontFamily="'Press Start 2P', monospace">
            {issue.title.length > 18 ? issue.title.slice(0, 18) + "..." : issue.title}
          </text>
        </g>
      )}
    </g>
  );
}

function PlayerMarker({ projects }: { projects: Project[] }) {
  const currentProject = projects.find(p => p.status === "ACTIVE");
  if (!currentProject) return null;
  const cx = currentProject.x + currentProject.w / 2;
  const cy = currentProject.y + currentProject.h / 2 + 10;
  return (
    <text x={cx} y={cy} textAnchor="middle" fontSize={28} style={{ animation: "float 0.8s ease-in-out infinite" }}>
      🧑‍💻
    </text>
  );
}

function HUD({ issues }: { issues: Issue[] }) {
  const done = issues.filter(i => i.status === "DONE").length;
  const inProgress = issues.filter(i => i.status === "IN_PROGRESS" || i.status === "IN_REVIEW").length;
  const todo = issues.filter(i => i.status === "TODO").length;

  return (
    <div style={{ position: "absolute", top: 16, left: 16, background: "rgba(0,0,0,0.75)", border: "2px solid rgba(255,255,255,0.15)", borderRadius: 8, padding: "12px 18px", backdropFilter: "blur(8px)", fontFamily: "'Press Start 2P', monospace" }}>
      <div style={{ fontSize: 9, color: "#FFD700", letterSpacing: "0.12em", marginBottom: 6 }}>SPRINT MAP</div>
      <div style={{ fontSize: 7, color: "rgba(255,255,255,0.4)", letterSpacing: "0.1em", marginBottom: 10 }}>Q2 2026</div>
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

function MusicPlayer() {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(0.5);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseFloat(e.target.value);
    setVolume(newVolume);
    if (audioRef.current) {
      audioRef.current.volume = newVolume;
    }
  };

  return (
    <div style={{
      position: "absolute",
      top: 16,
      right: 16,
      background: "rgba(0,0,0,0.75)",
      border: "2px solid rgba(255,255,255,0.15)",
      borderRadius: 8,
      padding: "10px 14px",
      backdropFilter: "blur(8px)",
      fontFamily: "'Press Start 2P', monospace",
      display: "flex",
      alignItems: "center",
      gap: 10,
      zIndex: 50,
    }}>
      <audio
        ref={audioRef}
        src="/audio/Pixel Heart Checkpoint.mp3"
        loop
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
      />
      <button
        onClick={togglePlay}
        style={{
          background: isPlaying ? "rgba(245,200,66,0.2)" : "rgba(255,255,255,0.1)",
          border: `2px solid ${isPlaying ? "#f5c842" : "rgba(255,255,255,0.2)"}`,
          borderRadius: 6,
          width: 32,
          height: 32,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
          fontSize: 14,
          transition: "all 0.2s",
        }}
        title={isPlaying ? "Pause Music" : "Play Music"}
      >
        {isPlaying ? "⏸" : "▶"}
      </button>
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        <span style={{ fontSize: 6, color: "rgba(255,255,255,0.5)", letterSpacing: "0.1em" }}>
          {isPlaying ? "NOW PLAYING" : "MUSIC"}
        </span>
        <input
          type="range"
          min="0"
          max="1"
          step="0.1"
          value={volume}
          onChange={handleVolumeChange}
          style={{
            width: 60,
            height: 4,
            appearance: "none",
            background: "rgba(255,255,255,0.2)",
            borderRadius: 2,
            cursor: "pointer",
          }}
          title="Volume"
        />
      </div>
      <span style={{ fontSize: 12 }}>🎵</span>
    </div>
  );
}

function DetailPanel({
  issue,
  projects,
  users,
  dependencies,
  issues,
  onClose,
  onNavigate,
  onEdit,
}: {
  issue: Issue;
  projects: Project[];
  users: { id: string; name: string; initials: string }[];
  dependencies: { issueId: string; blockedByIssueId: string }[];
  issues: Issue[];
  onClose: () => void;
  onNavigate: (issue: Issue) => void;
  onEdit: () => void;
}) {
  const project = projects.find(p => p.id === issue.projectId);
  const assignee = users.find(u => u.id === issue.assigneeUserId);
  const s = STATUS_CONFIG[issue.status];

  const blockedBy = dependencies.filter(d => d.issueId === issue.id).map(d => issues.find(i => i.id === d.blockedByIssueId)).filter(Boolean) as Issue[];
  const blocks = dependencies.filter(d => d.blockedByIssueId === issue.id).map(d => issues.find(i => i.id === d.issueId)).filter(Boolean) as Issue[];
  const regionIssues = issues.filter(i => i.projectId === issue.projectId && i.id !== issue.id);

  return (
    <div style={{ position: "absolute", right: 0, top: 0, bottom: 0, width: 320, background: "rgba(10,10,20,0.95)", borderLeft: "2px solid rgba(255,255,255,0.1)", backdropFilter: "blur(16px)", display: "flex", flexDirection: "column", overflowY: "auto", fontFamily: "'Press Start 2P', monospace", zIndex: 150 }}>
      <div style={{ padding: "20px 18px 16px", borderBottom: "1px solid rgba(255,255,255,0.08)", background: project ? `linear-gradient(135deg, ${project.color}33, transparent)` : "transparent" }}>
        <div style={{ fontSize: 7, color: "rgba(255,255,255,0.4)", letterSpacing: "0.15em", marginBottom: 8 }}>{project?.name.toUpperCase()}</div>
        <div style={{ fontSize: 11, color: "#fff", marginBottom: 14, lineHeight: 1.4 }}>{issue.title}</div>
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <span style={{ fontSize: 7, padding: "4px 10px", background: s.color + "33", color: s.color, borderRadius: 4, letterSpacing: "0.1em" }}>{s.icon} {issue.status.replace("_", " ")}</span>
          <span style={{ fontSize: 7, padding: "4px 10px", background: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.5)", borderRadius: 4 }}>SIZE {issue.size}</span>
          <span style={{ fontSize: 7, color: "rgba(255,255,255,0.3)", letterSpacing: "0.1em" }}>{issue.key}</span>
        </div>
      </div>

      <div style={{ padding: "16px 18px", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
        <div style={{ fontSize: 7, color: "rgba(255,255,255,0.3)", marginBottom: 10, letterSpacing: "0.1em" }}>OWNER</div>
        {assignee ? (
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 28, height: 28, borderRadius: "50%", background: "linear-gradient(135deg, #6366f1, #8b5cf6)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, fontWeight: 700, color: "#fff" }}>{assignee.initials}</div>
            <span style={{ fontSize: 9, color: "rgba(255,255,255,0.7)" }}>{assignee.name}</span>
          </div>
        ) : (
          <div style={{ fontSize: 8, color: "#ff6b6b", padding: "8px 12px", border: "1px dashed rgba(255,100,100,0.3)", borderRadius: 4, cursor: "pointer", letterSpacing: "0.1em", textAlign: "center" }}>⚑ GRAB THIS QUEST</div>
        )}
      </div>

      {blockedBy.length > 0 && (
        <div style={{ padding: "16px 18px", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
          <div style={{ fontSize: 7, color: "rgba(255,255,255,0.3)", marginBottom: 10, letterSpacing: "0.1em" }}>🔒 BLOCKED BY</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {blockedBy.map(dep => (
              <button key={dep.id} onClick={() => onNavigate(dep)} style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 10px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 5, cursor: "pointer", textAlign: "left" }}>
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: STATUS_CONFIG[dep.status].color }} />
                <span style={{ fontSize: 7, color: "rgba(255,255,255,0.5)" }}>{dep.key}</span>
                <span style={{ fontSize: 8, color: "rgba(255,255,255,0.7)", flex: 1 }}>{dep.title}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {blocks.length > 0 && (
        <div style={{ padding: "16px 18px", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
          <div style={{ fontSize: 7, color: "rgba(255,255,255,0.3)", marginBottom: 10, letterSpacing: "0.1em" }}>🔓 UNLOCKS</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {blocks.map(dep => (
              <button key={dep.id} onClick={() => onNavigate(dep)} style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 10px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 5, cursor: "pointer", textAlign: "left" }}>
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: STATUS_CONFIG[dep.status].color }} />
                <span style={{ fontSize: 7, color: "rgba(255,255,255,0.5)" }}>{dep.key}</span>
                <span style={{ fontSize: 8, color: "rgba(255,255,255,0.7)", flex: 1 }}>{dep.title}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      <div style={{ padding: "16px 18px", flex: 1 }}>
        <div style={{ fontSize: 7, color: "rgba(255,255,255,0.3)", marginBottom: 10, letterSpacing: "0.1em" }}>ALSO IN THIS REGION</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
          {regionIssues.slice(0, 5).map(t => (
            <button key={t.id} onClick={() => onNavigate(t)} style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 10px", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: 5, cursor: "pointer", textAlign: "left" }}>
              <div style={{ width: 7, height: 7, borderRadius: "50%", background: STATUS_CONFIG[t.status].color }} />
              <span style={{ fontSize: 8, color: "rgba(255,255,255,0.6)", flex: 1 }}>{t.title}</span>
              <span style={{ fontSize: 7, color: "rgba(255,255,255,0.25)" }}>{t.key}</span>
            </button>
          ))}
        </div>
      </div>

      <div style={{ padding: "14px 18px", borderTop: "1px solid rgba(255,255,255,0.08)", display: "flex", gap: 10 }}>
        <button onClick={onEdit} style={{ flex: 1, fontSize: 7, color: "#22c55e", background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.2)", borderRadius: 4, padding: 8, cursor: "pointer", letterSpacing: "0.1em" }}>✎ EDIT</button>
        <button onClick={onClose} style={{ flex: 1, fontSize: 7, color: "rgba(255,255,255,0.4)", background: "transparent", border: "none", cursor: "pointer", letterSpacing: "0.15em", padding: 8 }}>✕ CLOSE</button>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ══════════════════════════════════════════════════════════════════════════════

export default function WorldMap() {
  const { 
    users, projects, issues, dependencies, paths, 
    isLoading, error, fetchData,
    createProject, updateProject, updateProjectLocal, deleteProject, 
    createIssue, updateIssue, updateIssueLocal, deleteIssue 
  } = useWorldMapStore();

  const [selected, setSelected] = useState<Issue | null>(null);
  const [hoveredIssue, setHoveredIssue] = useState<string | null>(null);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const dragStart = useRef<{ mx: number; my: number; px: number; py: number } | null>(null);
  
  // Island dragging state
  const [draggingIsland, setDraggingIsland] = useState<string | null>(null);
  const islandDragStart = useRef<{ 
    mx: number; 
    my: number; 
    ix: number; 
    iy: number;
    issuePositions: { id: string; x: number; y: number }[];
  } | null>(null);

  // Modal state
  const [projectModal, setProjectModal] = useState<{ project?: Project; position?: { x: number; y: number } } | null>(null);
  const [issueModal, setIssueModal] = useState<{ issue?: Issue; project: Project } | null>(null);
  
  // Placement mode for new regions
  const [placementMode, setPlacementMode] = useState(false);
  const [ghostPosition, setGhostPosition] = useState<{ x: number; y: number } | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  // Region view state - when entering a specific island
  const [activeRegion, setActiveRegion] = useState<Project | null>(null);

  // Transition state for entering regions
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [transitionTarget, setTransitionTarget] = useState<Project | null>(null);

  // Fetch data on mount
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Convert screen coordinates to SVG coordinates
  const screenToSvg = (clientX: number, clientY: number) => {
    if (!svgRef.current) return { x: 0, y: 0 };
    const rect = svgRef.current.getBoundingClientRect();
    const viewBox = { width: 900, height: 580 };
    const scaleX = viewBox.width / rect.width;
    const scaleY = viewBox.height / rect.height;
    return {
      x: (clientX - rect.left) * scaleX - pan.x * 0.8,
      y: (clientY - rect.top) * scaleY - pan.y * 0.8,
    };
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (placementMode) return;
    if (draggingIsland) return; // Don't start map drag if dragging an island
    if (e.target instanceof Element && (e.target.tagName === "svg" || e.target.tagName === "rect")) {
      dragStart.current = { mx: e.clientX, my: e.clientY, px: pan.x, py: pan.y };
      setDragging(true);
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (placementMode) {
      const pos = screenToSvg(e.clientX, e.clientY);
      setGhostPosition({ x: pos.x - 100, y: pos.y - 75 });
      return;
    }
    
    // Handle island dragging - move region AND its issues together
    if (draggingIsland && islandDragStart.current) {
      const pos = screenToSvg(e.clientX, e.clientY);
      const startPos = screenToSvg(islandDragStart.current.mx, islandDragStart.current.my);
      const dx = pos.x - startPos.x;
      const dy = pos.y - startPos.y;
      
      // Update project position locally (no API call during drag)
      updateProjectLocal(draggingIsland, {
        x: islandDragStart.current.ix + dx,
        y: islandDragStart.current.iy + dy,
      });
      
      // Update all issues locally using their stored initial positions
      islandDragStart.current.issuePositions.forEach(({ id, x, y }) => {
        updateIssueLocal(id, {
          x: x + dx,
          y: y + dy,
        });
      });
      
      return;
    }
    
    if (!dragging || !dragStart.current) return;
    setPan({ x: dragStart.current.px + (e.clientX - dragStart.current.mx), y: dragStart.current.py + (e.clientY - dragStart.current.my) });
  };

  const handleMouseUp = () => {
    // If we were dragging an island, sync final positions to the database
    if (draggingIsland && islandDragStart.current) {
      const project = projects.find(p => p.id === draggingIsland);
      if (project) {
        // Sync project position to DB (only if position changed)
        if (project.x !== islandDragStart.current.ix || project.y !== islandDragStart.current.iy) {
          updateProject(draggingIsland, { x: project.x, y: project.y });
        }
        
        // Note: Issue positions are visual only (not stored in DB), so no need to sync
      }
    }
    
    setDragging(false);
    setDraggingIsland(null);
    islandDragStart.current = null;
  };
  
  // Handle island drag start
  const handleIslandMouseDown = (e: React.MouseEvent, project: Project) => {
    if (project.status === "PLANNING" || project.status === "PAUSED") return;
    e.stopPropagation();
    setDraggingIsland(project.id);
    // Store initial positions of project AND all its issues
    const projectIssues = issues.filter(i => i.projectId === project.id);
    islandDragStart.current = { 
      mx: e.clientX, 
      my: e.clientY, 
      ix: project.x, 
      iy: project.y,
      issuePositions: projectIssues.map(i => ({ id: i.id, x: i.x, y: i.y })),
    };
  };

  const handleMapClick = (e: React.MouseEvent) => {
    if (!placementMode) return;
    const pos = screenToSvg(e.clientX, e.clientY);
    setPlacementMode(false);
    setGhostPosition(null);
    setProjectModal({ position: { x: pos.x - 100, y: pos.y - 75 } });
  };

  // Handle entering a region (double-click on island)
  const handleEnterRegion = (project: Project) => {
    if (project.status === "PLANNING" || project.status === "PAUSED") return;
    
    setTransitionTarget(project);
    setIsTransitioning(true);
    
    setTimeout(() => {
      setActiveRegion(project);
      setIsTransitioning(false);
      setTransitionTarget(null);
      setSelected(null);
    }, 1000);
  };

  // Loading state
  if (isLoading && projects.length === 0) {
    return (
      <div style={{ width: "100%", height: "100vh", background: "#0a0a14", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Press Start 2P', monospace" }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 14, color: "#FFD700", marginBottom: 20 }}>LOADING WORLD MAP...</div>
          <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
            {[0, 1, 2].map(i => (
              <div key={i} style={{ width: 12, height: 12, background: "#FFD700", animation: `pulse 0.6s ease-in-out ${i * 0.15}s infinite` }} />
            ))}
          </div>
        </div>
        <style>{`@keyframes pulse { 0%, 100% { opacity: 0.3; } 50% { opacity: 1; } }`}</style>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div style={{ width: "100%", height: "100vh", background: "#0a0a14", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Press Start 2P', monospace" }}>
        <div style={{ textAlign: "center", padding: 40 }}>
          <div style={{ fontSize: 12, color: "#ef4444", marginBottom: 16 }}>⚠ ERROR LOADING MAP</div>
          <div style={{ fontSize: 8, color: "rgba(255,255,255,0.5)", marginBottom: 20 }}>{error}</div>
          <button onClick={() => fetchData()} style={{ fontSize: 8, color: "#FFD700", background: "rgba(255,215,0,0.1)", border: "2px solid #FFD700", borderRadius: 4, padding: "10px 20px", cursor: "pointer" }}>
            RETRY
          </button>
        </div>
      </div>
    );
  }

  // Empty state
  if (projects.length === 0) {
    return (
      <div style={{ width: "100%", height: "100vh", background: "#5b9bd4", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Press Start 2P', monospace" }}>
        <div style={{ textAlign: "center", background: "rgba(0,0,0,0.75)", padding: 40, borderRadius: 12, border: "2px solid rgba(255,255,255,0.15)" }}>
          <div style={{ fontSize: 12, color: "#FFD700", marginBottom: 16 }}>NO PROJECTS YET</div>
          <div style={{ fontSize: 8, color: "rgba(255,255,255,0.5)", marginBottom: 20 }}>Create your first project to start the adventure!</div>
          <button onClick={() => setProjectModal({ position: { x: 350, y: 200 } })} style={{ fontSize: 8, color: "#4ade80", background: "rgba(74,222,128,0.1)", border: "2px solid #4ade80", borderRadius: 4, padding: "10px 20px", cursor: "pointer" }}>
            + CREATE PROJECT
          </button>
        </div>
      </div>
    );
  }

  // Get first active project for new issue default
  const activeProject = projects.find(p => p.status === "ACTIVE") || projects[0];

  // If we're inside a region, render the RegionView
  if (activeRegion) {
    return (
      <RegionView
        project={activeRegion}
        issues={issues}
        users={users}
        dependencies={dependencies}
        onExit={() => setActiveRegion(null)}
        onSelectIssue={setSelected}
        selectedIssue={selected}
      />
    );
  }

  return (
    <div style={{ width: "100%", height: "100vh", background: "#5b9bd4", overflow: "hidden", position: "relative", cursor: draggingIsland ? "grabbing" : dragging ? "grabbing" : "grab", fontFamily: "'Press Start 2P', monospace" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap');
        * { box-sizing: border-box; }
        @keyframes float { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-6px); } }
        @keyframes zoomIn {
          0% { transform: scale(1); opacity: 0; }
          20% { transform: scale(1); opacity: 1; }
          80% { transform: scale(1.5); opacity: 1; }
          100% { transform: scale(3); opacity: 0; }
        }
        @keyframes pulse {
          0%, 100% { opacity: 0.4; }
          50% { opacity: 1; }
        }
      `}</style>

      {/* Transition overlay when entering a region */}
      {isTransitioning && transitionTarget && (
        <div style={{
          position: "absolute",
          inset: 0,
          zIndex: 100,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: `radial-gradient(circle, ${transitionTarget.color}44 0%, rgba(0,0,0,0.9) 100%)`,
          animation: "zoomIn 1s ease-in-out forwards",
        }}>
          <div style={{ fontSize: 14, color: transitionTarget.color, letterSpacing: "0.2em", marginBottom: 16, textShadow: `0 0 20px ${transitionTarget.color}` }}>
            ENTERING
          </div>
          <div style={{ fontSize: 20, color: "#fff", letterSpacing: "0.15em", textShadow: `0 0 30px ${transitionTarget.color}` }}>
            {transitionTarget.name.toUpperCase()}
          </div>
          <div style={{ marginTop: 24, display: "flex", gap: 8 }}>
            {[0, 1, 2].map(i => (
              <div key={i} style={{ width: 8, height: 8, background: transitionTarget.color, animation: `pulse 0.6s ease-in-out ${i * 0.15}s infinite` }} />
            ))}
          </div>
        </div>
      )}

      <PixelSkyBackground panX={pan.x} panY={pan.y} />

      <svg ref={svgRef} width="100%" height="100%" viewBox="0 0 900 580" onMouseDown={handleMouseDown} onMouseMove={handleMouseMove} onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp} onClick={handleMapClick} style={{ position: "absolute", inset: 0, cursor: placementMode ? "crosshair" : dragging ? "grabbing" : "grab" }}>
        <g transform={`translate(${pan.x * 0.8},${pan.y * 0.8})`}>
          {paths.map((path, i) => <PathLine key={i} path={path} projects={projects} />)}

          {projects.map(project => (
            <g 
              key={project.id} 
              onMouseDown={(e) => handleIslandMouseDown(e, project)}
              onDoubleClick={() => handleEnterRegion(project)}
              onContextMenu={(e) => {
                e.preventDefault();
                if (project.status !== "PLANNING" && project.status !== "PAUSED") {
                  setIssueModal({ project });
                }
              }}
              style={{ 
                cursor: project.status === "PLANNING" || project.status === "PAUSED" 
                  ? "not-allowed" 
                  : draggingIsland === project.id 
                    ? "grabbing" 
                    : "grab" 
              }}
            >
              <TerrainShape project={project} />
              <ProjectLabel project={project} />
              <BossNode project={project} />
            </g>
          ))}

          {issues.map(issue => (
            <IssueNode
              key={issue.id}
              issue={issue}
              isSelected={selected?.id === issue.id}
              isHovered={hoveredIssue === issue.id}
              onClick={() => setSelected(issue)}
              onHover={() => !dragging && setHoveredIssue(issue.id)}
              onLeave={() => setHoveredIssue(null)}
              onDoubleClick={() => {
                const proj = projects.find(p => p.id === issue.projectId);
                if (proj) setIssueModal({ issue, project: proj });
              }}
              projects={projects}
            />
          ))}

          <PlayerMarker projects={projects} />

          {/* Ghost preview for placement mode */}
          {placementMode && ghostPosition && (
            <g opacity={0.6} style={{ pointerEvents: "none" }}>
              <ellipse cx={ghostPosition.x + 100} cy={ghostPosition.y + 75} rx={95} ry={70} fill="#4ade80" stroke="#22c55e" strokeWidth={3} strokeDasharray="8 4" />
              <text x={ghostPosition.x + 100} y={ghostPosition.y + 80} textAnchor="middle" fontSize={10} fill="white" fontFamily="'Press Start 2P', monospace">
                CLICK TO PLACE
              </text>
            </g>
          )}
        </g>
      </svg>

      <HUD issues={issues} />
      <MusicPlayer />

      <div style={{ position: "absolute", bottom: 16, left: 16, fontSize: 7, color: "rgba(255,255,255,0.35)", letterSpacing: "0.1em", fontFamily: "'Press Start 2P', monospace" }}>
        DRAG TO MOVE · CLICK QUESTS · DOUBLE-CLICK TO ENTER · RIGHT-CLICK TO ADD QUEST
      </div>

      {selected && (
        <DetailPanel
          issue={selected}
          projects={projects}
          users={users}
          dependencies={dependencies}
          issues={issues}
          onClose={() => setSelected(null)}
          onNavigate={setSelected}
          onEdit={() => {
            const proj = projects.find(p => p.id === selected.projectId);
            if (proj) setIssueModal({ issue: selected, project: proj });
          }}
        />
      )}

      <FloatingActionButton
        onCreateProject={() => setPlacementMode(true)}
        onCreateIssue={() => activeProject && setIssueModal({ project: activeProject })}
      />

      {/* Placement mode overlay hint */}
      {placementMode && (
        <div style={{
          position: "absolute",
          top: 20,
          left: "50%",
          transform: "translateX(-50%)",
          background: "rgba(0,0,0,0.85)",
          padding: "12px 24px",
          borderRadius: 8,
          border: "2px solid #4ade80",
          fontFamily: "'Press Start 2P', monospace",
          fontSize: 10,
          color: "#4ade80",
          zIndex: 100,
          display: "flex",
          alignItems: "center",
          gap: 16,
        }}>
          <span>📍 CLICK ON MAP TO PLACE NEW REGION</span>
          <button
            onClick={() => { setPlacementMode(false); setGhostPosition(null); }}
            style={{ background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.2)", borderRadius: 4, padding: "4px 12px", color: "rgba(255,255,255,0.7)", fontSize: 8, cursor: "pointer" }}
          >
            CANCEL
          </button>
        </div>
      )}

      {projectModal && (
        <ProjectModal
          project={projectModal.project}
          users={users}
          existingProjects={projects}
          initialPosition={projectModal.position}
          onSave={(data) => {
            if (projectModal.project) {
              updateProject(projectModal.project.id, data);
            } else {
              createProject(data as Omit<Project, "id">);
            }
          }}
          onDelete={projectModal.project ? () => deleteProject(projectModal.project!.id) : undefined}
          onClose={() => setProjectModal(null)}
        />
      )}

      {issueModal && (
        <IssueModal
          issue={issueModal.issue}
          project={issueModal.project}
          users={users}
          onSave={(data) => {
            if (issueModal.issue) {
              updateIssue(issueModal.issue.id, data);
              if (selected?.id === issueModal.issue.id) {
                setSelected({ ...selected, ...data } as Issue);
              }
            } else {
              createIssue(data as Omit<Issue, "id" | "key">);
            }
          }}
          onDelete={issueModal.issue ? () => {
            deleteIssue(issueModal.issue!.id);
            if (selected?.id === issueModal.issue!.id) setSelected(null);
          } : undefined}
          onClose={() => setIssueModal(null)}
        />
      )}
    </div>
  );
}
