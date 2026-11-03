import { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import { api, type ApplicationStatus } from "../api"
import { Navbar } from "../components/Navbar"
import {
  GraduationCap,
  Sparkles,
  ArrowRight,
  Clock,
  AlertCircle,
  CheckCircle2,
  FileText,
  Building2,
  ExternalLink,
  ChevronRight,
  ShieldAlert,
  Loader2,
  FolderSync
} from "lucide-react"

const STATE_CONFIG: Record<string, { label: string; badge: string; border: string; icon: any; pulse?: boolean }> = {
  preparing: { label: "Preparing", badge: "bg-blue-50 text-blue-700 border-blue-200", border: "border-blue-200", icon: Clock, pulse: true },
  requirements_check: { label: "Checking Reqs", badge: "bg-blue-50 text-blue-700 border-blue-200", border: "border-blue-200", icon: Clock, pulse: true },
  ready_to_run: { label: "Ready to Run", badge: "bg-slate-100 text-slate-700 border-slate-200", border: "border-slate-200", icon: Clock },
  running: { label: "Agent Working", badge: "bg-indigo-50 text-indigo-700 border-indigo-200", border: "border-indigo-300 ring-2 ring-indigo-50", icon: Loader2, pulse: true },
  student_action_required: { label: "Action Required", badge: "bg-amber-50 text-amber-800 border-amber-300 font-bold", border: "border-amber-300 ring-2 ring-amber-50", icon: AlertCircle },
  awaiting_final_approval: { label: "Ready for Review", badge: "bg-purple-50 text-purple-800 border-purple-300 font-bold", border: "border-purple-300 ring-2 ring-purple-50", icon: ShieldAlert },
  submitting: { label: "Submitting…", badge: "bg-indigo-50 text-indigo-800 border-indigo-200", border: "border-indigo-300", icon: Loader2, pulse: true },
  submitted: { label: "Submitted ✓", badge: "bg-emerald-50 text-emerald-800 border-emerald-300 font-bold", border: "border-emerald-200", icon: CheckCircle2 },
  failed: { label: "Needs Retry", badge: "bg-rose-50 text-rose-800 border-rose-200 font-bold", border: "border-rose-200", icon: AlertCircle },
}

const PRESET_PROGRAMS = [
  { university: "Demo University", program: "Computer Science", popular: true },
]

export function Dashboard() {
  const [apps, setApps] = useState<ApplicationStatus[]>([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showNewModal, setShowNewModal] = useState(false)
  const [university, setUniversity] = useState("Demo University")
  const [program, setProgram] = useState("Computer Science")
  const [stats, setStats] = useState({ total: 0, running: 0, pending: 0, submitted: 0 })

  async function load() {
    try {
      const res = await api.list()
      setApps(res.applications)
      
      const total = res.applications.length
      const running = res.applications.filter(a => ["running", "preparing", "requirements_check"].includes(a.state)).length
      const pending = res.applications.filter(a => ["student_action_required", "awaiting_final_approval"].includes(a.state)).length
      const submitted = res.applications.filter(a => a.state === "submitted").length
      setStats({ total, running, pending, submitted })
    } catch (e) {
      setError(String(e))
    }
  }

  useEffect(() => {
    load()
    const timer = setInterval(load, 4000)
    return () => clearInterval(timer)
  }, [])

  async function handleStart() {
    setBusy(true)
    setError(null)
    try {
      await api.start(university, program)
      setShowNewModal(false)
      await load()
    } catch (e) {
      setError(String(e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50/70 font-sans text-slate-900 flex flex-col">
      <Navbar onNewApplication={() => setShowNewModal(true)} />

      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-8 space-y-8">
        {/* Hero Section */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-6 sm:p-8 shadow-xl">
          <div className="absolute right-0 top-0 translate-x-12 -translate-y-8 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2 max-w-2xl">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 text-xs font-semibold border border-indigo-500/30">
                <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                <span>AI Admissions Co-Pilot</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
                Autonomous University Applications
              </h1>
              <p className="text-sm text-slate-300 leading-relaxed">
                UniPro navigates university portals, inspects application requirements, auto-fills verified student records, and stops only when high-stakes human approval is needed.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3 shrink-0">
              <button
                onClick={() => setShowNewModal(true)}
                disabled={busy}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs sm:text-sm shadow-md shadow-indigo-900/40 transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
              >
                <span>+ Start Application</span>
                <ArrowRight className="w-4 h-4" />
              </button>
              <Link
                to="/profile"
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-white font-medium text-xs sm:text-sm border border-white/10 backdrop-blur-sm transition-colors"
              >
                <span>Edit Profile</span>
              </Link>
            </div>
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white border border-slate-200/80 rounded-xl p-4.5 shadow-xs">
            <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
              <span>Total Applications</span>
              <Building2 className="w-4 h-4 text-slate-400" />
            </div>
            <div className="mt-2 text-2xl font-bold text-slate-900">{stats.total}</div>
            <p className="text-[11px] text-slate-400 mt-0.5">Tracked admissions</p>
          </div>

          <div className="bg-white border border-slate-200/80 rounded-xl p-4.5 shadow-xs">
            <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
              <span>Agent Working</span>
              <Loader2 className={`w-4 h-4 ${stats.running > 0 ? "text-indigo-600 animate-spin" : "text-slate-400"}`} />
            </div>
            <div className="mt-2 text-2xl font-bold text-indigo-700">{stats.running}</div>
            <p className="text-[11px] text-slate-400 mt-0.5">Active browser sessions</p>
          </div>

          <div className="bg-white border border-slate-200/80 rounded-xl p-4.5 shadow-xs">
            <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
              <span>Action Required</span>
              <AlertCircle className={`w-4 h-4 ${stats.pending > 0 ? "text-amber-500" : "text-slate-400"}`} />
            </div>
            <div className="mt-2 text-2xl font-bold text-amber-600">{stats.pending}</div>
            <p className="text-[11px] text-slate-400 mt-0.5">Awaiting your approval</p>
          </div>

          <div className="bg-white border border-slate-200/80 rounded-xl p-4.5 shadow-xs">
            <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
              <span>Submitted</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="mt-2 text-2xl font-bold text-emerald-700">{stats.submitted}</div>
            <p className="text-[11px] text-slate-400 mt-0.5">Completed successfully</p>
          </div>
        </div>

        {/* New Application Modal / Drawer */}
        {showNewModal && (
          <div className="border border-indigo-200 bg-gradient-to-b from-indigo-50/70 to-white rounded-2xl p-6 shadow-lg shadow-indigo-100/50 space-y-5 animate-in fade-in duration-200">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <GraduationCap className="w-5 h-5 text-indigo-600" />
                  <span>Start New University Application</span>
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  The Strands agent will inspect requirements, fill forms from your verified profile, and ask you to confirm decisions.
                </p>
              </div>
              <button
                onClick={() => setShowNewModal(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-semibold p-1"
              >
                ✕
              </button>
            </div>

            {/* Quick Presets */}
            <div>
              <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-2">Preset Target Programs</p>
              <div className="flex flex-wrap gap-2">
                {PRESET_PROGRAMS.map((p) => (
                  <button
                    key={p.program}
                    type="button"
                    onClick={() => {
                      setUniversity(p.university)
                      setProgram(p.program)
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors cursor-pointer ${
                      university === p.university && program === p.program
                        ? "bg-indigo-600 text-white border-indigo-600 shadow-xs"
                        : "bg-white text-slate-700 border-slate-200 hover:border-indigo-300"
                    }`}
                  >
                    {p.university} — <span className="font-semibold">{p.program}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">University Name</label>
                <input
                  className="w-full bg-white border border-slate-300 rounded-lg px-3.5 py-2 text-sm text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  value={university}
                  onChange={(e) => setUniversity(e.target.value)}
                  placeholder="e.g. Demo University"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Degree / Program</label>
                <input
                  className="w-full bg-white border border-slate-300 rounded-lg px-3.5 py-2 text-sm text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  value={program}
                  onChange={(e) => setProgram(e.target.value)}
                  placeholder="e.g. Computer Science"
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-slate-200">
              <a
                href="http://localhost:8080/login.html"
                target="_blank"
                rel="noreferrer"
                className="text-xs text-indigo-600 hover:underline inline-flex items-center gap-1"
              >
                <span>Preview University Portal</span>
                <ExternalLink className="w-3 h-3" />
              </a>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowNewModal(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-800 rounded-lg transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleStart}
                  disabled={busy || !university || !program}
                  className="inline-flex items-center gap-2 px-5 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-semibold text-xs rounded-lg shadow-sm shadow-indigo-200 transition-all cursor-pointer"
                >
                  {busy ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Launching Agent…</span>
                    </>
                  ) : (
                    <>
                      <span>Launch Agent Run</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {error && (
          <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-sm flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-semibold text-rose-900">Application Error</p>
              <p className="text-xs">{error}</p>
            </div>
          </div>
        )}

        {/* Applications List Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900">Your College Applications</h2>
              <p className="text-xs text-slate-500">Live monitoring of your autonomous admission agent</p>
            </div>
            <button
              onClick={load}
              className="text-xs text-slate-500 hover:text-slate-800 flex items-center gap-1 font-medium cursor-pointer"
            >
              <FolderSync className="w-3.5 h-3.5" />
              <span>Refresh</span>
            </button>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {apps.map((a) => {
              const cfg = STATE_CONFIG[a.state] || { label: a.state, badge: "bg-slate-100 text-slate-700 border-slate-200", border: "border-slate-200", icon: Clock }
              const StatusIcon = cfg.icon
              const totalItems = 12 // estimated total fields + docs in demo portal
              const filledCount = a.filled.length + a.uploaded.length
              const progressPct = a.state === "submitted" ? 100 : Math.min(Math.round((filledCount / totalItems) * 100), 95)

              return (
                <Link
                  key={a.application_id}
                  to={`/applications/${a.application_id}`}
                  className={`group relative bg-white border ${cfg.border} rounded-2xl p-5 hover:shadow-md hover:border-indigo-300 transition-all block`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    {/* Left: University Info */}
                    <div className="flex items-start gap-3.5">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-slate-100 to-indigo-50 border border-slate-200 flex items-center justify-center text-indigo-700 shrink-0 group-hover:scale-105 transition-transform">
                        <Building2 className="w-6 h-6" />
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-bold text-base text-slate-900 group-hover:text-indigo-600 transition-colors">
                            {a.university}
                          </h3>
                        </div>
                        <p className="text-xs font-semibold text-slate-600 flex items-center gap-2">
                          <span>{a.program}</span>
                          <span className="text-slate-300">•</span>
                          <span className="font-mono text-[11px] text-slate-400">{a.application_id}</span>
                        </p>
                        <div className="flex items-center gap-3 text-xs text-slate-500 pt-1">
                          <span className="inline-flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            {a.filled.length} fields filled
                          </span>
                          <span className="inline-flex items-center gap-1">
                            <FileText className="w-3.5 h-3.5 text-indigo-600" />
                            {a.uploaded.length} docs attached
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Right: Progress & Status Action */}
                    <div className="flex flex-col sm:items-end gap-3 min-w-[200px]">
                      <div className="flex items-center gap-2">
                        <span className={`inline-flex items-center gap-1.5 text-xs px-3 py-1 rounded-full border ${cfg.badge}`}>
                          <StatusIcon className={`w-3.5 h-3.5 ${cfg.pulse ? "animate-spin" : ""}`} />
                          <span>{cfg.label}</span>
                        </span>
                      </div>

                      {/* Progress Bar */}
                      <div className="w-full sm:w-48 space-y-1">
                        <div className="flex justify-between text-[11px] text-slate-500 font-medium">
                          <span>Progress</span>
                          <span>{progressPct}%</span>
                        </div>
                        <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full transition-all duration-500 ${
                              a.state === "submitted" ? "bg-emerald-500" : "bg-gradient-to-r from-blue-500 to-indigo-600"
                            }`}
                            style={{ width: `${progressPct}%` }}
                          />
                        </div>
                      </div>

                      <div className="flex items-center gap-1 text-xs font-semibold text-indigo-600 group-hover:translate-x-1 transition-transform">
                        <span>{a.state === "student_action_required" ? "Answer Required" : a.state === "awaiting_final_approval" ? "Review & Submit" : "View Application"}</span>
                        <ChevronRight className="w-4 h-4" />
                      </div>
                    </div>
                  </div>
                </Link>
              )
            })}

            {apps.length === 0 && !busy && (
              <div className="border-2 border-dashed border-slate-300 rounded-2xl p-12 text-center bg-white space-y-4">
                <div className="w-14 h-14 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 mx-auto">
                  <GraduationCap className="w-7 h-7" />
                </div>
                <div className="space-y-1 max-w-md mx-auto">
                  <h3 className="text-base font-bold text-slate-900">No applications started yet</h3>
                  <p className="text-xs text-slate-500">
                    Click below to start an autonomous application run with Demo University. The agent will inspect requirements and fill out the portal.
                  </p>
                </div>
                <button
                  onClick={() => setShowNewModal(true)}
                  className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs rounded-xl shadow-sm transition-all"
                >
                  <span>+ Start Demo Application</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
        </div>
      </main>

      <footer className="border-t border-slate-200 bg-white py-6 mt-12 text-center text-xs text-slate-400">
        <p>UniPro — Built with Strands Agents SDK &amp; Amazon Bedrock for the AWS Builder Center Hackathon</p>
      </footer>
    </div>
  )
}
