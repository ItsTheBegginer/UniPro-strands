"use client";

import { Bell, Search, User, CheckCircle2, ShieldCheck } from "lucide-react";

export function Header() {
  return (
    <header className="h-16 border-b border-slate-800 bg-slate-950/60 backdrop-blur-md px-6 flex items-center justify-between sticky top-0 z-30">
      {/* Search Bar */}
      <div className="relative w-96">
        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          placeholder="Search student profile, requirements, applications..."
          className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-900/80 border border-slate-800 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 transition-all"
        />
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-4">
        {/* Human in the loop badge */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-xs font-medium text-indigo-300">
          <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" />
          <span>Human-in-the-Loop Active</span>
        </div>

        {/* Notifications */}
        <button className="relative p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white transition-colors">
          <Bell className="w-4 h-4" />
          <span className="w-2 h-2 rounded-full bg-amber-400 absolute top-1.5 right-1.5"></span>
        </button>

        {/* Profile Avatar */}
        <div className="flex items-center gap-3 pl-2 border-l border-slate-800">
          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-cyan-500 to-indigo-500 p-0.5">
            <div className="w-full h-full bg-slate-950 rounded-full flex items-center justify-center">
              <User className="w-4 h-4 text-slate-200" />
            </div>
          </div>
          <div className="text-left hidden sm:block">
            <div className="text-xs font-bold text-slate-200 flex items-center gap-1">
              Alex Morgan
              <CheckCircle2 className="w-3 h-3 text-cyan-400" />
            </div>
            <p className="text-[10px] text-slate-400">demo-student</p>
          </div>
        </div>
      </div>
    </header>
  );
}
