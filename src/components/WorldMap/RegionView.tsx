"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import type { Project, Issue, User, IssueDependency } from "./types";

// ══════════════════════════════════════════════════════════════════════════════
// CONFIG
// ══════════════════════════════════════════════════════════════════════════════

const STATUS_CONFIG = {
  DONE: { color: "#5fc45a", glow: "#2d5a2d" },
  IN_REVIEW: { color: "#a855f7", glow: "#4a2d6a" },
  IN_PROGRESS: { color: "#f5c842", glow: "#6a5a2d" },
  TODO: { color: "#6366f1", glow: "#2d2d6a" },
  BACKLOG: { color: "#aaaacc", glow: "#3a3a4a" },
  CANCELLED: { color: "#ef4444", glow: "#4a2d2d" },
};

const TERRAIN_PALETTES = {
  grass: {
    ground: ["#3d6b35", "#4a8c3f", "#5a9c4f"],
    accent: "#2d4a25",
    decorations: ["tree", "bush", "flower", "rock"],
    sky: ["#87CEEB", "#5b9bd4"],
  },
  desert: {
    ground: ["#c8883a", "#d4a04a", "#e0b85a"],
    accent: "#a86020",
    decorations: ["cactus", "skull", "tumbleweed", "dune"],
    sky: ["#f4d03f", "#e8c547"],
  },
  water: {
    ground: ["#2a5a9f", "#3a7bbf", "#4a8bcf"],
    accent: "#1a4a7f",
    decorations: ["coral", "seaweed", "shell", "bubble"],
    sky: ["#1a3a5f", "#2a4a7f"],
  },
  mountain: {
    ground: ["#5a4a6a", "#7a5fa0", "#8a6fb0"],
    accent: "#4a3a5a",
    decorations: ["crystal", "peak", "boulder", "cave"],
    sky: ["#4a3a6a", "#6a5a8a"],
  },
  lava: {
    ground: ["#4a2a1a", "#5a3a2a", "#3a1a0a"],
    accent: "#c2410c",
    decorations: ["geyser", "obsidian", "ember", "crack"],
    sky: ["#2a1a0a", "#4a2a1a"],
  },
  cloud: {
    ground: ["#c0d0f0", "#d0e0ff", "#e0f0ff"],
    accent: "#a0b0d0",
    decorations: ["platform", "rainbow", "star", "wisp"],
    sky: ["#a0c0f0", "#c0d8ff"],
  },
};

// ══════════════════════════════════════════════════════════════════════════════
// PIXEL ART SVG COMPONENTS
// ══════════════════════════════════════════════════════════════════════════════

// Pixel art tree (for grass terrain)
function PixelTree({ x, y, scale = 1 }: { x: number; y: number; scale?: number }) {
  const s = 4 * scale;
  return (
    <g transform={`translate(${x}, ${y})`}>
      {/* Trunk */}
      <rect x={s * 2} y={s * 5} width={s * 2} height={s * 3} fill="#5d4037" />
      <rect x={s * 2} y={s * 5} width={s} height={s * 3} fill="#6d5047" />
      {/* Foliage */}
      <rect x={s * 1} y={s * 2} width={s * 4} height={s * 3} fill="#2e7d32" />
      <rect x={s * 0} y={s * 3} width={s * 6} height={s * 2} fill="#388e3c" />
      <rect x={s * 2} y={s * 1} width={s * 2} height={s} fill="#43a047" />
      {/* Highlights */}
      <rect x={s * 1} y={s * 2} width={s} height={s} fill="#4caf50" />
      <rect x={s * 2} y={s * 1} width={s} height={s} fill="#66bb6a" />
    </g>
  );
}

// Pixel art bush
function PixelBush({ x, y, scale = 1 }: { x: number; y: number; scale?: number }) {
  const s = 3 * scale;
  return (
    <g transform={`translate(${x}, ${y})`}>
      <rect x={s * 0} y={s * 1} width={s * 4} height={s * 2} fill="#388e3c" />
      <rect x={s * 1} y={s * 0} width={s * 2} height={s} fill="#43a047" />
      <rect x={s * 0} y={s * 1} width={s} height={s} fill="#4caf50" />
    </g>
  );
}

// Pixel art flower
function PixelFlower({ x, y, color = "#e91e63" }: { x: number; y: number; color?: string }) {
  const s = 2;
  return (
    <g transform={`translate(${x}, ${y})`}>
      <rect x={s * 1} y={s * 2} width={s} height={s * 2} fill="#4caf50" />
      <rect x={s * 0} y={s * 0} width={s} height={s} fill={color} />
      <rect x={s * 2} y={s * 0} width={s} height={s} fill={color} />
      <rect x={s * 1} y={s * 1} width={s} height={s} fill="#ffeb3b" />
      <rect x={s * 0} y={s * 1} width={s} height={s} fill={color} />
      <rect x={s * 2} y={s * 1} width={s} height={s} fill={color} />
    </g>
  );
}

