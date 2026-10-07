"use client";

import { useState } from "react";
import Link from "next/link";
import { 
  Sparkles, 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  ArrowRight, 
  FileCheck2, 
  Bot, 
  Send,
  ShieldAlert,
  GraduationCap,
  ExternalLink,
  ChevronRight
} from "lucide-react";

export default function Dashboard() {
  const [chatMessage, setChatMessage] = useState("");
  const [chatLog, setChatLog] = useState<Array<{ sender: string; text: string }>>([
    {
      sender: "agent",
      text: "Hello Alex! I am UniPro. Your verified student profile is loaded with 3 documents (official_transcript.pdf, resume.pdf, toefl_score_report.pdf). You have 2 pending approval requests for MIT and Stanford applications."
    }
  ]);
  const [isSending, setIsSending] = useState(false);

  const handleSendChat = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatMessage.trim()) return;

    const userText = chatMessage;
    setChatLog((prev) => [...prev, { sender: "user", text: userText }]);
    setChatMessage("");
    setIsSending(true);

    // Agent response simulation
    setTimeout(() => {
      let response = "I've checked your verified profile. Your GPA is 3.85 (verified via official_transcript.pdf). ";
      if (userText.toLowerCase().includes("mit")) {
        response += "MIT requires 3 recommendation letters. You currently have 2 verified in your profile. Would you like me to flag this requirement?";
      } else if (userText.toLowerCase().includes("apply") || userText.toLowerCase().includes("submit")) {
        response += "I can prepare the application mapping for you, but final submission requires your explicit approval in the Approval Center.";
      } else {
        response += "How would you like to proceed with your application requirements?";
      }
      setChatLog((prev) => [...prev, { sender: "agent", text: response }]);
      setIsSending(false);
    }, 800);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Hero Banner */}
      <div className="relative rounded-2xl bg-gradient-to-r from-indigo-900/60 via-purple-900/40 to-slate-900 border border-indigo-500/20 p-6 md:p-8 overflow-hidden shadow-2xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl -z-10"></div>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-500/30 text-xs font-semibold text-indigo-300">
              <Sparkles className="w-3.5 h-3.5 text-cyan-400 animate-spin" style={{ animationDuration: "6s" }} />
              <span>Apply Once → Manage Many</span>
            </div>
            <h1 className="text-3xl font-extrabold text-white tracking-tight">
              Welcome back, <span className="gradient-text">Alex Morgan</span>
            </h1>
            <p className="text-sm text-slate-300 leading-relaxed">
              Your AI Application Orchestrator is running. Your student profile is structured and backed by field-level provenance.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/profile"
              className="px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-xs font-semibold text-slate-200 hover:text-white hover:bg-slate-800 transition-all flex items-center gap-2"
            >
              <FileCheck2 className="w-4 h-4 text-cyan-400" />
              View Profile Provenance
            </Link>
            <Link
              href="/approvals"
              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-xs font-semibold text-white shadow-lg shadow-indigo-500/25 hover:opacity-95 transition-all flex items-center gap-2"
            >
              <ShieldAlert className="w-4 h-4" />
              Approval Center (2)
            </Link>
          </div>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="glass-card p-5 rounded-2xl border border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-medium">Verified Profile Fields</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold text-white">16 / 18</div>
          <div className="text-[11px] text-emerald-400 flex items-center gap-1 font-medium">
            <span>89% Provenance Verified</span>
          </div>
        </div>

        <div className="glass-card p-5 rounded-2xl border border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-medium">Active Applications</span>
            <GraduationCap className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-2xl font-bold text-white">3 Universities</div>
          <div className="text-[11px] text-indigo-300 font-medium">MIT, Stanford, CMU</div>
        </div>

        <div className="glass-card p-5 rounded-2xl border border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-medium">Pending Human Approvals</span>
            <ShieldAlert className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-bold text-amber-300">2 Requests</div>
          <div className="text-[11px] text-amber-400 font-medium">Requires explicit consent</div>
        </div>

        <div className="glass-card p-5 rounded-2xl border border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-medium">Intelligence Layer</span>
            <Bot className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-2xl font-bold text-cyan-300">Gemini 3.7</div>
          <div className="text-[11px] text-slate-400 font-medium">ADK + Tool Calling</div>
        </div>
      </div>

      {/* Main Grid: Applications + Interactive Assistant */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Applications List */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
              <GraduationCap className="w-5 h-5 text-indigo-400" />
              Target Universities & Readiness
            </h2>
            <Link href="/applications" className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold flex items-center gap-1">
              View All Applications <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="space-y-4">
            {/* MIT */}
            <div className="glass-card p-5 rounded-2xl border border-slate-800 space-y-4">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-white text-base">Massachusetts Institute of Technology (MIT)</h3>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-semibold">
                      READY FOR REVIEW
                    </span>
                  </div>
                  <p className="text-xs text-slate-400">MS in Electrical Engineering & Computer Science • Deadline: Dec 15, 2026</p>
                </div>
                <div className="text-right">
                  <span className="text-lg font-extrabold text-emerald-400">90%</span>
                  <p className="text-[10px] text-slate-400">Readiness Score</p>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="w-full bg-slate-900 rounded-full h-2 overflow-hidden border border-slate-800">
                <div className="bg-gradient-to-r from-indigo-500 to-emerald-400 h-full rounded-full w-[90%]"></div>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-slate-800/80 text-xs text-slate-400">
                <div className="flex items-center gap-4">
                  <span className="flex items-center gap-1 text-emerald-400">
                    <CheckCircle2 className="w-3.5 h-3.5" /> GPA 3.85 Met
                  </span>
                  <span className="flex items-center gap-1 text-emerald-400">
                    <CheckCircle2 className="w-3.5 h-3.5" /> GRE 325 Met
                  </span>
                  <span className="flex items-center gap-1 text-amber-400">
                    <AlertTriangle className="w-3.5 h-3.5" /> 1 Letter Missing
                  </span>
                </div>
                <Link
                  href="/applications"
                  className="text-indigo-400 hover:text-indigo-300 font-semibold flex items-center gap-1"
                >
                  Orchestrate Application <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>

            {/* Stanford */}
            <div className="glass-card p-5 rounded-2xl border border-slate-800 space-y-4">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-white text-base">Stanford University</h3>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-semibold">
                      PREPARING
                    </span>
                  </div>
                  <p className="text-xs text-slate-400">MS in Computer Science • Deadline: Dec 1, 2026</p>
                </div>
                <div className="text-right">
                  <span className="text-lg font-extrabold text-indigo-400">75%</span>
                  <p className="text-[10px] text-slate-400">Readiness Score</p>
                </div>
              </div>

              <div className="w-full bg-slate-900 rounded-full h-2 overflow-hidden border border-slate-800">
                <div className="bg-gradient-to-r from-indigo-500 to-purple-400 h-full rounded-full w-[75%]"></div>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-slate-800/80 text-xs text-slate-400">
                <div className="flex items-center gap-4">
                  <span className="flex items-center gap-1 text-emerald-400">
                    <CheckCircle2 className="w-3.5 h-3.5" /> All Requirements Met
                  </span>
                  <span className="flex items-center gap-1 text-amber-400">
                    <ShieldAlert className="w-3.5 h-3.5" /> Pending SSN Authorization
                  </span>
                </div>
                <Link
                  href="/approvals"
                  className="text-amber-400 hover:text-amber-300 font-semibold flex items-center gap-1"
                >
                  Review Request <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* AI Assistant Chat Drawer */}
        <div className="glass-panel p-5 rounded-2xl border border-slate-800 flex flex-col h-[520px]">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-indigo-600/30 border border-indigo-500/40 flex items-center justify-center">
                <Bot className="w-4 h-4 text-cyan-400" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">UniPro AI Assistant</h3>
                <span className="text-[10px] text-emerald-400 font-mono">Gemini 3.7 Flash</span>
              </div>
            </div>
          </div>

          {/* Chat Messages */}
          <div className="flex-1 overflow-y-auto py-3 space-y-3 pr-1 text-xs">
            {chatLog.map((msg, idx) => (
              <div
                key={idx}
                className={`flex gap-2.5 ${msg.sender === "user" ? "justify-end" : "justify-start"}`}
              >
                {msg.sender === "agent" && (
                  <div className="w-6 h-6 rounded-md bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Sparkles className="w-3 h-3 text-cyan-400" />
                  </div>
                )}
                <div
                  className={`p-3 rounded-xl max-w-[85%] leading-relaxed ${
                    msg.sender === "user"
                      ? "bg-indigo-600 text-white rounded-br-none"
                      : "bg-slate-900/90 text-slate-200 border border-slate-800 rounded-bl-none"
                  }`}
                >
                  {msg.text}
                </div>
              </div>
            ))}
            {isSending && (
              <div className="text-[11px] text-slate-400 italic flex items-center gap-1.5 pl-2">
                <Bot className="w-3 h-3 animate-spin text-cyan-400" />
                UniPro is querying verified profile tools...
              </div>
            )}
          </div>

          {/* Input Box */}
          <form onSubmit={handleSendChat} className="pt-2 border-t border-slate-800 flex gap-2">
            <input
              type="text"
              placeholder="Ask about your profile, GPA, requirements..."
              value={chatMessage}
              onChange={(e) => setChatMessage(e.target.value)}
              className="flex-1 px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500/50"
            />
            <button
              type="submit"
              disabled={isSending}
              className="px-3 py-2 rounded-xl bg-indigo-600 text-white hover:bg-indigo-500 transition-all flex items-center justify-center"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
