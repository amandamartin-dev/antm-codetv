"use client";

import { useState, useEffect, useMemo } from "react";
import type { Project, Issue, IssueStatus, IssuePriority, ProjectStatus, TerrainType, User } from "./types";

// ══════════════════════════════════════════════════════════════════════════════
// SHARED STYLES
// ══════════════════════════════════════════════════════════════════════════════

const modalOverlayStyle: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  background: "rgba(0,0,0,0.7)",
  backdropFilter: "blur(4px)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 1000,
};

const modalStyle: React.CSSProperties = {
  background: "rgba(15, 23, 42, 0.98)",
  border: "1px solid rgba(255,255,255,0.1)",
  borderRadius: 12,
  padding: 24,
  width: 400,
  maxHeight: "80vh",
  overflowY: "auto",
  fontFamily: "'Press Start 2P', monospace",
};

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: 8,
  color: "rgba(255,255,255,0.5)",
  marginBottom: 6,
  letterSpacing: "0.1em",
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "10px 12px",
  background: "rgba(255,255,255,0.05)",
  border: "1px solid rgba(255,255,255,0.1)",
  borderRadius: 6,
  color: "#fff",
  fontSize: 12,
  fontFamily: "inherit",
  marginBottom: 16,
};

const selectStyle: React.CSSProperties = {
  ...inputStyle,
  cursor: "pointer",
};

const buttonStyle: React.CSSProperties = {
  padding: "10px 16px",
  borderRadius: 6,
  border: "none",
  fontSize: 8,
  fontFamily: "'Press Start 2P', monospace",
  cursor: "pointer",
  letterSpacing: "0.1em",
};

const primaryButtonStyle: React.CSSProperties = {
  ...buttonStyle,
  background: "#22c55e",
  color: "#000",
};

const secondaryButtonStyle: React.CSSProperties = {
  ...buttonStyle,
  background: "rgba(255,255,255,0.1)",
  color: "#fff",
};

const dangerButtonStyle: React.CSSProperties = {
  ...buttonStyle,
  background: "#ef4444",
  color: "#fff",
};

// ══════════════════════════════════════════════════════════════════════════════
// TERRAIN CONFIG
// ══════════════════════════════════════════════════════════════════════════════

const TERRAIN_OPTIONS: { value: TerrainType; label: string; color: string; shade: string }[] = [
  { value: "grass", label: "🌲 Forest", color: "#4a8c3f", shade: "#2d5a27" },
  { value: "desert", label: "🌵 Desert", color: "#c8883a", shade: "#8a5a1f" },
  { value: "water", label: "🌊 Ocean", color: "#3a7bbf", shade: "#1a4a80" },
  { value: "mountain", label: "⛰️ Mountain", color: "#7a5fa0", shade: "#4a3060" },
  { value: "lava", label: "🌋 Volcano", color: "#c2410c", shade: "#7c2d12" },
  { value: "cloud", label: "☁️ Sky", color: "#e0e7ff", shade: "#a5b4fc" },
];

const STATUS_OPTIONS: { value: ProjectStatus; label: string }[] = [
  { value: "PLANNING", label: "🔒 Planning" },
  { value: "ACTIVE", label: "▶ Active" },
  { value: "PAUSED", label: "⏸ Paused" },
  { value: "COMPLETED", label: "★ Completed" },
];

const ISSUE_STATUS_OPTIONS: { value: IssueStatus; label: string }[] = [
  { value: "BACKLOG", label: "○ Backlog" },
  { value: "TODO", label: "◇ Todo" },
  { value: "IN_PROGRESS", label: "▶ In Progress" },
  { value: "IN_REVIEW", label: "◈ In Review" },
  { value: "DONE", label: "★ Done" },
  { value: "CANCELLED", label: "✕ Cancelled" },
];

const PRIORITY_OPTIONS: { value: IssuePriority; label: string }[] = [
  { value: "URGENT", label: "🔥 Urgent" },
  { value: "HIGH", label: "⚡ High" },
  { value: "MEDIUM", label: "● Medium" },
  { value: "LOW", label: "○ Low" },
  { value: "NONE", label: "· None" },
];

const SIZE_OPTIONS = [
  { value: "S", label: "S - Small" },
  { value: "M", label: "M - Medium" },
  { value: "L", label: "L - Large" },
];

// ══════════════════════════════════════════════════════════════════════════════
// PROJECT MODAL
// ══════════════════════════════════════════════════════════════════════════════

interface ProjectModalProps {
  project?: Project;
  users: User[];
  existingProjects?: Project[];
  initialPosition?: { x: number; y: number };
  onSave: (data: Omit<Project, "id"> | Partial<Project>) => void;
  onDelete?: () => void;
  onClose: () => void;
}

