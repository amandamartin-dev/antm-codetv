"use client";

import { useEffect, useRef, useCallback } from "react";

interface PixelSkyBackgroundProps {
  panX: number;
  panY: number;
}

// Sun configuration - on the right side
const SUN = {
  x: 0.85,
  y: 0.1,
  baseRadius: 45,
};

export default function PixelSkyBackground({ panX, panY }: PixelSkyBackgroundProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(0);
  const timeRef = useRef<number>(0);
  const cloudsRef = useRef<Array<{
    x: number;
    y: number;
    scale: number;
    speed: number;
    type: "small" | "medium" | "large";
  }>>([]);

  // Generate clouds - fewer, smaller, well-spaced
  const generateClouds = useCallback((width: number, height: number) => {
    const clouds: typeof cloudsRef.current = [];
    
    // Sparse grid - 4x4 for fewer clouds
    const cols = 4;
    const rows = 4;
    const cellWidth = width / cols;
    const cellHeight = height / rows;
    
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        // Skip some cells randomly for more organic feel
        if (Math.random() < 0.25) continue;
        
        const baseX = col * cellWidth + cellWidth * 0.1;
        const baseY = row * cellHeight + cellHeight * 0.1;
        
        // Smaller random offset
        const offsetX = Math.random() * cellWidth * 0.5;
        const offsetY = Math.random() * cellHeight * 0.4;
        
        // Smaller scales - between 0.7 and 1.3
        const scale = 0.7 + Math.random() * 0.6;
        
        // Mix of cloud types, favoring smaller ones
        const typeRoll = Math.random();
        let type: "small" | "medium" | "large";
        if (typeRoll < 0.4) {
          type = "small";
        } else if (typeRoll < 0.8) {
          type = "medium";
        } else {
          type = "large";
        }
        
        const speed = 0.02 + Math.random() * 0.03;
        
        clouds.push({
          x: baseX + offsetX,
          y: baseY + offsetY,
          scale,
          speed,
          type,
        });
      }
    }
    
    // Just a few accent clouds at edges
    const edgeClouds = [
      { x: -20, y: height * 0.3, scale: 1.0, speed: 0.025, type: "medium" as const },
      { x: -30, y: height * 0.7, scale: 1.1, speed: 0.02, type: "medium" as const },
      { x: width - 60, y: height * 0.4, scale: 0.9, speed: 0.03, type: "medium" as const },
      { x: width - 40, y: height * 0.8, scale: 1.0, speed: 0.025, type: "medium" as const },
    ];
    
    clouds.push(...edgeClouds);
    
    return clouds;
  }, []);

  // Draw a pixel-art style cloud
  const drawPixelCloud = useCallback((
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    scale: number,
    type: "small" | "medium" | "large"
  ) => {
    // Smaller base pixel size
    const pixelSize = Math.round(4 * scale);
    
    const cloudWhite = "#ffffff";
    const cloudHighlight = "#f8fbff";
    const cloudMid = "#eaf2fa";
    const cloudShadow = "#d0e0f0";
    const cloudDeepShadow = "#b8d0e8";

    // Cloud shapes
    const shapes = {
      small: [
        [0,0,1,1,1,0,0],
        [0,1,1,1,1,1,0],
        [1,1,1,1,1,1,1],
        [0,1,1,1,1,1,0],
      ],
      medium: [
        [0,0,1,1,1,0,0,0],
        [0,1,1,1,1,1,0,0],
        [1,1,1,1,1,1,1,0],
        [1,1,1,1,1,1,1,1],
        [0,1,1,1,1,1,1,0],
      ],
      large: [
        [0,0,0,1,1,1,0,0,0,0,0],
        [0,0,1,1,1,1,1,0,1,1,0],
        [0,1,1,1,1,1,1,1,1,1,1],
        [1,1,1,1,1,1,1,1,1,1,1],
        [1,1,1,1,1,1,1,1,1,1,1],
        [0,1,1,1,1,1,1,1,1,1,0],
      ],
    };

    const shape = shapes[type];
    const rows = shape.length;

    // Shadow
    ctx.fillStyle = cloudDeepShadow;
    shape.forEach((row, rowIdx) => {
      row.forEach((pixel, colIdx) => {
        if (pixel === 1 && rowIdx >= rows - 2) {
          ctx.fillRect(
            x + colIdx * pixelSize + 2,
            y + rowIdx * pixelSize + 2,
            pixelSize,
            pixelSize
          );
        }
      });
    });

    // Main body
    shape.forEach((row, rowIdx) => {
      row.forEach((pixel, colIdx) => {
        if (pixel === 1) {
          if (rowIdx === 0) {
            ctx.fillStyle = cloudHighlight;
          } else if (rowIdx >= rows - 1) {
            ctx.fillStyle = cloudShadow;
          } else if (colIdx === 0 || shape[rowIdx][colIdx - 1] !== 1) {
            ctx.fillStyle = cloudMid;
          } else {
            ctx.fillStyle = cloudWhite;
          }

          ctx.fillRect(
            x + colIdx * pixelSize,
            y + rowIdx * pixelSize,
            pixelSize,
            pixelSize
          );
        }
      });
    });
  }, []);

  // Draw pixel-art sun
  const drawPixelSun = useCallback((
    ctx: CanvasRenderingContext2D,
    centerX: number,
    centerY: number,
    radius: number
  ) => {
    const pixelSize = 6;

    const sunCore = "#fff59d";
    const sunInner = "#ffeb3b";
    const sunMid = "#ffc107";
    const sunOuter = "#ff9800";
    const sunEdge = "#f57c00";

    for (let py = -radius; py <= radius; py += pixelSize) {
      for (let px = -radius; px <= radius; px += pixelSize) {
        const dist = Math.sqrt(px * px + py * py);
        
        if (dist <= radius) {
          if (dist < radius * 0.3) {
            ctx.fillStyle = sunCore;
          } else if (dist < radius * 0.5) {
            ctx.fillStyle = sunInner;
          } else if (dist < radius * 0.7) {
            ctx.fillStyle = sunMid;
          } else if (dist < radius * 0.85) {
            ctx.fillStyle = sunOuter;
          } else {
            ctx.fillStyle = sunEdge;
          }

          ctx.fillRect(
            centerX + px - pixelSize / 2,
            centerY + py - pixelSize / 2,
            pixelSize,
            pixelSize
          );
        }
      }
    }
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let width = window.innerWidth;
    let height = window.innerHeight;

    const resizeCanvas = () => {
      const dpr = window.devicePixelRatio || 1;
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      
      cloudsRef.current = generateClouds(width, height);
    };
    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);

    const drawSky = () => {
      const gradient = ctx.createLinearGradient(0, 0, 0, height);
      gradient.addColorStop(0, "#5b8fd4");
      gradient.addColorStop(0.4, "#6ba3e8");
      gradient.addColorStop(0.7, "#7bb5f0");
      gradient.addColorStop(1, "#8ec8ff");
      
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, height);

      // Subtle dot pattern
      const dotSize = 2;
      const spacing = 12;
      
      for (let x = 0; x < width; x += spacing) {
        for (let y = 0; y < height; y += spacing) {
          const fadeY = 1 - (y / height) * 0.6;
          const alpha = Math.max(0.05, fadeY * 0.25);
          
          ctx.fillStyle = `rgba(70, 130, 180, ${alpha})`;
          ctx.fillRect(x, y, dotSize, dotSize);
        }
      }
    };

    const animate = () => {
      timeRef.current += 0.016;

      ctx.clearRect(0, 0, width, height);
      drawSky();

      // Sun
      const sunX = width * SUN.x + panX * 0.1;
      const sunY = height * SUN.y + panY * 0.08;
      drawPixelSun(ctx, sunX, sunY, SUN.baseRadius);

      // Clouds
      cloudsRef.current.forEach((cloud) => {
        const parallaxX = cloud.x + panX * (0.06 + cloud.speed * 0.3);
        const parallaxY = cloud.y + panY * 0.03;
        const floatOffset = Math.sin(timeRef.current * cloud.speed * 4) * 3;
        
        drawPixelCloud(
          ctx,
          parallaxX,
          parallaxY + floatOffset,
          cloud.scale,
          cloud.type
        );
      });

      animationRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener("resize", resizeCanvas);
      cancelAnimationFrame(animationRef.current);
    };
  }, [panX, panY, generateClouds, drawPixelCloud, drawPixelSun]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: "absolute",
        inset: 0,
        pointerEvents: "none",
        zIndex: 0,
      }}
    />
  );
}
