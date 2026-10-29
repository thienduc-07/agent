"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useWorldStore } from "@/store/worldStore";
import { Memory, MemoryOverviewStats } from "@/types/memory";
import {
  fetchMemoryOverviewStats,
  searchMemories,
  approveMemory,
  archiveMemory,
} from "@/lib/api/memories";

export const MemoryCenterModal: React.FC = () => {
  const isMemoryCenterOpen = useWorldStore((s) => s.isMemoryCenterOpen);
  const setIsMemoryCenterOpen = useWorldStore((s) => s.setIsMemoryCenterOpen);
  const memoryRefreshTrigger = useWorldStore((s) => s.memoryRefreshTrigger);

  const [stats, setStats] = useState<MemoryOverviewStats | null>(null);
  const [memories, setMemories] = useState<Memory[]>([]);
  const [selectedMemory, setSelectedMemory] = useState<Memory | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedScope, setSelectedScope] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [isLoading, setIsLoading] = useState(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  // Load overview stats and search results
  const loadData = async () => {
    setIsLoading(true);
    try {
      const [statsData, searchData] = await Promise.all([
        fetchMemoryOverviewStats(),
        searchMemories({
          query: searchQuery || undefined,
          scope_type: selectedScope !== "all" ? selectedScope : undefined,
          status: selectedStatus !== "all" ? selectedStatus : undefined,
          limit: 30,
        }),
      ]);
      setStats(statsData);
      const items = searchData.items.map((i) => i.memory);
      setMemories(items);
      if (items.length > 0 && (!selectedMemory || !items.some(m => m.id === selectedMemory.id))) {
        setSelectedMemory(items[0]);
      }
    } catch (err: any) {
      console.error("Failed to load memory center data:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isMemoryCenterOpen) {
      loadData();
    }
  }, [isMemoryCenterOpen, selectedScope, selectedStatus, memoryRefreshTrigger]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadData();
  };

  const handleApprove = async (memId: string) => {
    try {
      await approveMemory(memId);
      setActionMessage("Memory candidate approved and activated!");
      setTimeout(() => setActionMessage(null), 3000);
      loadData();
    } catch (err: any) {
      setActionMessage(`Error: ${err.message || "Failed to approve memory"}`);
    }
  };

  const handleArchive = async (memId: string) => {
    try {
      await archiveMemory(memId, "Archived via Memory Center HUD");
      setActionMessage("Memory archived successfully.");
      setTimeout(() => setActionMessage(null), 3000);
      loadData();
    } catch (err: any) {
      setActionMessage(`Error: ${err.message || "Failed to archive memory"}`);
    }
  };

  if (!isMemoryCenterOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-5xl h-[88vh] flex flex-col rounded-2xl border border-cyan-500/30 bg-[#0a121e]/95 shadow-[0_0_50px_rgba(6,182,212,0.15)] text-slate-100 overflow-hidden font-sans">
        
        {/* Top Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-cyan-500/20 bg-gradient-to-r from-slate-900 via-cyan-950/40 to-slate-900">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-cyan-500/20 border border-cyan-400/40 text-cyan-300 shadow-[0_0_15px_rgba(6,182,212,0.3)]">
              🧠
            </div>
            <div>
              <h2 className="text-lg font-bold tracking-wider text-cyan-200 uppercase">
                Grand Line Archives & Memory Center
              </h2>
              <p className="text-xs text-slate-400">
                Persistent fleet knowledge, verified findings & cross-mission context
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={loadData}
              className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-cyan-950/60 hover:bg-cyan-900/60 border border-cyan-500/30 text-cyan-300 transition-all flex items-center gap-1.5"
            >
              🔄 Refresh
            </button>
            <button
              onClick={() => setIsMemoryCenterOpen(false)}
              className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-rose-500/20 text-slate-400 hover:text-rose-300 border border-transparent hover:border-rose-500/30 transition-all text-sm font-bold"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Action Alert Banner */}
        {actionMessage && (
          <div className="px-6 py-2 bg-cyan-500/10 border-b border-cyan-500/30 text-cyan-300 text-xs flex items-center justify-between animate-fade-in">
            <span>ℹ️ {actionMessage}</span>
            <button onClick={() => setActionMessage(null)} className="text-slate-400 hover:text-white">✕</button>
          </div>
        )}

        {/* Stats Metrics Ribbon */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 px-6 py-3 bg-slate-950/40 border-b border-cyan-500/10 text-xs">
            <div className="p-2.5 rounded-xl bg-slate-900/70 border border-cyan-500/20">
              <span className="text-slate-400">Active Knowledge</span>
              <div className="text-lg font-bold text-emerald-400 mt-0.5">{stats.total_active} items</div>
            </div>
            <div className="p-2.5 rounded-xl bg-slate-900/70 border border-amber-500/20">
              <span className="text-slate-400">Pending Candidates</span>
              <div className="text-lg font-bold text-amber-400 mt-0.5">{stats.total_candidate} items</div>
            </div>
            <div className="p-2.5 rounded-xl bg-slate-900/70 border border-slate-700">
              <span className="text-slate-400">Archived Records</span>
              <div className="text-lg font-bold text-slate-300 mt-0.5">{stats.total_archived} items</div>
            </div>
            <div className="p-2.5 rounded-xl bg-slate-900/70 border border-cyan-500/20">
              <span className="text-slate-400">Scopes Breakdown</span>
              <div className="text-xs font-semibold text-cyan-300 mt-1 flex gap-2">
                <span>Shared: {stats.by_scope?.shared || 0}</span>
                <span>Agent: {stats.by_scope?.agent || 0}</span>
                <span>Task: {stats.by_scope?.task || 0}</span>
              </div>
            </div>
          </div>
        )}

        {/* Search & Scope Filters Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-3 border-b border-cyan-500/15 bg-slate-900/50">
          <form onSubmit={handleSearchSubmit} className="flex-1 min-w-[280px]">
            <div className="relative">
              <input
                type="text"
                placeholder="Search knowledge by keywords, architecture, guidelines..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-3.5 py-1.5 pl-9 rounded-lg bg-slate-950/80 border border-cyan-500/30 text-slate-200 placeholder-slate-500 text-xs focus:outline-none focus:border-cyan-400 transition-all"
              />
              <span className="absolute left-3 top-2 text-slate-500 text-xs">🔍</span>
            </div>
          </form>

          {/* Scope Filters */}
          <div className="flex items-center gap-1.5 text-xs overflow-x-auto pb-1 md:pb-0">
            <span className="text-slate-400 mr-1 text-[11px] uppercase tracking-wider">Scope:</span>
            {["all", "shared", "agent", "task"].map((sc) => (
              <button
                key={sc}
                onClick={() => setSelectedScope(sc)}
                className={`px-2.5 py-1 rounded-md text-[11px] font-semibold uppercase tracking-wider transition-all ${
                  selectedScope === sc
                    ? "bg-cyan-500/30 border border-cyan-400 text-cyan-200 shadow-[0_0_10px_rgba(6,182,212,0.2)]"
                    : "bg-slate-900/80 border border-slate-700 text-slate-400 hover:text-slate-200"
                }`}
              >
                {sc}
              </button>
            ))}

            <span className="text-slate-400 mx-1 text-[11px] uppercase tracking-wider">Status:</span>
            {["all", "active", "candidate", "archived"].map((st) => (
              <button
                key={st}
                onClick={() => setSelectedStatus(st)}
                className={`px-2.5 py-1 rounded-md text-[11px] font-semibold uppercase tracking-wider transition-all ${
                  selectedStatus === st
                    ? "bg-amber-500/30 border border-amber-400 text-amber-200"
                    : "bg-slate-900/80 border border-slate-700 text-slate-400 hover:text-slate-200"
                }`}
              >
                {st}
              </button>
            ))}
          </div>
        </div>

        {/* Content Split Area */}
        <div className="flex-1 flex overflow-hidden">
          
          {/* Left Column: Memory List */}
          <div className="w-2/5 border-r border-cyan-500/15 overflow-y-auto p-4 space-y-2.5 bg-slate-950/20">
            {isLoading && memories.length === 0 ? (
              <div className="text-center py-12 text-slate-500 text-xs">
                Scanning archives...
              </div>
            ) : memories.length === 0 ? (
              <div className="text-center py-12 text-slate-500 text-xs">
                No memories match your query or scope filter.
              </div>
            ) : (
              memories.map((mem) => {
                const isSelected = selectedMemory?.id === mem.id;
                return (
                  <div
                    key={mem.id}
                    onClick={() => setSelectedMemory(mem)}
                    className={`p-3 rounded-xl border cursor-pointer transition-all ${
                      isSelected
                        ? "bg-cyan-950/40 border-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.15)] text-slate-100"
                        : "bg-slate-900/60 border-slate-800 hover:border-cyan-500/30 text-slate-300"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <h4 className="text-xs font-bold leading-snug line-clamp-2 text-cyan-200">
                        {mem.title}
                      </h4>
                      <span
                        className={`px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase ${
                          mem.status === "active"
                            ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                            : mem.status === "candidate"
                            ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                            : "bg-slate-700 text-slate-300"
                        }`}
                      >
                        {mem.status}
                      </span>
                    </div>

                    <p className="text-[11px] text-slate-400 mt-1 line-clamp-2">
                      {mem.summary || mem.content}
                    </p>

                    <div className="flex items-center gap-2 mt-2 pt-2 border-t border-slate-800/80 text-[10px] text-slate-500">
                      <span className="uppercase text-cyan-400 font-medium">
                        {mem.scope_type}
                      </span>
                      {mem.owner_agent_id && (
                        <span>• Agent: {mem.owner_agent_id.replace("agent-", "")}</span>
                      )}
                      <span>• {(mem.confidence * 100).toFixed(0)}% Conf</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Right Column: Detailed Inspector */}
          <div className="w-3/5 overflow-y-auto p-6 flex flex-col bg-slate-900/30">
            {selectedMemory ? (
              <div className="space-y-5">
                {/* Header Info */}
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="px-2 py-0.5 rounded text-[10px] font-semibold uppercase bg-cyan-500/20 border border-cyan-400/40 text-cyan-300">
                      Scope: {selectedMemory.scope_type}
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-semibold uppercase bg-slate-800 border border-slate-700 text-slate-300">
                      Type: {selectedMemory.memory_type}
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-semibold uppercase bg-emerald-500/20 border border-emerald-500/30 text-emerald-300">
                      Verification: {selectedMemory.verification_status}
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-cyan-100">
                    {selectedMemory.title}
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">
                    ID: <code className="text-cyan-400">{selectedMemory.id}</code>
                  </p>
                </div>

                {/* Provenance Box */}
                <div className="p-3.5 rounded-xl bg-slate-950/60 border border-cyan-500/20 text-xs space-y-1.5">
                  <div className="font-semibold text-cyan-300 uppercase tracking-wider text-[11px]">
                    🛡️ Source Provenance & Verification
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-slate-300">
                    <div>
                      <span className="text-slate-500">Source Task:</span>{" "}
                      {selectedMemory.source_task_id ? (
                        <code className="text-cyan-300">{selectedMemory.source_task_id.slice(0, 8)}...</code>
                      ) : (
                        "Archival / Seed"
                      )}
                    </div>
                    <div>
                      <span className="text-slate-500">Creating Agent:</span>{" "}
                      {selectedMemory.owner_agent_id || "System"}
                    </div>
                    <div>
                      <span className="text-slate-500">Source Type:</span> {selectedMemory.source_type}
                    </div>
                    <div>
                      <span className="text-slate-500">Access Count:</span> {selectedMemory.access_count} times
                    </div>
                  </div>
                </div>

                {/* Summary */}
                {selectedMemory.summary && (
                  <div>
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
                      Summary
                    </h4>
                    <div className="p-3 rounded-lg bg-slate-950/40 border border-slate-800 text-xs text-slate-300 leading-relaxed">
                      {selectedMemory.summary}
                    </div>
                  </div>
                )}

                {/* Full Content */}
                <div>
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
                    Knowledge Content
                  </h4>
                  <div className="p-4 rounded-xl bg-slate-950/80 border border-cyan-500/20 text-xs text-slate-200 leading-relaxed font-mono whitespace-pre-wrap">
                    {selectedMemory.content}
                  </div>
                </div>

                {/* Actions */}
                <div className="pt-4 border-t border-slate-800 flex items-center justify-between">
                  <div className="text-[11px] text-slate-500">
                    Created: {selectedMemory.created_at ? new Date(selectedMemory.created_at).toLocaleString() : "N/A"}
                  </div>

                  <div className="flex items-center gap-2">
                    {selectedMemory.status === "candidate" && (
                      <button
                        onClick={() => handleApprove(selectedMemory.id)}
                        className="px-3.5 py-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-400/40 text-emerald-300 text-xs font-bold transition-all shadow-[0_0_15px_rgba(16,185,129,0.2)]"
                      >
                        ✓ Authorize & Activate
                      </button>
                    )}

                    {selectedMemory.status === "active" && (
                      <button
                        onClick={() => handleArchive(selectedMemory.id)}
                        className="px-3.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-600 text-slate-300 text-xs font-semibold transition-all"
                      >
                        📁 Archive Memory
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-500 text-xs">
                Select a memory from the list to inspect its contents and provenance.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