// Pixel art rock
function PixelRock({ x, y, scale = 1 }: { x: number; y: number; scale?: number }) {
  const s = 3 * scale;
  return (
    <g transform={`translate(${x}, ${y})`}>
      <rect x={s * 0} y={s * 2} width={s * 4} height={s} fill="#5d5d5d" />
      <rect x={s * 1} y={s * 1} width={s * 3} height={s} fill="#757575" />
      <rect x={s * 1} y={s * 0} width={s * 2} height={s} fill="#9e9e9e" />
      <rect x={s * 1} y={s * 1} width={s} height={s} fill="#bdbdbd" />
    </g>
  );
}

// Pixel art cactus (for desert)
function PixelCactus({ x, y, scale = 1 }: { x: number; y: number; scale?: number }) {
  const s = 4 * scale;
  return (
    <g transform={`translate(${x}, ${y})`}>
      {/* Main stem */}
      <rect x={s * 2} y={s * 1} width={s * 2} height={s * 6} fill="#2e7d32" />
      <rect x={s * 2} y={s * 1} width={s} height={s * 6} fill="#388e3c" />
      {/* Left arm */}
      <rect x={s * 0} y={s * 2} width={s * 2} height={s} fill="#388e3c" />
      <rect x={s * 0} y={s * 1} width={s} height={s * 2} fill="#2e7d32" />
      {/* Right arm */}
      <rect x={s * 4} y={s * 3} width={s * 2} height={s} fill="#388e3c" />
      <rect x={s * 5} y={s * 2} width={s} height={s * 2} fill="#2e7d32" />
      {/* Highlights */}
      <rect x={s * 2} y={s * 1} width={s} height={s} fill="#4caf50" />
    </g>
  );
}

// Pixel art skull (for desert)
function PixelSkull({ x, y }: { x: number; y: number }) {
  const s = 3;
  return (
    <g transform={`translate(${x}, ${y})`}>
      <rect x={s * 0} y={s * 0} width={s * 4} height={s * 3} fill="#f5f5f5" />
      <rect x={s * 1} y={s * 3} width={s * 2} height={s} fill="#e0e0e0" />
      <rect x={s * 0} y={s * 1} width={s} height={s} fill="#424242" />
      <rect x={s * 3} y={s * 1} width={s} height={s} fill="#424242" />
      <rect x={s * 1} y={s * 2} width={s} height={s} fill="#bdbdbd" />
      <rect x={s * 2} y={s * 2} width={s} height={s} fill="#bdbdbd" />
    </g>
  );
}

// Pixel art coral (for water)
function PixelCoral({ x, y, color = "#e91e63" }: { x: number; y: number; color?: string }) {
  const s = 3;
  return (
    <g transform={`translate(${x}, ${y})`}>
      <rect x={s * 1} y={s * 3} width={s * 2} height={s * 2} fill={color} />
      <rect x={s * 0} y={s * 1} width={s} height={s * 3} fill={color} />
      <rect x={s * 3} y={s * 2} width={s} height={s * 2} fill={color} />
      <rect x={s * 1} y={s * 0} width={s} height={s * 2} fill={color} />
      <rect x={s * 2} y={s * 1} width={s} height={s} fill={color} />
    </g>
  );
}

// Pixel art crystal (for mountain)
function PixelCrystal({ x, y, color = "#9c27b0" }: { x: number; y: number; color?: string }) {
  const s = 3;
  const light = color === "#9c27b0" ? "#ce93d8" : "#90caf9";
  return (
    <g transform={`translate(${x}, ${y})`}>
      <rect x={s * 1} y={s * 0} width={s * 2} height={s * 5} fill={color} />
      <rect x={s * 0} y={s * 2} width={s} height={s * 3} fill={color} />
      <rect x={s * 3} y={s * 1} width={s} height={s * 4} fill={color} />
      <rect x={s * 1} y={s * 0} width={s} height={s * 2} fill={light} />
      <rect x={s * 3} y={s * 1} width={s} height={s} fill={light} />
    </g>
  );
}

// Pixel art fire geyser (for lava)
function PixelGeyser({ x, y }: { x: number; y: number }) {
  const s = 3;
  return (
    <g transform={`translate(${x}, ${y})`}>
      {/* Base rocks */}
      <rect x={s * 0} y={s * 4} width={s * 5} height={s} fill="#424242" />
      <rect x={s * 1} y={s * 3} width={s * 3} height={s} fill="#616161" />
      {/* Fire */}
      <rect x={s * 2} y={s * 0} width={s} height={s * 3} fill="#ff5722" />
      <rect x={s * 1} y={s * 1} width={s} height={s * 2} fill="#ff9800" />
      <rect x={s * 3} y={s * 2} width={s} height={s} fill="#ffeb3b" />
      <rect x={s * 2} y={s * 0} width={s} height={s} fill="#ffeb3b" />
    </g>
  );
}

