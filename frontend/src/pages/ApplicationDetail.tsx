import { useEffect, useState } from "react"
import { useParams, Link } from "react-router-dom"
import { api, type ApplicationStatus } from "../api"
import { Navbar } from "../components/Navbar"
import {
  ArrowLeft,
  Building2,
  Clock,
  AlertCircle,
  CheckCircle2,
  FileText,
  ShieldCheck,
  ShieldAlert,
  Loader2,
  ExternalLink,
  RotateCcw,
  History,
  Send,
  HelpCircle,
  FileCheck2,
  ListTodo
} from "lucide-react"

const STATE_CONFIG: Record<string, { label: string; badge: string; icon: any; pulse?: boolean }> = {
  preparing: { label: "Preparing", badge: "bg-blue-50 text-blue-700 border-blue-200", icon: Clock, pulse: true },
  requirements_check: { label: "Checking Requirements", badge: "bg-blue-50 text-blue-700 border-blue-200", icon: Clock, pulse: true },
  ready_to_run: { label: "Ready to Run", badge: "bg-slate-100 text-slate-700 border-slate-200", icon: Clock },
  running: { label: "Agent Working in Browser", badge: "bg-indigo-50 text-indigo-700 border-indigo-200", icon: Loader2, pulse: true },
  student_action_required: { label: "Action Required", badge: "bg-amber-50 text-amber-800 border-amber-300 font-bold", icon: AlertCircle },
  awaiting_final_approval: { label: "Ready for Final Review", badge: "bg-purple-50 text-purple-800 border-purple-300 font-bold", icon: ShieldAlert },
  submitting: { label: "Submitting…", badge: "bg-indigo-50 text-indigo-800 border-indigo-200", icon: Loader2, pulse: true },
  submitted: { label: "Submitted ✓", badge: "bg-emerald-50 text-emerald-800 border-emerald-300 font-bold", icon: CheckCircle2 },
  failed: { label: "Failed / Interrupted", badge: "bg-rose-50 text-rose-800 border-rose-200 font-bold", icon: AlertCircle },
}

const APPLICATION_STEPS = [
  { key: "login", label: "Login & Requirements" },
  { key: "personal", label: "Personal Info" },
  { key: "education", label: "Education & GPA" },
  { key: "documents", label: "Documents" },
  { key: "questions", label: "Declarations" },
  { key: "review", label: "Review & Submit" },
]

