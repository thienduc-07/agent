"use client";

import React from "react";
import { Compass, RotateCw, ZoomIn, MousePointer, X } from "lucide-react";
import { useWorldStore } from "@/store/worldStore";

export default function WorldControlsHelp() {
  const controlsHelpVisible = useWorldStore((s) => s.controlsHelpVisible);
  const toggleControlsHelp = useWorldStore((s) => s.toggleControlsHelp);

  if (!controlsHelpVisible) {
    return (
      <button
        onClick={toggleControlsHelp}
        className="absolute bottom-5 left-5 z-20 px-3 py-1.5 rounded-xl glass-panel text-xs text-amber-300 font-semibold border border-amber-500/40 hover:bg-slate-800 transition-all flex items-center gap-1.5 shadow-lg pointer-events-auto cursor-pointer"
        title="Show 3D Controls Guide"
      >
        <Compass className="w-3.5 h-3.5" />
        <span>Controls Guide</span>
      </button>
    );
  }

  return (
    <div className="absolute bottom-5 left-5 z-20 p-3.5 rounded-2xl glass-panel border border-slate-700/80 shadow-2xl text-xs w-64 flex flex-col gap-2 pointer-events-auto animate-in fade-in">
      <div className="flex items-center justify-between pb-1.5 border-b border-slate-800">
        <span className="font-bold text-amber-400 flex items-center gap-1.5 uppercase tracking-wider text-[11px]">
          <Compass className="w-3.5 h-3.5" />
          3D Navigation
        </span>
        <button
          onClick={toggleControlsHelp}
          className="text-slate-400 hover:text-white transition-colors cursor-pointer"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="flex flex-col gap-1.5 text-slate-300 text-[11px]">
        <div className="flex items-center gap-2">
          <RotateCw className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
          <span><strong>Left Click + Drag:</strong> Rotate Camera</span>
        </div>
        <div className="flex items-center gap-2">
          <ZoomIn className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
          <span><strong>Scroll:</strong> Zoom In / Out</span>
        </div>
        <div className="flex items-center gap-2">
          <MousePointer className="w-3.5 h-3.5 text-amber-400 shrink-0" />
          <span><strong>Right Click + Drag:</strong> Pan Island</span>
        </div>
        <div className="flex items-center gap-2">
          <Compass className="w-3.5 h-3.5 text-purple-400 shrink-0" />
          <span><strong>Click Character / Area:</strong> Inspect & Focus</span>
        </div>
      </div>
    </div>
  );
}
