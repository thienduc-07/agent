"use client";

import React from "react";
import {
  Compass,
  Crown,
  Ship,
  HeartPulse,
  Utensils,
  Swords,
  Wrench,
  BookOpen,
  HelpCircle,
  Layers,
  Anchor,
  Shield,
  Home,
  Mountain,
} from "lucide-react";
import { useWorldStore } from "@/store/worldStore";
import { ISLAND_CAMERA_BOOKMARKS } from "@/data/worldConfig";

interface WorldHUDProps {
  onToggleMissionDrawer?: () => void;
  isMissionDrawerOpen?: boolean;
  onOpenTaskModal?: () => void;
}

export default function WorldHUD({
  onToggleMissionDrawer,
  isMissionDrawerOpen,
  onOpenTaskModal,
}: WorldHUDProps) {
  const isLiveConnected = useWorldStore((s) => s.isLiveConnected);
  const backendConnection = useWorldStore((s) => s.backendConnection);
  const backendError = useWorldStore((s) => s.backendError);
  const cameraPreset = useWorldStore((s) => s.cameraPreset);
  const selectedAreaId = useWorldStore((s) => s.selectedAreaId);
  const selectedAgentId = useWorldStore((s) => s.selectedAgentId);
  const selectArea = useWorldStore((s) => s.selectArea);
  const resetToTacticalOverview = useWorldStore((s) => s.resetToTacticalOverview);
  const toggleControlsHelp = useWorldStore((s) => s.toggleControlsHelp);

  const smoothFocusCamera = useWorldStore((s) => s.smoothFocusCamera);

  const renderBookmarkIcon = (icon: string) => {
    switch (icon) {
      case "Crown":
        return <Crown className="w-3.5 h-3.5 text-amber-400" />;
      case "Ship":
        return <Ship className="w-3.5 h-3.5 text-cyan-400" />;
      case "HeartPulse":
        return <HeartPulse className="w-3.5 h-3.5 text-pink-400" />;
      case "Utensils":
        return <Utensils className="w-3.5 h-3.5 text-orange-400" />;
      case "Swords":
        return <Swords className="w-3.5 h-3.5 text-emerald-400" />;
      case "Wrench":
        return <Wrench className="w-3.5 h-3.5 text-yellow-400" />;
      case "BookOpen":
        return <BookOpen className="w-3.5 h-3.5 text-purple-400" />;
      case "Compass":
      default:
        return <Compass className="w-3.5 h-3.5" />;
    }
  };

  return (
    <header className="absolute top-0 left-0 right-0 z-30 px-5 py-3 flex items-center justify-between pointer-events-none">
      {/* Brand & Island Lore */}
      <div className="flex items-center gap-3 pointer-events-auto">
        <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-amber-500 to-amber-700 flex items-center justify-center shadow-lg shadow-amber-500/25 border border-amber-300/40">
          <Compass className="w-6 h-6 text-slate-950" />
        </div>
        <div>
          <h1 className="text-sm font-bold tracking-wider text-amber-400 flex items-center gap-2">
            AI AGENT CITY
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 uppercase font-mono font-semibold">
              MILESTONE 9 • GRAND LINE
            </span>
          </h1>
          <p className="text-[11px] text-slate-400">
            Straw Hat Crew Living World • Multi-Level Island & Infinite Ocean
          </p>
        </div>
      </div>

      {/* Center Camera & Area Navigation Bar (Smooth Gliding Bookmarks) */}
      <div className="hidden lg:flex items-center gap-1 p-1 rounded-2xl glass-panel pointer-events-auto shadow-xl border border-slate-700/60 max-w-[62vw] overflow-x-auto no-scrollbar">
        {ISLAND_CAMERA_BOOKMARKS.map((b) => {
          const isActive =
            selectedAreaId === b.id ||
            (b.id === "all-island" && !selectedAreaId && cameraPreset === "tactical");

          return (
            <button
              key={b.id}
              onClick={() => {
                smoothFocusCamera(
                  b.cameraPosition,
                  b.targetPosition,
                  b.id === "all-island" ? undefined : b.id
                );
              }}
              className={`px-2.5 py-1.5 rounded-xl text-xs font-medium transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                isActive
                  ? "bg-amber-500 text-slate-950 font-semibold shadow-md shadow-amber-500/20"
                  : "text-slate-300 hover:text-white hover:bg-slate-800/60"
              }`}
            >
              {renderBookmarkIcon(b.icon)}
              {b.label}
            </button>
          );
        })}
      </div>

      {/* Right Action Tools: Connection Status, Help, Mission Toggle */}
      <div className="flex items-center gap-2.5 pointer-events-auto">
        {/* Backend API Connection Status Badge */}
        <div
          className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold glass-panel border ${
            backendConnection === "connected"
              ? "border-emerald-500/40 text-emerald-400 shadow-emerald-500/10"
              : backendConnection === "connecting"
              ? "border-sky-500/40 text-sky-400 animate-pulse"
              : backendConnection === "demo_fallback"
              ? "border-amber-500/40 text-amber-400"
              : "border-rose-500/40 text-rose-400"
          }`}
          title={backendError || undefined}
        >
          <span
            className={`w-2 h-2 rounded-full ${
              backendConnection === "connected"
                ? "bg-emerald-400 animate-pulse"
                : backendConnection === "connecting"
                ? "bg-sky-400 animate-ping"
                : backendConnection === "demo_fallback"
                ? "bg-amber-400"
                : "bg-rose-500"
            }`}
          />
          <span>
            {backendConnection === "connected"
              ? "API v1 CONNECTED"
              : backendConnection === "connecting"
              ? "CONNECTING..."
              : backendConnection === "demo_fallback"
              ? "DEMO MODE"
              : "API OFFLINE"}
          </span>
        </div>

        {/* Task Create / Ban Bố Lệnh Button */}
        <button
          onClick={() => {
            const current = useWorldStore.getState().isMissionTerminalOpen;
            useWorldStore.getState().setIsMissionTerminalOpen(!current);
          }}
          className="px-3.5 py-1.5 rounded-xl text-xs font-bold uppercase tracking-wider text-slate-950 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 shadow-md shadow-amber-500/20 transition-all flex items-center gap-1.5 cursor-pointer"
        >
          <span>⚔️</span>
          <span>Ban Bố Lệnh</span>
        </button>

        {/* Controls Help Button */}
        <button
          onClick={toggleControlsHelp}
          className="p-2 rounded-xl glass-panel hover:bg-slate-800 text-slate-300 hover:text-amber-300 transition-all cursor-pointer"
          title="Controls Guide"
        >
          <HelpCircle className="w-4 h-4" />
        </button>

        {/* Mission Terminal Button */}
        <button
          onClick={() => {
            const current = useWorldStore.getState().isMissionTerminalOpen;
            useWorldStore.getState().setIsMissionTerminalOpen(!current);
          }}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer border ${
            useWorldStore((s) => s.isMissionTerminalOpen)
              ? "bg-amber-500 text-slate-950 border-amber-400 shadow-lg shadow-amber-500/20"
              : "glass-panel text-amber-300 border-amber-500/40 hover:bg-slate-800"
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>Mission Terminal</span>
        </button>
      </div>
    </header>
  );
}