export function ApplicationDetail() {
  const { id } = useParams<{ id: string }>()
  const [status, setStatus] = useState<ApplicationStatus | null>(null)
  const [answer, setAnswer] = useState("")
  const [note, setNote] = useState("")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function refresh() {
    if (!id) return
    try {
      const data = await api.status(id)
      setStatus(data)
    } catch (e) {
      setError(String(e))
    }
  }

  useEffect(() => {
    refresh()
  }, [id])

  useEffect(() => {
    if (!status) return
    const activeStates = ["preparing", "running", "submitting", "requirements_check"]
    if (!activeStates.includes(status.state)) return

    const timer = setInterval(() => {
      refresh()
    }, 2500)

    return () => clearInterval(timer)
  }, [id, status?.state])

  async function run(fn: () => Promise<ApplicationStatus>) {
    setBusy(true)
    setError(null)
    try {
      const res = await fn()
      setStatus(res)
    } catch (e) {
      setError(String(e))
    } finally {
      setBusy(false)
    }
  }

  if (!status || !id) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
        <Navbar />
        <div className="flex-1 flex items-center justify-center p-8 text-slate-500 gap-2">
          <Loader2 className="w-5 h-5 animate-spin text-indigo-600" />
          <span>Loading application details…</span>
        </div>
      </div>
    )
  }

  const badge = STATE_CONFIG[status.state] || { label: status.state, badge: "bg-slate-100 text-slate-800 border-slate-200", icon: Clock }
  const StatusIcon = badge.icon

  // Determine current step index for stepper
  let currentStepIdx = 0
  if (status.state === "submitted") currentStepIdx = 5
  else if (status.state === "awaiting_final_approval" || status.state === "submitting") currentStepIdx = 5
  else if (status.pending?.field_label.toLowerCase().includes("disciplinary") || status.pending?.field_label.toLowerCase().includes("statement")) currentStepIdx = 4
  else if (status.uploaded.length > 0) currentStepIdx = 3
  else if (status.filled.length > 4) currentStepIdx = 2
  else if (status.filled.length > 0) currentStepIdx = 1

  return (
    <div className="min-h-screen bg-slate-50/70 font-sans text-slate-900 flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Navigation & Breadcrumb */}
        <div className="flex items-center justify-between">
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-indigo-600 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Dashboard</span>
          </Link>

          <div className="flex items-center gap-3">
            <a
              href="http://localhost:8080/login.html"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-xs text-indigo-600 hover:underline font-medium"
            >
              <span>Open Portal Window</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
            <Link
              to={`/applications/${id}/activity`}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-xs font-semibold text-slate-700 hover:text-indigo-600 hover:border-indigo-300 shadow-2xs transition-colors"
            >
              <History className="w-3.5 h-3.5 text-slate-400" />
              <span>Full Audit Trail</span>
            </Link>
          </div>
        </div>

        {/* Application Header Card */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-slate-100 to-indigo-50 border border-slate-200 flex items-center justify-center text-indigo-700 shrink-0">
                <Building2 className="w-7 h-7" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2.5">
                  <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900">{status.university}</h1>
                </div>
                <p className="text-sm font-semibold text-slate-600">{status.program}</p>
                <p className="text-xs font-mono text-slate-400">Application ID: {status.application_id}</p>
              </div>
            </div>

            <div className="flex flex-col sm:items-end gap-2">
              <span className={`inline-flex items-center gap-1.5 text-xs px-3.5 py-1.5 rounded-full border ${badge.badge}`}>
                <StatusIcon className={`w-3.5 h-3.5 ${badge.pulse ? "animate-spin" : ""}`} />
                <span>{badge.label}</span>
              </span>
              <span className="text-[11px] text-slate-400">
                Last checked: just now (auto-polling active)
              </span>
            </div>
          </div>

          {/* Stepper Bar */}
          <div className="pt-4 border-t border-slate-100">
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-3">Admission Workflow Progress</p>
            <div className="grid grid-cols-2 sm:grid-cols-6 gap-2">
              {APPLICATION_STEPS.map((step, idx) => {
                const isComplete = idx < currentStepIdx || status.state === "submitted"
                const isCurrent = idx === currentStepIdx && status.state !== "submitted"
                return (
                  <div
                    key={step.key}
                    className={`p-2.5 rounded-xl border text-center transition-all ${
                      isComplete
                        ? "bg-emerald-50/70 border-emerald-200 text-emerald-900"
                        : isCurrent
                        ? "bg-indigo-50 border-indigo-300 text-indigo-900 font-bold ring-2 ring-indigo-100"
                        : "bg-slate-50/60 border-slate-200 text-slate-400"
                    }`}
                  >
                    <div className="text-[10px] font-bold uppercase tracking-wider">Step {idx + 1}</div>
                    <div className="text-xs truncate font-medium mt-0.5">{step.label}</div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {error && (
          <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-sm flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-semibold text-rose-900">Application Error</p>
              <p className="text-xs">{error}</p>
            </div>
          </div>
        )}

        {/* 2-Column Core Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          {/* Left Column: Primary Actions & Decision Gates */}
          <div className="lg:col-span-2 space-y-5">
            {/* AGENT WORKING BANNER */}
            {busy && (
              <div className="bg-gradient-to-r from-indigo-50 to-blue-50 border border-indigo-200 p-5 rounded-2xl flex items-start gap-3.5 shadow-xs">
                <Loader2 className="w-5 h-5 text-indigo-600 animate-spin shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <h3 className="text-sm font-bold text-indigo-950">Autonomous Agent In Progress</h3>
                  <p className="text-xs text-indigo-700 leading-relaxed">
                    The agent is inspecting the portal DOM, executing deterministic field mappings, uploading verified transcripts, and navigating pages.
                  </p>
                </div>
              </div>
            )}

            {/* ACTION REQUIRED: Pending Question / Student Approval */}
            {status.state === "student_action_required" && status.pending && (
              <div className="border border-amber-300 bg-amber-50/40 rounded-2xl p-6 space-y-4 shadow-sm animate-in fade-in duration-150">
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                      <span className="text-xs font-bold uppercase tracking-wider text-amber-800">
                        Human-in-the-Loop Decision Gate
                      </span>
                    </div>
                    <h2 className="text-base sm:text-lg font-bold text-slate-900">
                      {status.pending.question}
                    </h2>
                  </div>

                  {status.pending.risk && (
                    <span
                      className={`text-[10px] uppercase font-bold tracking-wider px-2.5 py-1 rounded-full border shrink-0 ${
                        status.pending.risk === "high"
                          ? "bg-rose-100 text-rose-800 border-rose-200"
                          : "bg-amber-100 text-amber-800 border-amber-200"
                      }`}
                    >
                      {status.pending.risk} risk
                    </span>
                  )}
                </div>

                <div className="p-3 bg-white/80 border border-amber-200 rounded-xl text-xs text-slate-600 flex items-start gap-2">
                  <HelpCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <p>{status.pending.reason}</p>
                </div>

                {status.pending.proposed_answer && (
                  <div className="flex items-center justify-between bg-white border border-amber-200 p-3 rounded-xl text-xs">
                    <span className="text-slate-700 truncate mr-2">
                      <strong className="text-slate-900">Suggested:</strong> {status.pending.proposed_answer}
                    </span>
                    <button
                      type="button"
                      onClick={() => setAnswer(status.pending?.proposed_answer || "")}
                      className="shrink-0 bg-amber-600 hover:bg-amber-700 text-white font-semibold px-3 py-1 rounded-lg text-xs transition-colors cursor-pointer"
                    >
                      Use this
                    </button>
                  </div>
                )}

                <div className="space-y-3 pt-1">
                  {/* Radio Button Options Rendering */}
                  {status.pending.field_type === "radio" && status.pending.options && status.pending.options.length > 0 ? (
                    <fieldset className="space-y-2">
                      {status.pending.options.map((opt) => (
                        <label
                          key={opt}
                          className={`flex items-center gap-3.5 cursor-pointer border rounded-xl px-4 py-3 text-sm transition-all ${
                            answer === opt
                              ? "bg-indigo-50/80 border-indigo-400 text-indigo-950 font-bold shadow-xs ring-2 ring-indigo-100"
                              : "bg-white border-slate-200 text-slate-800 hover:border-slate-300"
                          }`}
                        >
                          <input
                            type="radio"
                            name="student_answer"
                            value={opt}
                            checked={answer === opt}
                            onChange={() => setAnswer(opt)}
                            className="h-4 w-4 text-indigo-600 accent-indigo-600 cursor-pointer"
                          />
                          <span>{opt}</span>
                        </label>
                      ))}
                    </fieldset>
                  ) : (
                    /* Default Textarea */
                    <textarea
                      className="w-full bg-white border border-slate-300 rounded-xl p-3 text-sm text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:outline-none resize-none"
                      rows={3}
                      value={answer}
                      onChange={(e) => setAnswer(e.target.value)}
                      placeholder="Type your official answer here..."
                    />
                  )}

                  <button
                    onClick={() => run(() => api.answer(id, answer)).then(() => setAnswer(""))}
                    disabled={busy || !answer.trim()}
                    className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-semibold rounded-xl text-sm shadow-sm shadow-indigo-200 transition-all cursor-pointer flex items-center justify-center gap-2"
                  >
                    <Send className="w-4 h-4" />
                    <span>Submit Answer &amp; Resume Application</span>
                  </button>
                </div>
              </div>
            )}

            {/* FINAL REVIEW: Human Approval Gate before submit */}
            {status.state === "awaiting_final_approval" && (
              <div className="border border-purple-200 bg-gradient-to-b from-purple-50/60 to-white rounded-2xl p-6 space-y-5 shadow-sm">
                <div className="flex items-start gap-3.5">
                  <div className="w-10 h-10 rounded-xl bg-purple-100 border border-purple-200 text-purple-700 flex items-center justify-center shrink-0">
                    <ShieldCheck className="w-6 h-6" />
                  </div>
                  <div className="space-y-1">
                    <h2 className="font-bold text-slate-900 text-lg">Application Ready for Final Review</h2>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      The autonomous agent has filled all university sections and attached required files. For security and accountability, submission is authorized strictly by you.
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => run(() => api.submit(id))}
                  disabled={busy}
                  className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold rounded-xl text-sm shadow-md shadow-emerald-200 transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Authorize &amp; Submit Application Now</span>
                </button>

                <div className="pt-3 border-t border-purple-100 space-y-2">
                  <p className="text-xs font-semibold text-slate-700">Need edits before submitting?</p>
                  <div className="flex gap-2">
                    <input
                      className="border border-slate-300 rounded-lg px-3 py-2 text-xs flex-1 bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      placeholder="e.g. Change graduation year to 2027"
                    />
                    <button
                      onClick={() => run(() => api.requestChanges(id, note)).then(() => setNote(""))}
                      disabled={busy || !note.trim()}
                      className="px-4 py-2 bg-slate-800 hover:bg-slate-900 disabled:opacity-50 text-white rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                    >
                      Request Edits
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* SUBMITTED STATE */}
            {status.state === "submitted" && (
              <div className="p-6 bg-gradient-to-tr from-emerald-50 to-teal-50 border border-emerald-200 rounded-2xl text-center space-y-2 shadow-xs">
                <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <h2 className="text-lg font-bold text-emerald-950">Application Successfully Submitted ✓</h2>
                <p className="text-xs text-emerald-800 max-w-md mx-auto">
                  All requirements fulfilled, documents attached, and the confirmation receipt was recorded on the official portal.
                </p>
              </div>
            )}

            {/* FAILED STATE */}
            {status.state === "failed" && (
              <div className="p-6 bg-rose-50 border border-rose-200 rounded-2xl space-y-3">
                <div className="flex items-center gap-2 text-rose-900 font-bold text-sm">
                  <AlertCircle className="w-5 h-5 text-rose-600" />
                  <span>Run Paused or Error Encountered</span>
                </div>
                {status.failure && (
                  <p className="text-xs font-mono bg-white p-3 rounded-lg border border-rose-200 text-rose-800 break-all">
                    {status.failure}
                  </p>
                )}
                <button
                  onClick={() => run(() => api.retry(id))}
                  disabled={busy}
                  className="w-full py-2.5 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white font-semibold rounded-xl text-xs transition-colors cursor-pointer flex items-center justify-center gap-2"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>Retry Application Run</span>
                </button>
              </div>
            )}
          </div>

          {/* Right Column: Verified Progress & Audit Stream */}
          <div className="space-y-5">
            {/* Verified Form Fields */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <FileCheck2 className="w-4 h-4 text-emerald-600" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">Filled Form Fields</h3>
                </div>
                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                  {status.filled.length} filled
                </span>
              </div>

              {status.filled.length > 0 ? (
                <div className="flex flex-wrap gap-1.5 max-h-48 overflow-y-auto pr-1">
                  {status.filled.map((f) => (
                    <span
                      key={f}
                      className="inline-flex items-center gap-1.5 text-[11px] bg-slate-50 border border-slate-200 text-slate-700 px-2.5 py-1 rounded-lg"
                    >
                      <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
                      <span>{f}</span>
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-400 italic py-2">No fields filled yet</p>
              )}
            </div>

            {/* Verified Attached Documents */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-indigo-600" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">Uploaded Documents</h3>
                </div>
                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                  {status.uploaded.length} attached
                </span>
              </div>

              {status.uploaded.length > 0 ? (
                <div className="space-y-2">
                  {status.uploaded.map((u) => (
                    <div
                      key={u}
                      className="flex items-center justify-between bg-slate-50 border border-slate-200 p-2.5 rounded-xl text-xs"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <FileText className="w-4 h-4 text-indigo-600 shrink-0" />
                        <span className="font-semibold text-slate-800 capitalize truncate">{u}</span>
                      </div>
                      <span className="text-[10px] text-emerald-700 font-semibold uppercase bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                        S3 Synced
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-400 italic py-2">No documents attached yet</p>
              )}
            </div>

            {/* Quick Audit Link */}
            <div className="p-4 rounded-2xl bg-indigo-50/60 border border-indigo-100 flex items-center justify-between">
              <div className="space-y-0.5">
                <p className="text-xs font-bold text-indigo-950 flex items-center gap-1.5">
                  <ListTodo className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Audit Trail</span>
                </p>
                <p className="text-[11px] text-indigo-700">View real-time event logs &amp; tool actions</p>
              </div>
              <Link
                to={`/applications/${id}/activity`}
                className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-2xs transition-colors"
              >
                Inspect
              </Link>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
