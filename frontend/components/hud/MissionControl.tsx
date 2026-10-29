"use client";

import React, { useState } from "react";
import {
  Send,
  Terminal,
  Cpu,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Clock,
  Sparkles,
  Zap,
  Network,
  Layers,
  ArrowRight,
  ShieldCheck,
  FileText,
  RotateCw,
} from "lucide-react";
import { Agent, EventLog, Task } from "@/types";
import { useWorldStore } from "@/store/worldStore";

interface MissionControlProps {
  selectedAgent: Agent | null;
  activeTask: Task | null;
  events: EventLog[];
  onSubmitTask: (agentId: string, prompt: string) => void;
  onSubmitWorkflow?: (title: string, description: string) => void;
  isLoading: boolean;
}

export default function MissionControl({
  selectedAgent,
  activeTask,
  events,
  onSubmitTask,
  onSubmitWorkflow,
  isLoading,
}: MissionControlProps) {
  const [mode, setMode] = useState<"single" | "workflow">("workflow");
  const [prompt, setPrompt] = useState("");
  const activeWorkflow = useWorldStore((s) => s.activeWorkflow);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim() || isLoading) return;

    if (mode === "workflow" && onSubmitWorkflow) {
      onSubmitWorkflow(prompt.trim(), prompt.trim());
      setPrompt("");
    } else if (selectedAgent) {
      onSubmitTask(selectedAgent.id, prompt.trim());
      setPrompt("");
    }
  };

  const setSuggestedPrompt = (suggested: string) => {
    setPrompt(suggested);
  };

  const getAgentColor = (type?: string | null) => {
    switch (type) {
      case "research":
        return "#3b82f6"; // Nami (Blue)
      case "analyst":
        return "#06b6d4"; // Cyan
      case "writer":
        return "#ef4444"; // Franky (Red)
      case "reviewer":
        return "#10b981"; // Zoro (Emerald)
      case "general":
      default:
        return "#f59e0b"; // Roger (Amber)
    }
  };

  return (
    <div className="absolute top-20 right-5 bottom-6 z-20 w-[420px] flex flex-col gap-2.5 pointer-events-auto">
      {/* Mode Switcher Tabs */}
      <div className="flex rounded-xl bg-slate-900/90 border border-slate-700/80 p-1 shadow-lg backdrop-blur-md">
        <button
          onClick={() => setMode("single")}
          className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer ${
            mode === "single"
              ? "bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow"
              : "text-slate-400 hover:text-slate-200"
          }`}
        >
          <Cpu className="w-3.5 h-3.5" />
          <span>Single Agent</span>
        </button>
        <button
          onClick={() => setMode("workflow")}
          className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer ${
            mode === "workflow"
              ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow"
              : "text-slate-400 hover:text-slate-200"
          }`}
        >
          <Network className="w-3.5 h-3.5" />
          <span>Multi-Agent Fleet (M6)</span>
        </button>
      </div>

      {/* Selected Agent Header Card (in single mode) or Multi-Agent Coordinator Header (in workflow mode) */}
      <div className="p-3.5 rounded-2xl glass-panel border border-slate-700/80 shadow-xl flex flex-col gap-1.5">
        {mode === "single" ? (
          selectedAgent ? (
            <div>
              <div className="flex items-center justify-between mb-1">
                <h2 className="text-sm font-bold text-amber-300 flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                  {selectedAgent.name}
                </h2>
                <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                  {selectedAgent.station}
                </span>
              </div>
              <p className="text-xs text-slate-300">{selectedAgent.role}</p>
            </div>
          ) : (
            <div className="text-xs text-slate-400 italic">
              Select an agent or station on the 3D island to assign direct orders.
            </div>
          )
        ) : (
          <div>
            <div className="flex items-center justify-between mb-1">
              <h2 className="text-sm font-bold text-cyan-300 flex items-center gap-2">
                <Layers className="w-4 h-4 text-cyan-400" />
                <span>Multi-Agent Orchestrator</span>
              </h2>
              <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-cyan-950/80 text-cyan-300 border border-cyan-500/40">
                DAG Workflow
              </span>
            </div>
            <p className="text-xs text-slate-300">
              Decomposes goals into specialized subtasks: Research ➔ Analyst ➔ Writer ➔ Reviewer.
            </p>
          </div>
        )}
      </div>

      {/* Main Body: Workflow DAG Visualizer (in workflow mode) OR Terminal Execution Log (in single mode) */}
      {mode === "workflow" ? (
        <div className="flex-1 rounded-2xl glass-panel border border-slate-700/80 p-3.5 flex flex-col overflow-hidden shadow-2xl gap-2">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800/80">
            <div className="flex items-center gap-2 text-xs font-bold text-cyan-300">
              <Network className="w-3.5 h-3.5 text-cyan-400" />
              <span>ACTIVE WORKFLOW & SUBTASK DAG</span>
            </div>
            {activeWorkflow && (
              <span
                className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded border ${
                  activeWorkflow.status === "completed"
                    ? "bg-emerald-950/80 text-emerald-300 border-emerald-500/50"
                    : activeWorkflow.status === "failed"
                    ? "bg-rose-950/80 text-rose-300 border-rose-500/50"
                    : "bg-cyan-950/80 text-cyan-300 border-cyan-500/50 animate-pulse"
                }`}
              >
                {activeWorkflow.status}
              </span>
            )}
          </div>

          {/* Subtask DAG Cards Scrollable Area */}
          <div className="flex-1 overflow-y-auto pr-1 flex flex-col gap-2 select-text text-xs">
            {!activeWorkflow || !activeWorkflow.subtasks || activeWorkflow.subtasks.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center text-slate-500 gap-2 p-4">
                <Sparkles className="w-8 h-8 text-cyan-600 animate-pulse" />
                <p className="text-slate-400 font-medium">No multi-agent workflow active.</p>
                <p className="text-[11px] text-slate-500">
                  Choose a mission template below or type a complex goal to watch the fleet collaborate!
                </p>
              </div>
            ) : (
              <>
                <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800">
                  <div className="text-[11px] text-slate-400 uppercase font-mono">Workflow Objective</div>
                  <div className="text-xs font-semibold text-slate-200 mt-0.5">{activeWorkflow.title}</div>
                </div>

                {/* Subtask Cards */}
                <div className="flex flex-col gap-2 mt-1">
                  {activeWorkflow.subtasks.map((st, idx) => {
                    const agentColor = getAgentColor(st.agent_type);
                    const isCompleted = st.status === "completed";
                    const isRunning = st.status === "running";
                    const isFailed = st.status === "failed";
                    const isPending = st.status === "pending";

                    return (
                      <div
                        key={st.id || idx}
                        className={`p-2.5 rounded-xl border transition-all ${
                          isRunning
                            ? "bg-cyan-950/40 border-cyan-500/60 shadow-lg shadow-cyan-950/50 ring-1 ring-cyan-500/30"
                            : isCompleted
                            ? "bg-emerald-950/20 border-emerald-500/40"
                            : isFailed
                            ? "bg-rose-950/20 border-rose-500/40"
                            : "bg-slate-900/60 border-slate-800/80 opacity-70"
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1.5">
                          <div className="flex items-center gap-1.5">
                            <span
                              className="w-2 h-2 rounded-full"
                              style={{ backgroundColor: agentColor }}
                            />
                            <span className="font-bold text-slate-200 text-xs">
                              {idx + 1}. {st.title}
                            </span>
                          </div>
                          <span
                            className={`text-[9px] font-mono uppercase px-1.5 py-0.5 rounded border ${
                              isRunning
                                ? "bg-cyan-500/20 text-cyan-300 border-cyan-500/40 animate-pulse"
                                : isCompleted
                                ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
                                : isFailed
                                ? "bg-rose-500/20 text-rose-300 border-rose-500/40"
                                : "bg-slate-800 text-slate-400 border-slate-700"
                            }`}
                          >
                            {isRunning ? "Running..." : st.status}
                          </span>
                        </div>

                        <div className="text-[11px] text-slate-400 mb-1">
                          Role: <span className="font-mono text-slate-300 uppercase">{st.agent_type || "general"}</span>
                          {st.dependencies && st.dependencies.length > 0 && (
                            <span className="ml-2 text-slate-500">
                              (Prereqs: {st.dependencies.join(", ")})
                            </span>
                          )}
                        </div>

                        {st.result_summary && (
                          <div className="text-[11px] text-emerald-300/90 bg-emerald-950/30 p-1.5 rounded-lg border border-emerald-800/40 mt-1 line-clamp-3">
                            ✓ {st.result_summary}
                          </div>
                        )}
                        {st.error_message && (
                          <div className="text-[11px] text-rose-300/90 bg-rose-950/30 p-1.5 rounded-lg border border-rose-800/40 mt-1">
                            ✗ {st.error_message}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Final Aggregated Summary / Reviewer Card */}
                {activeWorkflow.result_summary && (
                  <div className="p-3 rounded-xl bg-slate-900 border border-emerald-500/40 mt-2">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-400 mb-1">
                      <ShieldCheck className="w-4 h-4 text-emerald-400" />
                      <span>Aggregated Report & Quality Audit</span>
                    </div>
                    <div className="text-[11px] text-slate-300 whitespace-pre-line leading-relaxed max-h-40 overflow-y-auto pr-1">
                      {activeWorkflow.result_summary}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      ) : (
        /* Terminal & Execution Log Timeline (Single Agent Mode) */
        <div className="flex-1 rounded-2xl glass-panel border border-slate-700/80 p-4 flex flex-col overflow-hidden shadow-2xl">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800/80 mb-2">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-300">
              <Terminal className="w-3.5 h-3.5 text-cyan-400" />
              <span>REALTIME EXECUTION LOG</span>
            </div>
            {activeTask && (
              <span className="text-[10px] font-mono text-slate-500">
                Task #{activeTask.id.slice(0, 8)}
              </span>
            )}
          </div>

          <div className="flex-1 overflow-y-auto pr-1 flex flex-col gap-2.5 select-text text-xs">
            {events.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center text-slate-500 gap-2 p-4">
                <Sparkles className="w-8 h-8 text-slate-600 animate-pulse" />
                <p>No active missions.</p>
                <p className="text-[11px] text-slate-600">
                  Dispatch an instruction below to watch real tool execution!
                </p>
              </div>
            ) : (
              events.map((ev) => (
                <div
                  key={ev.id}
                  className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800/80 flex flex-col gap-1"
                >
                  <div className="flex items-center justify-between text-[10px] text-slate-500 font-mono">
                    <span className="text-cyan-400 font-bold">{ev.event_type}</span>
                    <span>{new Date(ev.timestamp).toLocaleTimeString()}</span>
                  </div>
                  <div className="text-slate-300 text-xs">
                    {ev.payload?.title || ev.payload?.summary || JSON.stringify(ev.payload)}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Suggested Quick Missions Bar */}
      <div className="flex items-center gap-1.5 overflow-x-auto py-1 scrollbar-none">
        {mode === "workflow" ? (
          <>
            <button
              onClick={() =>
                setSuggestedPrompt("Comprehensive workspace security and architecture audit report")
              }
              className="whitespace-nowrap px-2.5 py-1 rounded-lg text-[10px] bg-cyan-950/80 hover:bg-cyan-900 border border-cyan-500/60 text-cyan-200 transition-all cursor-pointer"
            >
              🚀 Audit Architecture (Multi-Agent)
            </button>
            <button
              onClick={() =>
                setSuggestedPrompt("Analyze workspace telemetry, calculate metrics, and write verified summary")
              }
              className="whitespace-nowrap px-2.5 py-1 rounded-lg text-[10px] bg-blue-950/80 hover:bg-blue-900 border border-blue-500/60 text-blue-200 transition-all cursor-pointer"
            >
              📊 Data & Metrics Workflow (Multi-Agent)
            </button>
          </>
        ) : (
          <>
            <button
              onClick={() => setSuggestedPrompt("Run system diagnostic and check CPU/memory specs")}
              className="whitespace-nowrap px-2.5 py-1 rounded-lg text-[10px] bg-slate-900/90 hover:bg-slate-800 border border-slate-700/80 text-cyan-300 cursor-pointer"
            >
              ⚙️ System Telemetry
            </button>
            <button
              onClick={() => setSuggestedPrompt("Calculate (1024 * 768) / 60")}
              className="whitespace-nowrap px-2.5 py-1 rounded-lg text-[10px] bg-slate-900/90 hover:bg-slate-800 border border-slate-700/80 text-sky-300 cursor-pointer"
            >
              🧮 Math Calc
            </button>
            <button
              onClick={() => setSuggestedPrompt("List files in sandbox workspace directory")}
              className="whitespace-nowrap px-2.5 py-1 rounded-lg text-[10px] bg-slate-900/90 hover:bg-slate-800 border border-slate-700/80 text-emerald-300 cursor-pointer"
            >
              📂 List Files
            </button>
          </>
        )}
      </div>

      {/* Mission Input Box */}
      <form onSubmit={handleSend} className="relative">
        <input
          type="text"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder={
            mode === "workflow"
              ? "Dispatch multi-agent fleet mission (e.g. Audit workspace architecture)..."
              : selectedAgent
              ? `Order ${selectedAgent.name.split(" ")[0]}...`
              : "Select an agent first..."
          }
          disabled={(mode === "single" && !selectedAgent) || isLoading}
          className="w-full pl-4 pr-12 py-3 rounded-2xl glass-input text-xs text-slate-100 placeholder-slate-500 disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={!prompt.trim() || (mode === "single" && !selectedAgent) || isLoading}
          className={`absolute right-2 top-2 p-2 rounded-xl transition-all disabled:opacity-30 cursor-pointer shadow-md ${
            mode === "workflow"
              ? "bg-cyan-500 hover:bg-cyan-400 text-slate-950 shadow-cyan-500/30"
              : "bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-amber-500/30"
          }`}
        >
          <Send className="w-3.5 h-3.5" />
        </button>
      </form>
    </div>
  );
}
