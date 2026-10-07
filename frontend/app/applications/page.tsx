"use client";

import { useState } from "react";
import { 
  Send, 
  Sparkles, 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  Play, 
  Bot, 
  Layers, 
  ArrowRight,
  ShieldAlert,
  Laptop
} from "lucide-react";

export default function ApplicationsPage() {
  const [activeTab, setActiveTab] = useState<"pipeline" | "mapping" | "automation">("pipeline");
  const [automationState, setAutomationState] = useState<"idle" | "launching" | "mapping" | "filling" | "approval_required">("idle");
  const [logs, setLogs] = useState<string[]>([]);

  const runPlaywrightAutomation = () => {
    setAutomationState("launching");
    setLogs(["[00:01] Launching Playwright browser instance for MIT EECS portal..."]);

    setTimeout(() => {
      setAutomationState("mapping");
      setLogs((prev) => [
        ...prev,
        "[00:02] Playwright loaded portal fields: ['Applicant Name', 'Cumulative GPA', 'GRE Score', 'Work Experience']",
        "[00:03] Semantic Mapping Engine activated — matching fields with Verified Student Profile..."
      ]);
    }, 1000);

    setTimeout(() => {
      setAutomationState("filling");
      setLogs((prev) => [
        ...prev,
        "[00:04] Auto-filling 'Applicant Name' -> 'Alex Morgan' (Source: passport.pdf)",
        "[00:05] Auto-filling 'Cumulative GPA' -> '3.85' (Source: official_transcript.pdf)",
        "[00:06] Auto-filling 'GRE Score' -> '325' (Source: gre_report.pdf)"
      ]);
    }, 2200);

    setTimeout(() => {
      setAutomationState("approval_required");
      setLogs((prev) => [
        ...prev,
        "[00:07] Action 'submit_final_application' identified as HIGH-RISK.",
        "[00:08] Human-in-the-Loop Gate triggered! Created request_student_approval()."
      ]);
    }, 3500);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-xs font-semibold text-cyan-300 mb-2">
            <Layers className="w-3.5 h-3.5 text-cyan-400" />
            Application Orchestration Platform
          </div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight">Application Orchestrator</h1>
          <p className="text-xs text-slate-400">
            Semantic Question Mapping + Playwright Automation + Human-in-the-Loop Approval Control.
          </p>
        </div>

        {/* Action Button */}
        <button
          onClick={runPlaywrightAutomation}
          disabled={automationState !== "idle" && automationState !== "approval_required"}
          className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 via-purple-600 to-cyan-500 text-white font-semibold text-xs shadow-lg shadow-indigo-500/20 hover:opacity-90 transition-all flex items-center gap-2"
        >
          <Play className="w-4 h-4 text-cyan-300" />
          Trigger Playwright Auto-Fill (Demo)
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-800 gap-6 text-sm font-semibold text-slate-400">
        <button
          onClick={() => setActiveTab("pipeline")}
          className={`pb-3 flex items-center gap-2 border-b-2 transition-colors ${
            activeTab === "pipeline" ? "border-indigo-500 text-indigo-300" : "border-transparent hover:text-slate-200"
          }`}
        >
          <Clock className="w-4 h-4" /> Application Pipeline & State Machine
        </button>
        <button
          onClick={() => setActiveTab("mapping")}
          className={`pb-3 flex items-center gap-2 border-b-2 transition-colors ${
            activeTab === "mapping" ? "border-indigo-500 text-indigo-300" : "border-transparent hover:text-slate-200"
          }`}
        >
          <Sparkles className="w-4 h-4" /> Semantic Question Mapping Layer
        </button>
        <button
          onClick={() => setActiveTab("automation")}
          className={`pb-3 flex items-center gap-2 border-b-2 transition-colors ${
            activeTab === "automation" ? "border-indigo-500 text-indigo-300" : "border-transparent hover:text-slate-200"
          }`}
        >
          <Laptop className="w-4 h-4" /> Playwright / API Execution Layer
        </button>
      </div>

      {/* Tab 1: State Machine Pipeline */}
      {activeTab === "pipeline" && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-3 text-xs font-semibold">
            {["DRAFT", "PREPARING", "READY FOR REVIEW", "APPROVED", "SUBMITTED"].map((step, idx) => (
              <div
                key={step}
                className={`p-3 rounded-xl border text-center space-y-1 ${
                  idx < 3
                    ? "bg-indigo-500/10 border-indigo-500/30 text-indigo-300"
                    : idx === 3
                    ? "bg-amber-500/10 border-amber-500/30 text-amber-300"
                    : "bg-slate-900 border-slate-800 text-slate-500"
                }`}
              >
                <div className="text-[10px] text-slate-500 font-mono">STEP 0{idx + 1}</div>
                <div>{step}</div>
              </div>
            ))}
          </div>

          <div className="glass-card p-6 rounded-2xl border border-slate-800 space-y-4">
            <h3 className="text-base font-bold text-white">MIT EECS Application State</h3>
            <div className="flex items-center justify-between text-xs text-slate-300">
              <span>Current Status: <strong className="text-emerald-400">READY FOR REVIEW (90%)</strong></span>
              <span>Primary Automation Layer: <strong className="text-indigo-400">Playwright Web Automation</strong></span>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Semantic Question Mapping */}
      {activeTab === "mapping" && (
        <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-4">
          <h3 className="text-base font-bold text-white">Canonical Profile → Portal Form Semantic Mapping</h3>
          <p className="text-xs text-slate-400">
            UniPro maps your single verified profile fields to diverse portal question prompts without re-entering data.
          </p>

          <div className="space-y-3 pt-2">
            <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 grid grid-cols-3 gap-4 text-xs">
              <div>
                <span className="text-[10px] text-slate-500 uppercase font-semibold">Verified Student Profile</span>
                <p className="text-white font-bold mt-1">experience[0] = Google (3 mos)</p>
              </div>
              <div className="flex items-center justify-center">
                <ArrowRight className="w-4 h-4 text-indigo-400" />
              </div>
              <div>
                <span className="text-[10px] text-slate-500 uppercase font-semibold">Portal Form Question</span>
                <p className="text-indigo-300 font-bold mt-1">Stanford: "Employment History"</p>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 grid grid-cols-3 gap-4 text-xs">
              <div>
                <span className="text-[10px] text-slate-500 uppercase font-semibold">Verified Student Profile</span>
                <p className="text-white font-bold mt-1">education[0].gpa = 3.85</p>
              </div>
              <div className="flex items-center justify-center">
                <ArrowRight className="w-4 h-4 text-indigo-400" />
              </div>
              <div>
                <span className="text-[10px] text-slate-500 uppercase font-semibold">Portal Form Question</span>
                <p className="text-indigo-300 font-bold mt-1">MIT: "Cumulative Grade Point Average"</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: Playwright Automation Console */}
      {(activeTab === "automation" || automationState !== "idle") && (
        <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Bot className="w-5 h-5 text-cyan-400" />
              Playwright Execution Terminal
            </h3>
            <span className="text-xs font-mono px-2.5 py-1 rounded-md bg-slate-900 text-cyan-400 border border-slate-800">
              State: {automationState.toUpperCase()}
            </span>
          </div>

          {/* Terminal log output */}
          <div className="p-4 rounded-xl bg-slate-950 font-mono text-xs text-emerald-400 space-y-2 h-64 overflow-y-auto border border-slate-800">
            {logs.length === 0 ? (
              <span className="text-slate-600 font-sans italic">Click "Trigger Playwright Auto-Fill (Demo)" to run automation script...</span>
            ) : (
              logs.map((log, idx) => (
                <div key={idx} className="leading-relaxed">
                  {log}
                </div>
              ))
            )}
          </div>

          {automationState === "approval_required" && (
            <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between text-xs text-amber-300">
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-amber-400 flex-shrink-0" />
                <span>Playwright paused execution at Final Submission step. Human Approval required.</span>
              </div>
              <a href="/approvals" className="px-3 py-1.5 rounded-lg bg-amber-500 text-slate-950 font-bold hover:bg-amber-400 transition-all">
                Go to Approval Center
              </a>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
