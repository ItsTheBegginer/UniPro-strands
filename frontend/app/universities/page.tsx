"use client";

import { useState } from "react";
import { 
  GraduationCap, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  Search, 
  Sparkles,
  ArrowRight,
  SlidersHorizontal
} from "lucide-react";

export default function UniversitiesPage() {
  const [searchTerm, setSearchTerm] = useState("");

  const universities = [
    {
      id: "mit",
      name: "Massachusetts Institute of Technology (MIT)",
      location: "Cambridge, MA",
      program: "MS in Electrical Engineering & Computer Science",
      matchScore: 92,
      requirements: [
        { name: "Bachelor's Degree in CS/STEM", status: "met", detail: "CSU B.S. CS Verified" },
        { name: "Minimum GPA 3.50", status: "met", detail: "3.85 / 4.0 Actual" },
        { name: "TOEFL Score > 100", status: "met", detail: "110 Actual Score" },
        { name: "3 Recommendation Letters", status: "missing", detail: "2 of 3 Uploaded" }
      ]
    },
    {
      id: "stanford",
      name: "Stanford University",
      location: "Stanford, CA",
      program: "MS in Computer Science",
      matchScore: 88,
      requirements: [
        { name: "Bachelor's Degree in CS/STEM", status: "met", detail: "CSU B.S. CS Verified" },
        { name: "GRE General (Quant > 165)", status: "met", detail: "325 Total (168 Quant)" },
        { name: "TOEFL Score > 105", status: "met", detail: "110 Actual Score" },
        { name: "Statement of Purpose", status: "met", detail: "Drafted & Mapped" }
      ]
    },
    {
      id: "cmu",
      name: "Carnegie Mellon University (CMU)",
      location: "Pittsburgh, PA",
      program: "MS in Automated Software Engineering",
      matchScore: 84,
      requirements: [
        { name: "Bachelor's Degree in CS/STEM", status: "met", detail: "CSU B.S. CS Verified" },
        { name: "GPA > 3.60", status: "met", detail: "3.85 Actual" },
        { name: "Official Transcripts", status: "met", detail: "official_transcript.pdf Verified" },
        { name: "3 Recommendation Letters", status: "missing", detail: "1 of 3 Uploaded" }
      ]
    }
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 text-xs font-semibold text-purple-300 mb-2">
            <Sparkles className="w-3.5 h-3.5 text-purple-400" />
            AI Requirements Verification Engine
          </div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight">University Requirements Audit</h1>
          <p className="text-xs text-slate-400">
            UniPro compares program eligibility criteria directly against your verified student profile.
          </p>
        </div>

        {/* Search Input */}
        <div className="relative w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search universities or programs..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500/50"
          />
        </div>
      </div>

      {/* University Grid */}
      <div className="space-y-5">
        {universities.map((uni) => (
          <div key={uni.id} className="glass-card p-6 rounded-2xl border border-slate-800 space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800/80 pb-4">
              <div>
                <span className="text-xs font-semibold text-indigo-400">{uni.location}</span>
                <h3 className="text-xl font-bold text-white mt-0.5">{uni.name}</h3>
                <p className="text-xs text-slate-400">{uni.program}</p>
              </div>

              <div className="flex items-center gap-3">
                <div className="text-right">
                  <span className="text-2xl font-extrabold text-cyan-400">{uni.matchScore}%</span>
                  <p className="text-[10px] text-slate-400 font-semibold">Matching Score</p>
                </div>
              </div>
            </div>

            {/* Requirements Matrix */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
              {uni.requirements.map((req, idx) => (
                <div
                  key={idx}
                  className={`p-3 rounded-xl border text-xs space-y-1.5 ${
                    req.status === "met"
                      ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-300"
                      : "bg-amber-500/10 border-amber-500/20 text-amber-300"
                  }`}
                >
                  <div className="flex items-center justify-between font-semibold">
                    <span className="truncate pr-1">{req.name}</span>
                    {req.status === "met" ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0" />
                    )}
                  </div>
                  <p className="text-[11px] opacity-80">{req.detail}</p>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