export function ProjectModal({ project, users, existingProjects, initialPosition, onSave, onDelete, onClose }: ProjectModalProps) {
  const isEditing = !!project;
  
  const [name, setName] = useState(project?.name || "");
  const [key, setKey] = useState(project?.key || "");
  const [status, setStatus] = useState<ProjectStatus>(project?.status || "PLANNING");
  const [terrain, setTerrain] = useState<TerrainType>(project?.terrain || "grass");
  const [leadUserId, setLeadUserId] = useState(project?.leadUserId || "");
  
  // Use initialPosition if provided (from click-to-place), otherwise calculate
  const defaultPosition = useMemo(() => {
    if (project) return { x: project.x, y: project.y };
    if (initialPosition) return initialPosition;
    if (!existingProjects || existingProjects.length === 0) return { x: 100, y: 200 };
    
    // Fallback: find the rightmost project
    let maxRight = 0;
    let rightmostProject: Project | null = null;
    for (const p of existingProjects) {
      const right = p.x + p.w;
      if (right > maxRight) {
        maxRight = right;
        rightmostProject = p;
      }
    }
    
    return {
      x: maxRight + 50,
      y: rightmostProject ? rightmostProject.y : 200,
    };
  }, [project, existingProjects, initialPosition]);
  
  const [x] = useState(defaultPosition.x);
  const [y] = useState(defaultPosition.y);
  const [w] = useState(project?.w || 200);
  const [h] = useState(project?.h || 150);

  const terrainConfig = TERRAIN_OPTIONS.find(t => t.value === terrain);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !key.trim()) return;

    const data = {
      name: name.trim(),
      key: key.trim().toUpperCase(),
      status,
      terrain,
      leadUserId: leadUserId || undefined,
      x,
      y,
      w,
      h,
      color: terrainConfig?.color || "#4a8c3f",
      shade: terrainConfig?.shade || "#2d5a27",
    };

    onSave(isEditing ? data : data as Omit<Project, "id">);
    onClose();
  };

  return (
    <div style={modalOverlayStyle} onClick={onClose}>
      <form style={modalStyle} onClick={e => e.stopPropagation()} onSubmit={handleSubmit}>
        <h2 style={{ fontSize: 10, color: "#fff", marginBottom: 20, letterSpacing: "0.1em" }}>
          {isEditing ? "EDIT REGION" : "NEW REGION"}
        </h2>

        <label style={labelStyle}>NAME</label>
        <input
          style={inputStyle}
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="Auth Castle"
          autoFocus
        />

        <label style={labelStyle}>KEY</label>
        <input
          style={inputStyle}
          value={key}
          onChange={e => setKey(e.target.value.toUpperCase())}
          placeholder="AUTH"
          maxLength={8}
          disabled={isEditing}
        />

        <label style={labelStyle}>TERRAIN</label>
        <select
          style={selectStyle}
          value={terrain}
          onChange={e => setTerrain(e.target.value as TerrainType)}
        >
          {TERRAIN_OPTIONS.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>

        <label style={labelStyle}>STATUS</label>
        <select
          style={selectStyle}
          value={status}
          onChange={e => setStatus(e.target.value as ProjectStatus)}
        >
          {STATUS_OPTIONS.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>

        <label style={labelStyle}>LEAD</label>
        <select
          style={selectStyle}
          value={leadUserId}
          onChange={e => setLeadUserId(e.target.value)}
        >
          <option value="">-- None --</option>
          {users.map(user => (
            <option key={user.id} value={user.id}>{user.name}</option>
          ))}
        </select>

        <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
          <button type="submit" style={primaryButtonStyle}>
            {isEditing ? "SAVE" : "CREATE"}
          </button>
          <button type="button" style={secondaryButtonStyle} onClick={onClose}>
            CANCEL
          </button>
          {isEditing && onDelete && (
            <button
              type="button"
              style={{ ...dangerButtonStyle, marginLeft: "auto" }}
              onClick={() => {
                if (confirm("Delete this region and all its quests?")) {
                  onDelete();
                  onClose();
                }
              }}
            >
              DELETE
            </button>
          )}
        </div>
      </form>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// ISSUE MODAL
// ══════════════════════════════════════════════════════════════════════════════

interface IssueModalProps {
  issue?: Issue;
  project: Project;
  users: User[];
  onSave: (data: Omit<Issue, "id" | "key"> | Partial<Issue>) => void;
  onDelete?: () => void;
  onClose: () => void;
}

export function IssueModal({ issue, project, users, onSave, onDelete, onClose }: IssueModalProps) {
  const isEditing = !!issue;
  
  const [title, setTitle] = useState(issue?.title || "");
  const [description, setDescription] = useState(issue?.description || "");
  const [status, setStatus] = useState<IssueStatus>(issue?.status || "TODO");
  const [priority, setPriority] = useState<IssuePriority>(issue?.priority || "MEDIUM");
  const [size, setSize] = useState<"S" | "M" | "L">(issue?.size || "M");
  const [assigneeUserId, setAssigneeUserId] = useState(issue?.assigneeUserId || "");
  
  // Position - center of project region for new issues
  const [x] = useState(issue?.x || project.x + project.w / 2);
  const [y] = useState(issue?.y || project.y + project.h / 2);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const data = {
      title: title.trim(),
      description: description.trim() || undefined,
      status,
      priority,
      size,
      assigneeUserId: assigneeUserId || undefined,
      projectId: project.id,
      x,
      y,
    };

    onSave(data);
    onClose();
  };

  return (
    <div style={modalOverlayStyle} onClick={onClose}>
      <form style={modalStyle} onClick={e => e.stopPropagation()} onSubmit={handleSubmit}>
        <div style={{ fontSize: 7, color: "rgba(255,255,255,0.4)", marginBottom: 4, letterSpacing: "0.1em" }}>
          {project.name.toUpperCase()}
        </div>
        <h2 style={{ fontSize: 10, color: "#fff", marginBottom: 20, letterSpacing: "0.1em" }}>
          {isEditing ? `EDIT ${issue.key}` : "NEW QUEST"}
        </h2>

        <label style={labelStyle}>TITLE</label>
        <input
          style={inputStyle}
          value={title}
          onChange={e => setTitle(e.target.value)}
          placeholder="Implement feature..."
          autoFocus
        />

        <label style={labelStyle}>DESCRIPTION</label>
        <textarea
          style={{ ...inputStyle, minHeight: 60, resize: "vertical" }}
          value={description}
          onChange={e => setDescription(e.target.value)}
          placeholder="Optional details..."
        />

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div>
            <label style={labelStyle}>STATUS</label>
            <select
              style={selectStyle}
              value={status}
              onChange={e => setStatus(e.target.value as IssueStatus)}
            >
              {ISSUE_STATUS_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label style={labelStyle}>PRIORITY</label>
            <select
              style={selectStyle}
              value={priority}
              onChange={e => setPriority(e.target.value as IssuePriority)}
            >
              {PRIORITY_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div>
            <label style={labelStyle}>SIZE</label>
            <select
              style={selectStyle}
              value={size}
              onChange={e => setSize(e.target.value as "S" | "M" | "L")}
            >
              {SIZE_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label style={labelStyle}>ASSIGNEE</label>
            <select
              style={selectStyle}
              value={assigneeUserId}
              onChange={e => setAssigneeUserId(e.target.value)}
            >
              <option value="">-- Unassigned --</option>
              {users.map(user => (
                <option key={user.id} value={user.id}>{user.name}</option>
              ))}
            </select>
          </div>
        </div>

        <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
          <button type="submit" style={primaryButtonStyle}>
            {isEditing ? "SAVE" : "CREATE"}
          </button>
          <button type="button" style={secondaryButtonStyle} onClick={onClose}>
            CANCEL
          </button>
          {isEditing && onDelete && (
            <button
              type="button"
              style={{ ...dangerButtonStyle, marginLeft: "auto" }}
              onClick={() => {
                if (confirm("Delete this quest?")) {
                  onDelete();
                  onClose();
                }
              }}
            >
              DELETE
            </button>
          )}
        </div>
      </form>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// FLOATING ACTION BUTTON
// ══════════════════════════════════════════════════════════════════════════════

interface FABProps {
  onCreateProject: () => void;
  onCreateIssue: () => void;
  disabled?: boolean;
}

export function FloatingActionButton({ onCreateProject, onCreateIssue, disabled }: FABProps) {
  const [isOpen, setIsOpen] = useState(false);

  if (disabled) return null;

  return (
    <div style={{ position: "absolute", bottom: 24, right: 24, zIndex: 100 }}>
      {isOpen && (
        <div style={{
          position: "absolute",
          bottom: 60,
          right: 0,
          display: "flex",
          flexDirection: "column",
          gap: 8,
        }}>
          <button
            onClick={() => { onCreateProject(); setIsOpen(false); }}
            style={{
              ...buttonStyle,
              background: "rgba(15, 23, 42, 0.95)",
              color: "#fff",
              border: "1px solid rgba(255,255,255,0.1)",
              whiteSpace: "nowrap",
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <span>🗺️</span> NEW REGION
          </button>
          <button
            onClick={() => { onCreateIssue(); setIsOpen(false); }}
            style={{
              ...buttonStyle,
              background: "rgba(15, 23, 42, 0.95)",
              color: "#fff",
              border: "1px solid rgba(255,255,255,0.1)",
              whiteSpace: "nowrap",
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <span>⭐</span> NEW QUEST
          </button>
        </div>
      )}
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          width: 48,
          height: 48,
          borderRadius: "50%",
          background: isOpen ? "#ef4444" : "#22c55e",
          border: "none",
          color: "#fff",
          fontSize: 20,
          cursor: "pointer",
          boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
          transition: "transform 0.2s, background 0.2s",
          transform: isOpen ? "rotate(45deg)" : "none",
        }}
      >
        +
      </button>
    </div>
  );
}
