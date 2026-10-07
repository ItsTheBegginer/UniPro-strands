"use client";

import { useState } from "react";
import { 
  UserCheck, 
  FileText, 
  CheckCircle2, 
  AlertCircle, 
  Edit3, 
  ShieldCheck, 
  Sparkles,
  Search,
  ExternalLink,
  BookOpen,
  Award,
  Briefcase
} from "lucide-react";

type FieldProvenance = {
  value: any;
  source: string;
  extracted_by: string;
  confidence: string;
  verification_status: "verified" | "needs_review" | "unverified";
  updated_at?: string;
};

export default function ProfilePage() {
  const [activeTab, setActiveTab] = useState<"education" | "personal" | "tests" | "experience">("education");
  const [showVerifyModal, setShowVerifyModal] = useState<string | null>(null);

  // Field provenance sample data matching backend profile_store
  const [profileData, setProfileData] = useState({
    first_name: { value: "Alex", source: "passport.pdf", extracted_by: "Gemini 3.7 Flash", confidence: "high", verification_status: "verified" },
    last_name: { value: "Morgan", source: "passport.pdf", extracted_by: "Gemini 3.7 Flash", confidence: "high", verification_status: "verified" },
    email: { value: "alex.morgan@example.edu", source: "user_input", extracted_by: "user", confidence: "high", verification_status: "verified" },
    address: { value: "123 Tech Lane, San Jose, CA 95112", source: "utility_bill.pdf", extracted_by: "Gemini 3.7 Flash", confidence: "medium", verification_status: "needs_review" },
    institution: { value: "California State University", source: "official_transcript.pdf", extracted_by: "Gemini 3.7 Flash", confidence: "high", verification_status: "verified" },
    degree: { value: "Bachelor of Science in Computer Science", source: "official_transcript.pdf", extracted_by: "Gemini 3.7 Flash", confidence: "high", verification_status: "verified" },
    gpa: { value: 3.85, source: "official_transcript.pdf", extracted_by: "Gemini 3.7 Flash", confidence: "high", verification_status: "verified" },
    toefl: { value: 110, source: "toefl_score_report.pdf", extracted_by: "Gemini 3.7 Flash", confidence: "high", verification_status: "verified" },
    gre: { value: 325, source: "gre_report.pdf", extracted_by: "Gemini 3.7 Flash", confidence: "high", verification_status: "verified" },
    company: { value: "Google", source: "resume.pdf", extracted_by: "Gemini 3.7 Flash", confidence: "high", verification_status: "verified" },
    role: { value: "Software Engineering Intern", source: "resume.pdf", extracted_by: "Gemini 3.7 Flash", confidence: "high", verification_status: "verified" }
  });

  const handleVerifyField = (key: string) => {
    setProfileData((prev) => ({
      ...prev,
      [key]: {
        ...prev[key as keyof typeof prev],
        verification_status: "verified"
      }
    }));
    setShowVerifyModal(null);
  };

  const renderProvenanceCard = (label: string, key: string) => {
    const item = profileData[key as keyof typeof profileData] as FieldProvenance;
    if (!item) return null;

    const isVerified = item.verification_status === "verified";
    const needsReview = item.verification_status === "needs_review";

    return (
      <div className="glass-card p-5 rounded-2xl border border-slate-800 space-y-3 relative group">
        <div className="flex items-start justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{label}</span>
            <div className="text-lg font-bold text-white mt-0.5">{String(item.value)}</div>
          </div>
          {isVerified ? (
            <span className="inline-flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 font-semibold">
              <CheckCircle2 className="w-3 h-3 text-emerald-400" /> Verified
            </span>
          ) : (
            <button
              onClick={() => setShowVerifyModal(key)}
              className="inline-flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 font-semibold hover:bg-amber-500/30 transition-all"
            >
              <AlertCircle className="w-3 h-3 text-amber-400" /> Needs Review
            </button>
          )}
        </div>

        {/* Provenance Metadata Drawer */}
        <div className="pt-3 border-t border-slate-800/80 grid grid-cols-2 gap-2 text-xs">
          <div>
            <span className="text-[10px] text-slate-500 font-medium uppercase">Source Document</span>
            <div className="text-indigo-300 font-medium flex items-center gap-1 truncate">
              <FileText className="w-3 h-3 text-indigo-400 flex-shrink-0" />
              <span className="truncate">{item.source}</span>
            </div>
          </div>

          <div>
            <span className="text-[10px] text-slate-500 font-medium uppercase">Extractor & Confidence</span>
            <div className="text-slate-300 font-medium flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-purple-400 flex-shrink-0" />
              <span>{item.extracted_by} ({item.confidence})</span>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-xs font-semibold text-cyan-300 mb-2">
            <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
            Field-Level Provenance Enabled
          </div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight">Structured Student Profile</h1>
          <p className="text-xs text-slate-400">
            Create your profile once. Every data field maintains source document attribution and verification status.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button className="px-4 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs font-semibold text-slate-300 hover:text-white flex items-center gap-1.5">
            <Edit3 className="w-3.5 h-3.5 text-indigo-400" /> Edit Profile
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-800 gap-6 text-sm font-semibold text-slate-400">
        <button
          onClick={() => setActiveTab("education")}
          className={`pb-3 flex items-center gap-2 border-b-2 transition-colors ${
            activeTab === "education" ? "border-indigo-500 text-indigo-300" : "border-transparent hover:text-slate-200"
          }`}
        >
          <BookOpen className="w-4 h-4" /> Education & GPA
        </button>
        <button
          onClick={() => setActiveTab("tests")}
          className={`pb-3 flex items-center gap-2 border-b-2 transition-colors ${
            activeTab === "tests" ? "border-indigo-500 text-indigo-300" : "border-transparent hover:text-slate-200"
          }`}
        >
          <Award className="w-4 h-4" /> Test Scores
        </button>
        <button
          onClick={() => setActiveTab("experience")}
          className={`pb-3 flex items-center gap-2 border-b-2 transition-colors ${
            activeTab === "experience" ? "border-indigo-500 text-indigo-300" : "border-transparent hover:text-slate-200"
          }`}
        >
          <Briefcase className="w-4 h-4" /> Work Experience
        </button>
        <button
          onClick={() => setActiveTab("personal")}
          className={`pb-3 flex items-center gap-2 border-b-2 transition-colors ${
            activeTab === "personal" ? "border-indigo-500 text-indigo-300" : "border-transparent hover:text-slate-200"
          }`}
        >
          <UserCheck className="w-4 h-4" /> Personal Information
        </button>
      </div>

      {/* Tab Content */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {activeTab === "education" && (
          <>
            {renderProvenanceCard("Institution", "institution")}
            {renderProvenanceCard("Degree & Major", "degree")}
            {renderProvenanceCard("Cumulative GPA", "gpa")}
          </>
        )}

        {activeTab === "tests" && (
          <>
            {renderProvenanceCard("TOEFL Score", "toefl")}
            {renderProvenanceCard("GRE General Score", "gre")}
          </>
        )}

        {activeTab === "experience" && (
          <>
            {renderProvenanceCard("Company", "company")}
            {renderProvenanceCard("Role Title", "role")}
          </>
        )}

        {activeTab === "personal" && (
          <>
            {renderProvenanceCard("First Name", "first_name")}
            {renderProvenanceCard("Last Name", "last_name")}
            {renderProvenanceCard("Email Address", "email")}
            {renderProvenanceCard("Home Address", "address")}
          </>
        )}
      </div>

      {/* Verification Modal */}
      {showVerifyModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass-panel p-6 rounded-2xl border border-slate-800 max-w-md w-full space-y-4">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-amber-400" />
              Verify Field Provenance
            </h3>
            <p className="text-xs text-slate-300">
              Gemini extracted this field from <code className="text-indigo-300 bg-slate-900 px-1 py-0.5 rounded">{profileData[showVerifyModal as keyof typeof profileData]?.source}</code>:
            </p>

            <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 text-sm font-semibold text-white">
              {String(profileData[showVerifyModal as keyof typeof profileData]?.value)}
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setShowVerifyModal(null)}
                className="px-4 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={() => handleVerifyField(showVerifyModal)}
                className="px-4 py-2 rounded-xl bg-emerald-600 text-white font-semibold text-xs hover:bg-emerald-500 shadow-lg shadow-emerald-500/20"
              >
                Confirm & Verify Field
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
