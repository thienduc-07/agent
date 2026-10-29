"use client";

import React, { useEffect, useState } from "react";
import { X, History, CheckCircle, AlertCircle, Clock, ShieldCheck } from "lucide-react";
import { Task } from "@/types";

interface TaskHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  apiBaseUrl: string;
}

export default function TaskHistoryModal({
  isOpen,
  onClose,
  apiBaseUrl,
}: TaskHistoryModalProps) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  useEffect(() => {
    if (isOpen) {
      fetchTasks();
    }
  }, [isOpen]);

  const fetchTasks = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${apiBaseUrl}/api/tasks?limit=30`);
      if (res.ok) {
        const data = await res.json();
        setTasks(data);
        if (data.length > 0 && !selectedTask) {
          setSelectedTask(data[0]);
        }
      }
    } catch (e) {
      console.error("Failed to load task history:", e);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/80 backdrop-blur-md animate-in fade-in">
      <div className="w-full max-w-4xl h-[75vh] rounded-3xl glass-panel border border-slate-700/80 shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
              <History className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-100">
                GRAND LINE MISSION ARCHIVES
              </h2>
              <p className="text-xs text-slate-400">
                Persistent database records of all fleet task executions
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-white transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Layout */}
        <div className="flex-1 flex overflow-hidden">
          {/* Task List */}
          <div className="w-1/3 border-r border-slate-800 overflow-y-auto p-3 flex flex-col gap-2">
            {loading ? (
              <div className="p-4 text-center text-xs text-slate-400">
                Loading archives...
              </div>
            ) : tasks.length === 0 ? (
              <div className="p-4 text-center text-xs text-slate-500">
                No past missions found.
              </div>
            ) : (
              tasks.map((t) => {
                const isSelected = selectedTask?.id === t.id;
                return (
                  <div
                    key={t.id}
                    onClick={() => setSelectedTask(t)}
                    className={`p-3 rounded-2xl cursor-pointer text-xs transition-all ${
                      isSelected
                        ? "bg-slate-800 border border-amber-500/50 text-white"
                        : "glass-card hover:bg-slate-800/50 text-slate-300"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] font-mono text-slate-400">
                        #{t.id.slice(0, 8)}
                      </span>
                      <span
                        className={`text-[9px] px-1.5 py-0.5 rounded font-semibold uppercase ${
                          t.status === "COMPLETED"
                            ? "bg-emerald-950 text-emerald-300 border border-emerald-500/40"
                            : t.status === "AWAITING_APPROVAL"
                            ? "bg-red-950 text-red-300 border border-red-500/40"
                            : "bg-slate-800 text-slate-400"
                        }`}
                      >
                        {t.status}
                      </span>
                    </div>
                    <p className="line-clamp-2 text-slate-200 font-medium">
                      {t.prompt}
                    </p>
                    <span className="text-[10px] text-slate-500 block mt-1">
                      {new Date(t.created_at).toLocaleString()}
                    </span>
                  </div>
                );
              })
            )}
          </div>

          {/* Selected Task Details */}
          <div className="flex-1 p-6 overflow-y-auto flex flex-col gap-4">
            {selectedTask ? (
              <>
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-base font-bold text-amber-300 mb-1">
                      Mission Prompt
                    </h3>
                    <p className="text-sm text-slate-200 bg-slate-900/60 p-3 rounded-xl border border-slate-800 select-text">
                      {selectedTask.prompt}
                    </p>
                  </div>
                  <div className="text-right text-xs">
                    <span className="text-slate-400 block">Risk Classification</span>
                    <span
                      className={`font-semibold uppercase ${
                        selectedTask.risk_level === "HIGH"
                          ? "text-red-400"
                          : "text-emerald-400"
                      }`}
                    >
                      {selectedTask.risk_level}
                    </span>
                  </div>
                </div>

                {/* Result Section */}
                <div>
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                    Execution Output / Report
                  </h4>
                  {selectedTask.result ? (
                    <div className="bg-slate-900/90 border border-slate-800 p-4 rounded-2xl text-xs text-slate-100 leading-relaxed whitespace-pre-wrap select-text">
                      {selectedTask.result}
                    </div>
                  ) : selectedTask.error ? (
                    <div className="bg-red-950/40 border border-red-800/80 p-4 rounded-2xl text-xs text-red-200 leading-relaxed whitespace-pre-wrap select-text">
                      {selectedTask.error}
                    </div>
                  ) : (
                    <div className="text-xs text-slate-500 italic">
                      Mission currently in progress or awaiting action.
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-slate-500">
                Select a mission from the left archive list.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
