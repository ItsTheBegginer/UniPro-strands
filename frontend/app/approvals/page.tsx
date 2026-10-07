"use client";

import { useState } from "react";
import { 
  ShieldAlert, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  Lock, 
  Building2, 
  ArrowRight,
  Clock,
  History
} from "lucide-react";

export default function ApprovalsPage() {
  const [approvals, setApprovals] = useState([
    {
      id: "appr-101",
      university: "Stanford University",
      action: "submit_ssn_and_financial_declaration",
      title: "SSN & Financial Declaration Release",
      reason: "Stanford MS CS portal requires explicit student consent before submitting SSN and bank verification details for F-1 visa sponsorship.",
      risk: "High - Sensitive Personal & Financial Data",
      status: "pending",
      created_at: "2026-08-30T19:45:00Z"
    },
    {
      id: "appr-102",
      university: "Massachusetts Institute of Technology (MIT)",
      action: "submit_final_application",
      title: "Final Application Submission to MIT EECS",
      reason: "All application fields and transcripts are populated. Submitting this application will lock your profile for MIT EECS Fall 2027.",
      risk: "High - Irreversible Application Submission",
      status: "pending",
      created_at: "2026-08-30T20:00:00Z"
    }
  ]);

  const [auditLog, setAuditLog] = useState<Array<{ timestamp: string; action: string; result: string }>>([
    {
      timestamp: "2026-08-30 19:30",
      action: "Official Transcript Uploaded",
      result: "Gemini extracted GPA 3.85 and degree details"
    },
    {
      timestamp: "2026-08-30 19:32",
      action: "GPA Verified by Student",
      result: "Field verification status updated to VERIFIED"
    }
  ]);

  const handleDecision = (id: string, decision: "approved" | "rejected") => {
    const item = approvals.find((a) => a.id === id);
    if (!item) return;

    setApprovals((prev) =>
      prev.map((a) => (a.id === id ? { ...a, status: decision } : a))
    );

    setAuditLog((prev) => [
      {
        timestamp: new Date().toISOString().replace("T", " ").substring(0, 16),
        action: `${item.title} — ${decision.toUpperCase()}`,
        result: `Student explicitly ${decision} action: ${item.action}`
      },
      ...prev
    ]);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div>
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-xs font-semibold text-amber-300 mb-2">
          <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
          Human-in-the-Loop Decision Gate
        </div>
        <h1 className="text-2xl font-extrabold text-white tracking-tight">Approval Center</h1>
        <p className="text-xs text-slate-400">
          UniPro AI will never submit sensitive information, financial declarations, or final applications without explicit student approval.
        </p>
      </div>

      {/* Approval List */}
      <div className="space-y-4">
        <h2 className="text-sm font-bold text-slate-300 uppercase tracking-wider">Pending Approvals Queue</h2>

        {approvals.filter((a) => a.status === "pending").length === 0 ? (
          <div className="glass-card p-8 rounded-2xl border border-slate-800 text-center space-y-3">
            <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto" />
            <h3 className="text-base font-bold text-white">All Pending Approvals Clear</h3>
            <p className="text-xs text-slate-400">There are no pending high-risk action requests requiring your decision.</p>
          </div>
        ) : (
          approvals.map((item) => (
            <div key={item.id} className="glass-card p-6 rounded-2xl border border-slate-800 space-y-4">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800/80 pb-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-indigo-400" />
                    <span className="text-xs font-semibold text-indigo-300">{item.university}</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 font-semibold">
                      {item.risk}
                    </span>
                  </div>
                  <h3 className="text-lg font-bold text-white">{item.title}</h3>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    onClick={() => handleDecision(item.id, "rejected")}
                    className="px-4 py-2 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 hover:bg-rose-500/20 text-xs font-semibold flex items-center gap-1.5 transition-all"
                  >
                    <XCircle className="w-4 h-4 text-rose-400" /> Reject Action
                  </button>
                  <button
                    onClick={() => handleDecision(item.id, "approved")}
                    className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-semibold text-xs shadow-lg shadow-emerald-500/20 hover:opacity-90 flex items-center gap-1.5 transition-all"
                  >
                    <CheckCircle2 className="w-4 h-4" /> Authorize & Proceed
                  </button>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 text-xs text-slate-300 leading-relaxed flex items-start gap-3">
                <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                <div>
                  <strong className="text-white block mb-1">Reason for Approval Gate:</strong>
                  {item.reason}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Audit Log */}
      <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-4">
        <h2 className="text-sm font-bold text-white flex items-center gap-2">
          <History className="w-4 h-4 text-indigo-400" />
          Audit Trail History
        </h2>

        <div className="space-y-3">
          {auditLog.map((log, idx) => (
            <div key={idx} className="flex items-center justify-between text-xs p-3 rounded-xl bg-slate-900/60 border border-slate-800">
              <div className="flex items-center gap-3">
                <Clock className="w-3.5 h-3.5 text-slate-500" />
                <div>
                  <span className="font-semibold text-slate-200">{log.action}</span>
                  <p className="text-[11px] text-slate-400">{log.result}</p>
                </div>
              </div>
              <span className="text-[10px] text-slate-500 font-mono">{log.timestamp}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
