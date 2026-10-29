"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useWorldStore } from "@/store/worldStore";
import { ToolDefinition, ToolExecutionRecord, ToolCategory } from "@/types/tool";
import { fetchTools, toggleTool, fetchToolExecutions, testExecuteTool } from "@/lib/api/tools";

export const ToolCenterModal: React.FC = () => {
  const { isToolCenterOpen, setIsToolCenterOpen, toolRefreshTrigger } = useWorldStore();

  const [activeTab, setActiveTab] = useState<"catalog" | "executions" | "tester">("catalog");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [tools, setTools] = useState<ToolDefinition[]>([]);
  const [selectedTool, setSelectedTool] = useState<ToolDefinition | null>(null);
  const [executions, setExecutions] = useState<ToolExecutionRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Tester state
  const [testerToolName, setTesterToolName] = useState<string>("data.inspect");
  const [testerArgsJson, setTesterArgsJson] = useState<string>('{\n  "filepath": "workspace_sandbox/sample.json"\n}');
  const [testerResult, setTesterResult] = useState<any>(null);
  const [testerLoading, setTesterLoading] = useState<boolean>(false);

  // Load tools
  useEffect(() => {
    if (!isToolCenterOpen) return;
    setLoading(true);
    fetchTools()
      .then((data) => {
        setTools(data);
        if (data.length > 0 && !selectedTool) {
          setSelectedTool(data[0]);
        }
      })
      .catch((err) => console.error("Failed to load tools:", err))
      .finally(() => setLoading(false));
  }, [isToolCenterOpen, toolRefreshTrigger]);

  // Load executions
  useEffect(() => {
    if (!isToolCenterOpen) return;
    fetchToolExecutions({ limit: 40 })
      .then((data) => setExecutions(data))
      .catch((err) => console.error("Failed to load executions:", err));
  }, [isToolCenterOpen, toolRefreshTrigger, activeTab]);

  const filteredTools = useMemo(() => {
    return tools.filter((tool) => {
      const matchCat = selectedCategory === "all" || tool.category === selectedCategory;
      const matchSearch =
        tool.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        tool.display_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        tool.description.toLowerCase().includes(searchQuery.toLowerCase());
      return matchCat && matchSearch;
    });
  }, [tools, selectedCategory, searchQuery]);

  const handleToggle = async (tool: ToolDefinition) => {
    setActionLoading(tool.name);
    try {
      const updated = await toggleTool(tool.name, !tool.is_enabled);
      setTools((prev) => prev.map((t) => (t.name === tool.name ? updated : t)));
      if (selectedTool?.name === tool.name) {
        setSelectedTool(updated);
      }
    } catch (err: any) {
      alert(`Toggle failed: ${err.message}`);
    } finally {
      setActionLoading(null);
    }
  };

  const handleRunTest = async () => {
    setTesterLoading(true);
    setTesterResult(null);
    try {
      const parsedArgs = JSON.parse(testerArgsJson);
      const res = await testExecuteTool(testerToolName, parsedArgs);
      setTesterResult(res);
      // Refresh execution list
      fetchToolExecutions({ limit: 40 }).then((data) => setExecutions(data));
    } catch (err: any) {
      setTesterResult({ success: false, error: err.message, output: "Execution failed to start" });
    } finally {
      setTesterLoading(false);
    }
  };

  if (!isToolCenterOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-6xl h-[88vh] bg-[#0c121e]/95 border border-cyan-500/40 rounded-2xl shadow-2xl flex flex-col overflow-hidden text-slate-100 font-sans">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-cyan-500/20 bg-gradient-to-r from-blue-950/60 via-slate-900/60 to-purple-950/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/20 border border-cyan-400/40 flex items-center justify-center text-cyan-300 text-xl shadow-[0_0_15px_rgba(6,182,212,0.4)]">
              🛠️
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-wide text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 via-amber-200 to-amber-400">
                GRAND LINE TOOL ECOSYSTEM & SKILLS FOUNDRY
              </h2>
              <p className="text-xs text-cyan-200/60">
                Milestone 8 — Tool Registry, Sandbox Workspace, Data Analytics & Audit Trail
              </p>
            </div>
          </div>

          {/* Navigation Tabs & Close */}
          <div className="flex items-center gap-3">
            <div className="flex bg-slate-900/80 p-1 rounded-xl border border-slate-700/60 text-xs">
              <button
                onClick={() => setActiveTab("catalog")}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  activeTab === "catalog"
                    ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-semibold"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                Tool Catalog ({tools.length})
              </button>
              <button
                onClick={() => setActiveTab("executions")}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  activeTab === "executions"
                    ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-semibold"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                Execution Audit ({executions.length})
              </button>
              <button
                onClick={() => setActiveTab("tester")}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  activeTab === "tester"
                    ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-semibold"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                Interactive Runner
              </button>
            </div>

            <button
              onClick={() => setIsToolCenterOpen(false)}
              className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-600 flex items-center justify-center text-slate-300 transition-colors"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Tab 1: Tool Catalog */}
        {activeTab === "catalog" && (
          <div className="flex-1 flex overflow-hidden">
            {/* Left side: Filters & Tools Grid */}
            <div className="flex-1 flex flex-col p-6 overflow-hidden border-r border-slate-800">
              {/* Category Pills & Search */}
              <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                <div className="flex flex-wrap gap-1.5 text-xs">
                  {["all", "workspace", "artifact", "data", "web", "api", "memory"].map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setSelectedCategory(cat)}
                      className={`px-3 py-1 rounded-full uppercase tracking-wider text-[11px] transition-all ${
                        selectedCategory === cat
                          ? "bg-cyan-500 text-slate-950 font-bold shadow-[0_0_10px_rgba(6,182,212,0.5)]"
                          : "bg-slate-800/80 text-slate-400 hover:bg-slate-700 hover:text-slate-200 border border-slate-700"
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>

                <div className="relative w-64">
                  <input
                    type="text"
                    placeholder="Search tools..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-slate-900/90 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-400"
                  />
                </div>
              </div>

              {/* Tools List */}
              <div className="flex-1 overflow-y-auto space-y-2.5 pr-2 custom-scrollbar">
                {filteredTools.map((tool) => {
                  const isSelected = selectedTool?.name === tool.name;
                  return (
                    <div
                      key={tool.name}
                      onClick={() => setSelectedTool(tool)}
                      className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-4 ${
                        isSelected
                          ? "bg-slate-800/90 border-cyan-400/80 shadow-[0_0_15px_rgba(6,182,212,0.15)]"
                          : "bg-slate-900/60 border-slate-800 hover:border-slate-700 hover:bg-slate-850"
                      }`}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-semibold text-sm text-cyan-200 truncate">
                            {tool.display_name}
                          </span>
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
                            v{tool.version}
                          </span>
                          <span
                            className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                              tool.category === "workspace"
                                ? "bg-emerald-950/80 text-emerald-300 border border-emerald-500/40"
                                : tool.category === "artifact"
                                ? "bg-amber-950/80 text-amber-300 border border-amber-500/40"
                                : tool.category === "data"
                                ? "bg-cyan-950/80 text-cyan-300 border border-cyan-500/40"
                                : tool.category === "web"
                                ? "bg-blue-950/80 text-blue-300 border border-blue-500/40"
                                : tool.category === "api"
                                ? "bg-purple-950/80 text-purple-300 border border-purple-500/40"
                                : "bg-fuchsia-950/80 text-fuchsia-300 border border-fuchsia-500/40"
                            }`}
                          >
                            {tool.category}
                          </span>
                          {tool.permission_level === 0 && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-900/40 text-blue-300">
                              L0 Read-Only
                            </span>
                          )}
                          {tool.permission_level === 1 && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-900/40 text-amber-300">
                              L1 Sandbox Write
                            </span>
                          )}
                          {tool.permission_level === 2 && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-900/40 text-red-300">
                              L2 Admin/Exec
                            </span>
                          )}
                          {tool.requires_approval && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-950 text-red-400 border border-red-500/30">
                              ⚠️ Approval Required
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-400 line-clamp-1">{tool.description}</p>
                      </div>

                      <div className="flex items-center gap-3">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleToggle(tool);
                          }}
                          disabled={actionLoading === tool.name}
                          className={`text-xs px-3 py-1 rounded-lg border font-medium transition-all ${
                            tool.is_enabled
                              ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40 hover:bg-emerald-500/30"
                              : "bg-red-500/20 text-red-400 border-red-500/40 hover:bg-red-500/30"
                          }`}
                        >
                          {tool.is_enabled ? "Active" : "Disabled"}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Right side: Tool Inspector */}
            <div className="w-96 p-6 bg-slate-900/40 flex flex-col overflow-y-auto custom-scrollbar">
              {selectedTool ? (
                <div className="space-y-4">
                  <div className="pb-3 border-b border-slate-800">
                    <span className="text-xs uppercase tracking-wider text-cyan-400 font-semibold">
                      Tool Specification
                    </span>
                    <h3 className="text-base font-bold text-slate-100 mt-1">{selectedTool.display_name}</h3>
                    <code className="text-xs text-amber-300">{selectedTool.name}</code>
                  </div>

                  <div>
                    <span className="text-xs text-slate-400 font-medium">Description</span>
                    <p className="text-xs text-slate-300 mt-1 bg-slate-950/60 p-2.5 rounded-lg border border-slate-800">
                      {selectedTool.description}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="p-2 rounded bg-slate-950/60 border border-slate-800">
                      <span className="text-slate-400 block text-[10px]">TIMEOUT</span>
                      <span className="font-semibold text-slate-200">{selectedTool.execution_timeout}s</span>
                    </div>
                    <div className="p-2 rounded bg-slate-950/60 border border-slate-800">
                      <span className="text-slate-400 block text-[10px]">RATE LIMIT</span>
                      <span className="font-semibold text-slate-200">{selectedTool.rate_limit} req/min</span>
                    </div>
                    <div className="p-2 rounded bg-slate-950/60 border border-slate-800">
                      <span className="text-slate-400 block text-[10px]">MAX OUTPUT</span>
                      <span className="font-semibold text-slate-200">{selectedTool.max_output_size} chars</span>
                    </div>
                    <div className="p-2 rounded bg-slate-950/60 border border-slate-800">
                      <span className="text-slate-400 block text-[10px]">SIDE EFFECT</span>
                      <span className="font-semibold text-slate-200 uppercase text-[11px]">{selectedTool.side_effect_level}</span>
                    </div>
                  </div>

                  <div>
                    <span className="text-xs text-slate-400 font-medium">Input Parameters Schema</span>
                    <pre className="text-[11px] bg-slate-950 text-cyan-300 p-3 rounded-lg border border-slate-800 overflow-x-auto mt-1 max-h-56">
                      {JSON.stringify(selectedTool.input_schema, null, 2)}
                    </pre>
                  </div>

                  <div className="pt-2">
                    <button
                      onClick={() => {
                        setTesterToolName(selectedTool.name);
                        setActiveTab("tester");
                      }}
                      className="w-full py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs transition-all shadow-[0_0_12px_rgba(6,182,212,0.4)]"
                    >
                      Test Run This Tool →
                    </button>
                  </div>
                </div>
              ) : (
                <div className="h-full flex items-center justify-center text-xs text-slate-500">
                  Select a tool from the catalog to inspect schema and parameters.
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab 2: Execution Audit Inspector */}
        {activeTab === "executions" && (
          <div className="flex-1 flex flex-col p-6 overflow-hidden">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold text-cyan-200">Execution Telemetry & Audit History</h3>
                <p className="text-xs text-slate-400">
                  Immutable record of tool invocations across autonomous agents with durations, status, and outputs.
                </p>
              </div>
              <span className="text-xs bg-slate-800 px-3 py-1 rounded-full text-slate-300 border border-slate-700">
                {executions.length} Recorded Invocations
              </span>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
              {executions.length === 0 ? (
                <div className="h-64 flex items-center justify-center text-slate-500 text-sm">
                  No tool execution records found.
                </div>
              ) : (
                executions.map((exec) => (
                  <div
                    key={exec.id}
                    className="p-3 bg-slate-900/80 border border-slate-800 rounded-xl flex flex-col gap-2 hover:border-slate-700 transition-colors"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-cyan-300 font-mono">{exec.tool_name}</span>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase ${
                            exec.status === "succeeded"
                              ? "bg-emerald-950 text-emerald-300 border border-emerald-500/40"
                              : exec.status === "failed"
                              ? "bg-red-950 text-red-400 border border-red-500/40"
                              : "bg-amber-950 text-amber-300 border border-amber-500/40"
                          }`}
                        >
                          {exec.status}
                        </span>
                        <span className="text-slate-400 text-[11px]">{exec.duration_ms}ms</span>
                      </div>
                      <span className="text-slate-500 text-[11px]">
                        {new Date(exec.created_at).toLocaleTimeString()}
                      </span>
                    </div>

                    {exec.output_summary && (
                      <p className="text-xs text-slate-300 bg-slate-950/60 p-2 rounded border border-slate-800 font-mono line-clamp-2">
                        {exec.output_summary}
                      </p>
                    )}

                    {exec.error && (
                      <p className="text-xs text-red-400 bg-red-950/40 p-2 rounded border border-red-900/40 font-mono">
                        {exec.error}
                      </p>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Tab 3: Interactive Tool Runner */}
        {activeTab === "tester" && (
          <div className="flex-1 flex p-6 gap-6 overflow-hidden">
            <div className="flex-1 flex flex-col space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-400 block mb-1">Select Tool</label>
                <select
                  value={testerToolName}
                  onChange={(e) => setTesterToolName(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-cyan-200 focus:outline-none focus:border-cyan-400"
                >
                  {tools.map((t) => (
                    <option key={t.name} value={t.name}>
                      {t.display_name} ({t.name})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex-1 flex flex-col">
                <label className="text-xs font-semibold text-slate-400 block mb-1">
                  Arguments (JSON format)
                </label>
                <textarea
                  value={testerArgsJson}
                  onChange={(e) => setTesterArgsJson(e.target.value)}
                  className="flex-1 w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-amber-200 font-mono focus:outline-none focus:border-cyan-400 resize-none"
                />
              </div>

              <button
                onClick={handleRunTest}
                disabled={testerLoading}
                className="py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold text-xs transition-all shadow-[0_0_15px_rgba(6,182,212,0.4)] disabled:opacity-50"
              >
                {testerLoading ? "Executing Tool..." : "⚡ Run Tool Execution"}
              </button>
            </div>

            {/* Tester Result */}
            <div className="flex-1 flex flex-col bg-slate-950 p-4 rounded-xl border border-slate-800 overflow-hidden">
              <span className="text-xs uppercase tracking-wider text-slate-400 font-semibold mb-2">
                Execution Output & Telemetry
              </span>
              <div className="flex-1 overflow-y-auto custom-scrollbar">
                {testerResult ? (
                  <pre className="text-xs text-slate-200 font-mono whitespace-pre-wrap">
                    {JSON.stringify(testerResult, null, 2)}
                  </pre>
                ) : (
                  <div className="h-full flex items-center justify-center text-xs text-slate-600">
                    Output will appear here after execution.
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
