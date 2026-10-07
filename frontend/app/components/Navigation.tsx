"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  LayoutDashboard, 
  UserCheck, 
  FileText, 
  GraduationCap, 
  Send, 
  ShieldAlert, 
  Sparkles,
  Layers
} from "lucide-react";

const navItems = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard },
  { name: "Student Profile", href: "/profile", icon: UserCheck, badge: "Provenance" },
  { name: "Document Intelligence", href: "/documents", icon: FileText },
  { name: "Universities & Requirements", href: "/universities", icon: GraduationCap },
  { name: "Application Orchestrator", href: "/applications", icon: Send },
  { name: "Approval Center", href: "/approvals", icon: ShieldAlert, badgeColor: "bg-amber-500/20 text-amber-300 border-amber-500/30", count: 2 },
];

export function Navigation() {
  const pathname = usePathname();

  return (
    <aside className="w-64 border-r border-slate-800 bg-slate-950/80 backdrop-blur-xl flex flex-col h-screen sticky top-0 z-40">
      {/* Brand Header */}
      <div className="p-5 border-b border-slate-800/80 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-purple-600 to-cyan-400 p-0.5 shadow-lg shadow-indigo-500/20 flex items-center justify-center">
          <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-cyan-400 animate-pulse" />
          </div>
        </div>
        <div>
          <div className="flex items-center gap-1.5">
            <span className="font-bold text-lg text-white tracking-tight">UniPro</span>
            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">AI</span>
          </div>
          <p className="text-xs text-slate-400 font-medium">Application Orchestrator</p>
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 p-4 space-y-1.5 overflow-y-auto">
        <div className="px-3 py-2 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
          Core Workflows
        </div>
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`group flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 ${
                isActive
                  ? "bg-indigo-600/20 text-indigo-300 border border-indigo-500/30 shadow-inner"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-900/60 border border-transparent"
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon className={`w-4 h-4 transition-colors ${isActive ? "text-indigo-400" : "text-slate-400 group-hover:text-slate-200"}`} />
                <span>{item.name}</span>
              </div>
              {item.badge && (
                <span className="text-[10px] px-2 py-0.5 rounded-full font-medium bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                  {item.badge}
                </span>
              )}
              {item.count !== undefined && (
                <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${item.badgeColor || "bg-indigo-500/20 text-indigo-300 border-indigo-500/30"}`}>
                  {item.count}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Backend & Model Status Footer */}
      <div className="p-4 border-t border-slate-800/80 bg-slate-900/40">
        <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
              ADK Backend
            </span>
            <span className="text-[10px] text-emerald-400 font-mono font-medium">Ready</span>
          </div>
          <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-800/60">
            <span className="text-slate-400 flex items-center gap-1">
              <Layers className="w-3 h-3 text-purple-400" /> Model
            </span>
            <span className="text-[11px] font-semibold text-purple-300">Gemini 3.7 Flash</span>
          </div>
        </div>
      </div>
    </aside>
  );
}
