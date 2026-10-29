"use client";

import React from "react";
import { X, MapPin, CheckCircle2, User, Eye } from "lucide-react";
import { useWorldStore } from "@/store/worldStore";

export default function AreaInfoPanel() {
  const selectedAreaId = useWorldStore((s) => s.selectedAreaId);
  const areas = useWorldStore((s) => s.areas);
  const agents = useWorldStore((s) => s.agents);
  const selectArea = useWorldStore((s) => s.selectArea);
  const selectAgent = useWorldStore((s) => s.selectAgent);
  const closeInfoPanel = useWorldStore((s) => s.closeInfoPanel);

  if (!selectedAreaId || !areas[selectedAreaId]) return null;

  const area = areas[selectedAreaId];
  const assignedAgent = agents[area.assignedAgentId];

  return (
    <div className="absolute top-20 right-5 z-20 w-84 p-4 rounded-3xl glass-panel border border-slate-700/80 shadow-2xl flex flex-col gap-3 pointer-events-auto animate-in slide-in-from-right-4 duration-200">
      {/* Header */}
      <div className="flex items-start justify-between border-b border-slate-800 pb-2.5">
        <div className="flex items-center gap-2.5">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center shadow-lg"
            style={{ backgroundColor: `${area.accentColor}25`, border: `1px solid ${area.accentColor}60` }}
          >
            <MapPin className="w-5 h-5" style={{ color: area.accentColor }} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-100">{area.name}</h3>
            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
              {area.title}
            </span>
          </div>
        </div>
        <button
          onClick={closeInfoPanel}
          className="text-slate-400 hover:text-white transition-colors cursor-pointer p-1"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Description & Purpose */}
      <div className="flex flex-col gap-1.5 text-xs">
        <p className="text-slate-300 leading-relaxed">{area.description}</p>
        <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800 text-[11px]">
          <span className="font-semibold text-amber-400 block mb-0.5">Mục đích chiến lược:</span>
          <span className="text-slate-300">{area.purpose}</span>
        </div>
      </div>

      {/* Features List */}
      <div className="flex flex-col gap-1.5">
        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
          Điểm nhận diện kiến trúc
        </span>
        <div className="flex flex-col gap-1 text-[11px] text-slate-300">
          {area.features.map((feat, i) => (
            <div key={i} className="flex items-center gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span>{feat}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Assigned Specialist Agent */}
      {assignedAgent && (
        <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <User className="w-4 h-4 text-slate-400" />
            <div className="text-[11px]">
              <span className="text-slate-400 block text-[9px]">Chỉ huy khu vực</span>
              <span className="font-bold text-slate-200">{assignedAgent.name}</span>
            </div>
          </div>
          <button
            onClick={() => selectAgent(assignedAgent.id)}
            className="px-3 py-1.5 rounded-xl text-[11px] font-semibold bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-500/30 transition-all flex items-center gap-1 cursor-pointer"
          >
            <Eye className="w-3 h-3" />
            Xem Agent
          </button>
        </div>
      )}
    </div>
  );
}
