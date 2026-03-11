"use client";

import { useState } from "react";

export function TutorialButton() {
  const [showTutorial, setShowTutorial] = useState(false);

  return (
    <>
      <button
        onClick={() => setShowTutorial(true)}
        className="inline-flex items-center gap-2 rounded-lg bg-purple-600 px-4 py-2 text-sm font-semibold text-white shadow-md transition-all hover:bg-purple-700 hover:shadow-lg"
      >
        <span>🎬</span>
        <span>Watch Tutorial</span>
      </button>

      {showTutorial && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm"
          onClick={() => setShowTutorial(false)}
        >
          <div
            className="relative max-h-[90vh] max-w-[90vw]"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setShowTutorial(false)}
              className="absolute -top-12 right-0 rounded-lg border border-white/20 bg-white/10 px-4 py-2 text-sm font-medium text-white/80 transition-colors hover:bg-white/20"
            >
              ✕ Close
            </button>
            <video
              src="/sterling.mp4"
              controls
              autoPlay
              className="max-h-[80vh] max-w-[90vw] rounded-xl border-2 border-purple-500/50 shadow-2xl shadow-purple-500/20"
            />
            <p className="mt-4 text-center text-lg font-semibold text-purple-400">
              🎮 Welcome to Regions 🎮
            </p>
          </div>
        </div>
      )}
    </>
  );
}