// Pixel art floating platform (for cloud)
function PixelPlatform({ x, y, scale = 1 }: { x: number; y: number; scale?: number }) {
  const s = 4 * scale;
  return (
    <g transform={`translate(${x}, ${y})`}>
      <rect x={s * 0} y={s * 1} width={s * 6} height={s * 2} fill="#e0e0e0" />
      <rect x={s * 1} y={s * 0} width={s * 4} height={s} fill="#f5f5f5" />
      <rect x={s * 0} y={s * 2} width={s * 6} height={s} fill="#bdbdbd" />
      <rect x={s * 1} y={s * 0} width={s * 2} height={s} fill="#ffffff" />
    </g>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// BUILDING COMPONENTS (Issues as structures)
// ══════════════════════════════════════════════════════════════════════════════

// Tower - TODO status (quest waiting to be started)
function PixelTower({ x, y, color, scale = 1 }: { x: number; y: number; color: string; scale?: number }) {
  const s = 4 * scale;
  const dark = "#4a4a5a";
  const mid = "#6a6a7a";
  const light = "#8a8a9a";
  return (
    <g transform={`translate(${x}, ${y})`}>
      {/* Shadow */}
      <ellipse cx={s * 4} cy={s * 10 + 4} rx={s * 3} ry={s * 0.8} fill="rgba(0,0,0,0.3)" />
      {/* Base */}
      <rect x={s * 1} y={s * 7} width={s * 6} height={s * 3} fill={dark} />
      <rect x={s * 1} y={s * 7} width={s * 2} height={s * 3} fill={mid} />
      {/* Tower body */}
      <rect x={s * 2} y={s * 2} width={s * 4} height={s * 5} fill={mid} />
      <rect x={s * 2} y={s * 2} width={s * 1.5} height={s * 5} fill={light} />
      {/* Roof */}
      <rect x={s * 1} y={s * 1} width={s * 6} height={s} fill={dark} />
      <rect x={s * 2} y={s * 0} width={s * 4} height={s} fill={mid} />
      <rect x={s * 3} y={-s} width={s * 2} height={s} fill={color} />
      {/* Window */}
      <rect x={s * 3} y={s * 4} width={s * 2} height={s * 2} fill="#1a1a2e" />
      <rect x={s * 3} y={s * 4} width={s} height={s} fill="#2a2a4e" />
      {/* Flag */}
      <rect x={s * 3.5} y={-s * 2} width={s * 0.5} height={s * 2} fill="#5d4037" />
      <rect x={s * 4} y={-s * 2} width={s * 2} height={s} fill={color} />
    </g>
  );
}

// Workshop - IN_PROGRESS status (actively being worked on)
function PixelWorkshop({ x, y, color, scale = 1 }: { x: number; y: number; color: string; scale?: number }) {
  const s = 4 * scale;
  return (
    <g transform={`translate(${x}, ${y})`}>
      {/* Shadow */}
      <ellipse cx={s * 5} cy={s * 8 + 4} rx={s * 4} ry={s} fill="rgba(0,0,0,0.3)" />
      {/* Main building */}
      <rect x={s * 1} y={s * 4} width={s * 8} height={s * 4} fill="#8d6e63" />
      <rect x={s * 1} y={s * 4} width={s * 3} height={s * 4} fill="#a1887f" />
      {/* Roof */}
      <rect x={s * 0} y={s * 3} width={s * 10} height={s} fill="#5d4037" />
      <rect x={s * 1} y={s * 2} width={s * 8} height={s} fill="#6d5047" />
      <rect x={s * 2} y={s * 1} width={s * 6} height={s} fill="#7d6057" />
      {/* Chimney with smoke */}
      <rect x={s * 7} y={s * 0} width={s * 2} height={s * 2} fill="#5d4037" />
      <rect x={s * 7.5} y={-s} width={s} height={s} fill="#9e9e9e" opacity={0.6} />
      <rect x={s * 8} y={-s * 1.5} width={s * 0.8} height={s * 0.8} fill="#bdbdbd" opacity={0.4} />
      {/* Door */}
      <rect x={s * 4} y={s * 5} width={s * 2} height={s * 3} fill="#3e2723" />
      <rect x={s * 4} y={s * 5} width={s} height={s * 3} fill="#4e3733" />
      {/* Window */}
      <rect x={s * 1.5} y={s * 5} width={s * 1.5} height={s * 1.5} fill="#ffeb3b" />
      <rect x={s * 7} y={s * 5} width={s * 1.5} height={s * 1.5} fill="#ffeb3b" />
      {/* Work indicator glow */}
      <rect x={s * 1.5} y={s * 5} width={s * 0.5} height={s * 1.5} fill="#fff59d" />
      {/* Status banner */}
      <rect x={s * 3} y={s * 0.5} width={s * 4} height={s * 0.8} fill={color} />
    </g>
  );
}

// Castle - DONE status (completed quest)
function PixelCastle({ x, y, color, scale = 1 }: { x: number; y: number; color: string; scale?: number }) {
  const s = 4 * scale;
  return (
    <g transform={`translate(${x}, ${y})`}>
      {/* Shadow */}
      <ellipse cx={s * 5} cy={s * 10 + 4} rx={s * 5} ry={s * 1.2} fill="rgba(0,0,0,0.3)" />
      {/* Main wall */}
      <rect x={s * 1} y={s * 5} width={s * 8} height={s * 5} fill="#78909c" />
      <rect x={s * 1} y={s * 5} width={s * 3} height={s * 5} fill="#90a4ae" />
      {/* Towers */}
      <rect x={s * 0} y={s * 2} width={s * 2} height={s * 8} fill="#607d8b" />
      <rect x={s * 0} y={s * 2} width={s} height={s * 8} fill="#78909c" />
      <rect x={s * 8} y={s * 2} width={s * 2} height={s * 8} fill="#607d8b" />
      {/* Battlements */}
      <rect x={s * 0} y={s * 1} width={s} height={s} fill="#546e7a" />
      <rect x={s * 1} y={s * 1} width={s} height={s} fill="#607d8b" />
      <rect x={s * 8} y={s * 1} width={s} height={s} fill="#546e7a" />
      <rect x={s * 9} y={s * 1} width={s} height={s} fill="#607d8b" />
      <rect x={s * 2} y={s * 4} width={s} height={s} fill="#78909c" />
      <rect x={s * 4} y={s * 4} width={s} height={s} fill="#78909c" />
      <rect x={s * 6} y={s * 4} width={s} height={s} fill="#78909c" />
      {/* Gate */}
      <rect x={s * 3} y={s * 6} width={s * 4} height={s * 4} fill="#37474f" />
      <rect x={s * 3} y={s * 6} width={s * 2} height={s * 4} fill="#455a64" />
      {/* Gate details */}
      <rect x={s * 3.5} y={s * 7} width={s * 0.5} height={s * 3} fill="#263238" />
      <rect x={s * 5} y={s * 7} width={s * 0.5} height={s * 3} fill="#263238" />
      <rect x={s * 6} y={s * 7} width={s * 0.5} height={s * 3} fill="#263238" />
      {/* Victory banner */}
      <rect x={s * 4} y={s * 0} width={s * 0.5} height={s * 4} fill="#5d4037" />
      <rect x={s * 4.5} y={s * 0} width={s * 3} height={s * 2} fill={color} />
      <rect x={s * 4.5} y={s * 0} width={s * 3} height={s} fill="#81c784" />
    </g>
  );
}

// Ruins - CANCELLED status
function PixelRuins({ x, y, scale = 1 }: { x: number; y: number; scale?: number }) {
  const s = 4 * scale;
  return (
    <g transform={`translate(${x}, ${y})`}>
      {/* Shadow */}
      <ellipse cx={s * 4} cy={s * 7 + 4} rx={s * 4} ry={s} fill="rgba(0,0,0,0.2)" />
      {/* Broken walls */}
      <rect x={s * 0} y={s * 4} width={s * 2} height={s * 3} fill="#757575" />
      <rect x={s * 0} y={s * 3} width={s} height={s} fill="#9e9e9e" />
      <rect x={s * 5} y={s * 3} width={s * 3} height={s * 4} fill="#616161" />
      <rect x={s * 6} y={s * 2} width={s * 2} height={s} fill="#757575" />
      <rect x={s * 7} y={s * 1} width={s} height={s} fill="#9e9e9e" />
      {/* Rubble */}
      <rect x={s * 2} y={s * 6} width={s * 3} height={s} fill="#9e9e9e" />
      <rect x={s * 3} y={s * 5} width={s * 2} height={s} fill="#757575" />
      <rect x={s * 1} y={s * 5} width={s} height={s * 2} fill="#616161" />
      {/* Weeds */}
      <rect x={s * 2.5} y={s * 5} width={s * 0.5} height={s} fill="#558b2f" />
      <rect x={s * 4} y={s * 4.5} width={s * 0.5} height={s * 1.5} fill="#689f38" />
    </g>
  );
}

// Shrine - IN_REVIEW status
function PixelShrine({ x, y, color, scale = 1 }: { x: number; y: number; color: string; scale?: number }) {
  const s = 4 * scale;
  return (
    <g transform={`translate(${x}, ${y})`}>
      {/* Shadow */}
      <ellipse cx={s * 4} cy={s * 8 + 4} rx={s * 3.5} ry={s} fill="rgba(0,0,0,0.3)" />
      {/* Base platform */}
      <rect x={s * 0} y={s * 7} width={s * 8} height={s} fill="#78909c" />
      <rect x={s * 1} y={s * 6} width={s * 6} height={s} fill="#90a4ae" />
      {/* Pillars */}
      <rect x={s * 1} y={s * 2} width={s * 1.5} height={s * 4} fill="#b0bec5" />
      <rect x={s * 1} y={s * 2} width={s * 0.5} height={s * 4} fill="#cfd8dc" />
      <rect x={s * 5.5} y={s * 2} width={s * 1.5} height={s * 4} fill="#b0bec5" />
      {/* Roof */}
      <rect x={s * 0} y={s * 1} width={s * 8} height={s} fill="#607d8b" />
      <rect x={s * 1} y={s * 0} width={s * 6} height={s} fill="#78909c" />
      <rect x={s * 2} y={-s} width={s * 4} height={s} fill={color} />
      {/* Glowing orb in center */}
      <circle cx={s * 4} cy={s * 4.5} r={s} fill={color} opacity={0.3} />
      <circle cx={s * 4} cy={s * 4.5} r={s * 0.6} fill={color} />
      <circle cx={s * 3.7} cy={s * 4.2} r={s * 0.2} fill="#ffffff" />
    </g>
  );
}

// Hut - BACKLOG status (future quest)
function PixelHut({ x, y, color, scale = 1 }: { x: number; y: number; color: string; scale?: number }) {
  const s = 4 * scale;
  return (
    <g transform={`translate(${x}, ${y})`}>
      {/* Shadow */}
      <ellipse cx={s * 3.5} cy={s * 7 + 4} rx={s * 3} ry={s * 0.8} fill="rgba(0,0,0,0.25)" />
      {/* Walls */}
      <rect x={s * 1} y={s * 4} width={s * 5} height={s * 3} fill="#a1887f" />
      <rect x={s * 1} y={s * 4} width={s * 2} height={s * 3} fill="#bcaaa4" />
      {/* Roof */}
      <rect x={s * 0} y={s * 3} width={s * 7} height={s} fill="#6d4c41" />
      <rect x={s * 1} y={s * 2} width={s * 5} height={s} fill="#795548" />
      <rect x={s * 2} y={s * 1} width={s * 3} height={s} fill="#8d6e63" />
      {/* Door */}
      <rect x={s * 2.5} y={s * 5} width={s * 2} height={s * 2} fill="#4e342e" />
      <rect x={s * 2.5} y={s * 5} width={s} height={s * 2} fill="#5d4037" />
      {/* Status marker */}
      <circle cx={s * 3.5} cy={s * 0.5} r={s * 0.5} fill={color} opacity={0.6} />
    </g>
  );
}

// Get building component based on issue status
function IssueBuildingComponent({ issue, x, y, scale, onClick, isSelected }: {
  issue: Issue;
  x: number;
  y: number;
  scale: number;
  onClick: () => void;
  isSelected: boolean;
}) {
  const status = STATUS_CONFIG[issue.status];
  const sizeScale = issue.size === "L" ? 1.2 : issue.size === "M" ? 1 : 0.8;
  const finalScale = scale * sizeScale;

  const BuildingComponent = {
    TODO: PixelTower,
    IN_PROGRESS: PixelWorkshop,
    IN_REVIEW: PixelShrine,
    DONE: PixelCastle,
    BACKLOG: PixelHut,
    CANCELLED: PixelRuins,
  }[issue.status];

  return (
    <g 
      onClick={onClick} 
      style={{ cursor: "pointer" }}
      opacity={issue.status === "CANCELLED" ? 0.6 : 1}
    >
      {/* Selection ring */}
      {isSelected && (
        <ellipse
          cx={x + 20 * finalScale}
          cy={y + 40 * finalScale}
          rx={30 * finalScale}
          ry={12 * finalScale}
          fill="none"
          stroke="#ffffff"
          strokeWidth={2}
          strokeDasharray="4 2"
        >
          <animate attributeName="stroke-dashoffset" values="0;12" dur="1s" repeatCount="indefinite" />
        </ellipse>
      )}
      
      {/* Active glow for IN_PROGRESS */}
      {issue.status === "IN_PROGRESS" && (
        <ellipse
          cx={x + 20 * finalScale}
          cy={y + 40 * finalScale}
          rx={35 * finalScale}
          ry={15 * finalScale}
          fill={status.color}
          opacity={0.15}
        >
          <animate attributeName="opacity" values="0.1;0.25;0.1" dur="2s" repeatCount="indefinite" />
        </ellipse>
      )}

      <BuildingComponent x={x} y={y} color={status.color} scale={finalScale} />
      
      {/* Issue label */}
      <text
        x={x + 20 * finalScale}
        y={y + 55 * finalScale}
        textAnchor="middle"
        fontSize={8}
        fill="rgba(255,255,255,0.9)"
        fontFamily="'Press Start 2P', monospace"
        style={{ textShadow: "0 2px 4px rgba(0,0,0,0.8)" }}
      >
        {issue.key}
      </text>
    </g>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// TERRAIN DECORATIONS
// ══════════════════════════════════════════════════════════════════════════════

function TerrainDecorations({ terrain, width, height, seed }: { 
  terrain: string; 
  width: number; 
  height: number;
  seed: number;
}) {
  // Seeded random for consistent decoration placement
  const seededRandom = useCallback((i: number) => {
    const x = Math.sin(seed + i * 9999) * 10000;
    return x - Math.floor(x);
  }, [seed]);

  const decorations = [];
  const count = 25;

  for (let i = 0; i < count; i++) {
    const x = seededRandom(i) * (width - 100) + 50;
    const y = seededRandom(i + 100) * (height - 200) + 100;
    const scale = 0.6 + seededRandom(i + 200) * 0.8;
    const type = Math.floor(seededRandom(i + 300) * 4);

    if (terrain === "grass") {
      if (type === 0) decorations.push(<PixelTree key={i} x={x} y={y} scale={scale} />);
      else if (type === 1) decorations.push(<PixelBush key={i} x={x} y={y} scale={scale} />);
      else if (type === 2) decorations.push(<PixelFlower key={i} x={x} y={y} color={["#e91e63", "#ff5722", "#ffeb3b", "#9c27b0"][Math.floor(seededRandom(i + 400) * 4)]} />);
      else decorations.push(<PixelRock key={i} x={x} y={y} scale={scale * 0.8} />);
    } else if (terrain === "desert") {
      if (type === 0) decorations.push(<PixelCactus key={i} x={x} y={y} scale={scale} />);
      else if (type === 1) decorations.push(<PixelSkull key={i} x={x} y={y} />);
      else decorations.push(<PixelRock key={i} x={x} y={y} scale={scale * 0.7} />);
    } else if (terrain === "water") {
      if (type < 2) decorations.push(<PixelCoral key={i} x={x} y={y} color={["#e91e63", "#ff5722", "#4caf50", "#9c27b0"][Math.floor(seededRandom(i + 400) * 4)]} />);
      else decorations.push(<PixelRock key={i} x={x} y={y} scale={scale * 0.6} />);
    } else if (terrain === "mountain") {
      if (type === 0) decorations.push(<PixelCrystal key={i} x={x} y={y} color={["#9c27b0", "#2196f3", "#e91e63"][Math.floor(seededRandom(i + 400) * 3)]} />);
      else decorations.push(<PixelRock key={i} x={x} y={y} scale={scale} />);
    } else if (terrain === "lava") {
      if (type === 0) decorations.push(<PixelGeyser key={i} x={x} y={y} />);
      else decorations.push(<PixelRock key={i} x={x} y={y} scale={scale * 0.8} />);
    } else if (terrain === "cloud") {
      decorations.push(<PixelPlatform key={i} x={x} y={y} scale={scale * 0.8} />);
    }
  }

  return <g>{decorations}</g>;
}

// ══════════════════════════════════════════════════════════════════════════════
// GROUND TILES
// ══════════════════════════════════════════════════════════════════════════════

function GroundTiles({ terrain, width, height }: { terrain: string; width: number; height: number }) {
  const palette = TERRAIN_PALETTES[terrain as keyof typeof TERRAIN_PALETTES] || TERRAIN_PALETTES.grass;
  const tileSize = 24;
  const tiles = [];

  for (let x = 0; x < width; x += tileSize) {
    for (let y = 0; y < height; y += tileSize) {
      const colorIndex = Math.floor(Math.random() * 3);
      const variation = (x + y) % 3;
      tiles.push(
        <rect
          key={`${x}-${y}`}
          x={x}
          y={y}
          width={tileSize}
          height={tileSize}
          fill={palette.ground[variation]}
          opacity={0.9 + Math.random() * 0.1}
        />
      );
      // Add subtle dots for texture
      if (Math.random() > 0.7) {
        tiles.push(
          <rect
            key={`dot-${x}-${y}`}
            x={x + tileSize / 2 - 2}
            y={y + tileSize / 2 - 2}
            width={4}
            height={4}
            fill={palette.accent}
            opacity={0.4}
          />
        );
      }
    }
  }

  return <g>{tiles}</g>;
}

// ══════════════════════════════════════════════════════════════════════════════
// MAIN REGION VIEW COMPONENT
// ══════════════════════════════════════════════════════════════════════════════

interface RegionViewProps {
  project: Project;
  issues: Issue[];
  users: User[];
  dependencies: IssueDependency[];
  onExit: () => void;
  onSelectIssue: (issue: Issue | null) => void;
  selectedIssue: Issue | null;
}

export default function RegionView({
  project,
  issues,
  users,
  dependencies,
  onExit,
  onSelectIssue,
  selectedIssue,
}: RegionViewProps) {
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [dragging, setDragging] = useState(false);
  const [enterAnimation, setEnterAnimation] = useState(true);
  const dragStart = useRef<{ mx: number; my: number; px: number; py: number } | null>(null);

  const viewWidth = 1200;
  const viewHeight = 800;
  const palette = TERRAIN_PALETTES[project.terrain] || TERRAIN_PALETTES.grass;

  // Filter issues for this project
  const regionIssues = issues.filter(i => i.projectId === project.id);

  // Layout issues in a grid pattern within the region
  const layoutIssues = regionIssues.map((issue, index) => {
    const cols = Math.ceil(Math.sqrt(regionIssues.length));
    const row = Math.floor(index / cols);
    const col = index % cols;
    const spacing = 180;
    const offsetX = (viewWidth - cols * spacing) / 2;
    const offsetY = 200;
    
    return {
      ...issue,
      layoutX: offsetX + col * spacing + (row % 2) * (spacing / 2),
      layoutY: offsetY + row * spacing * 0.8,
    };
  });

  // Entry animation
  useEffect(() => {
    const timer = setTimeout(() => setEnterAnimation(false), 500);
    return () => clearTimeout(timer);
  }, []);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    setDragging(true);
    dragStart.current = { mx: e.clientX, my: e.clientY, px: pan.x, py: pan.y };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!dragging || !dragStart.current) return;
    setPan({
      x: dragStart.current.px + (e.clientX - dragStart.current.mx) / zoom,
      y: dragStart.current.py + (e.clientY - dragStart.current.my) / zoom,
    });
  };

  const handleMouseUp = () => setDragging(false);

  const handleWheel = (e: React.WheelEvent) => {
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    setZoom(z => Math.max(0.5, Math.min(2, z * delta)));
  };

  return (
    <div
      style={{
        width: "100%",
        height: "100vh",
        overflow: "hidden",
        position: "relative",
        cursor: dragging ? "grabbing" : "grab",
        fontFamily: "'Press Start 2P', monospace",
        transition: enterAnimation ? "transform 0.5s ease-out, opacity 0.5s ease-out" : "none",
        transform: enterAnimation ? "scale(1.5)" : "scale(1)",
        opacity: enterAnimation ? 0 : 1,
      }}
    >
      {/* Sky gradient background */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: `linear-gradient(180deg, ${palette.sky[0]} 0%, ${palette.sky[1]} 100%)`,
        }}
      />

      {/* Main SVG canvas */}
      <svg
        width="100%"
        height="100%"
        viewBox={`0 0 ${viewWidth} ${viewHeight}`}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
        style={{ position: "absolute", inset: 0 }}
      >
        <g transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}>
          {/* Ground */}
          <GroundTiles terrain={project.terrain} width={viewWidth} height={viewHeight} />

          {/* Terrain decorations */}
          <TerrainDecorations
            terrain={project.terrain}
            width={viewWidth}
            height={viewHeight}
            seed={project.id.charCodeAt(0) * 1000}
          />

          {/* Dependency paths between issues */}
          {dependencies
            .filter(d => {
              const issue = layoutIssues.find(i => i.id === d.issueId);
              const blocker = layoutIssues.find(i => i.id === d.blockedByIssueId);
              return issue && blocker;
            })
            .map((dep, i) => {
              const issue = layoutIssues.find(i => i.id === dep.issueId)!;
              const blocker = layoutIssues.find(i => i.id === dep.blockedByIssueId)!;
              return (
                <g key={i}>
                  <line
                    x1={blocker.layoutX + 40}
                    y1={blocker.layoutY + 40}
                    x2={issue.layoutX + 40}
                    y2={issue.layoutY + 40}
                    stroke="rgba(255,255,255,0.2)"
                    strokeWidth={8}
                    strokeLinecap="round"
                  />
                  <line
                    x1={blocker.layoutX + 40}
                    y1={blocker.layoutY + 40}
                    x2={issue.layoutX + 40}
                    y2={issue.layoutY + 40}
                    stroke="#e8d88a"
                    strokeWidth={3}
                    strokeDasharray="8 4"
                    strokeLinecap="round"
                  />
                </g>
              );
            })}

          {/* Issue buildings */}
          {layoutIssues.map(issue => (
            <IssueBuildingComponent
              key={issue.id}
              issue={issue}
              x={issue.layoutX}
              y={issue.layoutY}
              scale={1}
              onClick={() => onSelectIssue(issue)}
              isSelected={selectedIssue?.id === issue.id}
            />
          ))}
        </g>
      </svg>

      {/* Region title HUD */}
      <div
        style={{
          position: "absolute",
          top: 16,
          left: 16,
          background: "rgba(0,0,0,0.75)",
          border: `2px solid ${project.color}`,
          borderRadius: 8,
          padding: "12px 18px",
          backdropFilter: "blur(8px)",
        }}
      >
        <div style={{ fontSize: 7, color: "rgba(255,255,255,0.4)", letterSpacing: "0.15em", marginBottom: 4 }}>
          REGION
        </div>
        <div style={{ fontSize: 12, color: project.color, letterSpacing: "0.1em" }}>
          {project.name.toUpperCase()}
        </div>
        <div style={{ fontSize: 7, color: "rgba(255,255,255,0.5)", marginTop: 8 }}>
          {regionIssues.filter(i => i.status === "DONE").length}/{regionIssues.length} QUESTS COMPLETE
        </div>
      </div>

      {/* Exit button */}
      <button
        onClick={onExit}
        style={{
          position: "absolute",
          top: 16,
          right: 16,
          background: "rgba(0,0,0,0.75)",
          border: "2px solid rgba(255,255,255,0.2)",
          borderRadius: 8,
          padding: "12px 20px",
          color: "#fff",
          fontSize: 9,
          cursor: "pointer",
          backdropFilter: "blur(8px)",
          display: "flex",
          alignItems: "center",
          gap: 8,
          fontFamily: "'Press Start 2P', monospace",
        }}
      >
        <span style={{ fontSize: 14 }}>←</span>
        WORLD MAP
      </button>

      {/* Zoom controls */}
      <div
        style={{
          position: "absolute",
          bottom: 16,
          right: 16,
          display: "flex",
          flexDirection: "column",
          gap: 4,
        }}
      >
        <button
          onClick={() => setZoom(z => Math.min(2, z * 1.2))}
          style={{
            width: 36,
            height: 36,
            background: "rgba(0,0,0,0.75)",
            border: "2px solid rgba(255,255,255,0.2)",
            borderRadius: 6,
            color: "#fff",
            fontSize: 16,
            cursor: "pointer",
          }}
        >
          +
        </button>
        <button
          onClick={() => setZoom(z => Math.max(0.5, z * 0.8))}
          style={{
            width: 36,
            height: 36,
            background: "rgba(0,0,0,0.75)",
            border: "2px solid rgba(255,255,255,0.2)",
            borderRadius: 6,
            color: "#fff",
            fontSize: 16,
            cursor: "pointer",
          }}
        >
          −
        </button>
      </div>

      {/* Controls hint */}
      <div
        style={{
          position: "absolute",
          bottom: 16,
          left: 16,
          fontSize: 7,
          color: "rgba(255,255,255,0.35)",
          letterSpacing: "0.1em",
        }}
      >
        DRAG TO EXPLORE · SCROLL TO ZOOM · CLICK BUILDINGS
      </div>

      {/* Issue Detail Panel */}
      {selectedIssue && (
        <IssueDetailPanel
          issue={selectedIssue}
          users={users}
          dependencies={dependencies}
          issues={regionIssues}
          onClose={() => onSelectIssue(null)}
          onNavigate={onSelectIssue}
        />
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// ISSUE DETAIL PANEL
// ══════════════════════════════════════════════════════════════════════════════

function IssueDetailPanel({
  issue,
  users,
  dependencies,
  issues,
  onClose,
  onNavigate,
}: {
  issue: Issue;
  users: User[];
  dependencies: IssueDependency[];
  issues: Issue[];
  onClose: () => void;
  onNavigate: (issue: Issue) => void;
}) {
  const assignee = users.find(u => u.id === issue.assigneeUserId);
  const s = STATUS_CONFIG[issue.status];

  const blockedBy = dependencies
    .filter(d => d.issueId === issue.id)
    .map(d => issues.find(i => i.id === d.blockedByIssueId))
    .filter(Boolean) as Issue[];
  
  const blocks = dependencies
    .filter(d => d.blockedByIssueId === issue.id)
    .map(d => issues.find(i => i.id === d.issueId))
    .filter(Boolean) as Issue[];

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
          background: `linear-gradient(135deg, ${s.color}33, transparent)`,
        }}
      >
        <div style={{ fontSize: 7, color: "rgba(255,255,255,0.4)", letterSpacing: "0.15em", marginBottom: 8 }}>
          {issue.key}
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
            {issue.status.replace("_", " ")}
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
        </div>
      </div>

      {/* Description */}
      {issue.description && (
        <div style={{ padding: "16px 18px", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
          <div style={{ fontSize: 7, color: "rgba(255,255,255,0.3)", marginBottom: 10, letterSpacing: "0.1em" }}>
            DESCRIPTION
          </div>
          <div style={{ fontSize: 8, color: "rgba(255,255,255,0.7)", lineHeight: 1.6 }}>
            {issue.description}
          </div>
        </div>
      )}

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
              letterSpacing: "0.1em",
              textAlign: "center",
            }}
          >
            UNASSIGNED
          </div>
        )}
      </div>

      {/* Blocked By */}
      {blockedBy.length > 0 && (
        <div style={{ padding: "16px 18px", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
          <div style={{ fontSize: 7, color: "rgba(255,255,255,0.3)", marginBottom: 10, letterSpacing: "0.1em" }}>
            BLOCKED BY
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
                  fontFamily: "'Press Start 2P', monospace",
                }}
              >
                <div
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: "50%",
                    background: STATUS_CONFIG[dep.status].color,
                  }}
                />
                <span style={{ fontSize: 7, color: "rgba(255,255,255,0.5)" }}>{dep.key}</span>
                <span style={{ fontSize: 8, color: "rgba(255,255,255,0.7)", flex: 1 }}>
                  {dep.title.length > 15 ? dep.title.slice(0, 15) + "..." : dep.title}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Blocks */}
      {blocks.length > 0 && (
        <div style={{ padding: "16px 18px", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
          <div style={{ fontSize: 7, color: "rgba(255,255,255,0.3)", marginBottom: 10, letterSpacing: "0.1em" }}>
            UNLOCKS
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
                  fontFamily: "'Press Start 2P', monospace",
                }}
              >
                <div
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: "50%",
                    background: STATUS_CONFIG[dep.status].color,
                  }}
                />
                <span style={{ fontSize: 7, color: "rgba(255,255,255,0.5)" }}>{dep.key}</span>
                <span style={{ fontSize: 8, color: "rgba(255,255,255,0.7)", flex: 1 }}>
                  {dep.title.length > 15 ? dep.title.slice(0, 15) + "..." : dep.title}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Close button */}
      <div style={{ padding: "14px 18px", marginTop: "auto", borderTop: "1px solid rgba(255,255,255,0.08)" }}>
        <button
          onClick={onClose}
          style={{
            width: "100%",
            fontSize: 7,
            color: "rgba(255,255,255,0.4)",
            background: "transparent",
            border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: 4,
            cursor: "pointer",
            letterSpacing: "0.15em",
            padding: 10,
            fontFamily: "'Press Start 2P', monospace",
          }}
        >
          ✕ CLOSE
        </button>
      </div>
    </div>
  );
}
