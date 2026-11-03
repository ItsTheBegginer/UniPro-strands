import { useEffect, useState } from "react"
import { useParams, Link } from "react-router-dom"
import { api, type ApplicationStatus } from "../api"

const STATE_BADGES: Record<string, { label: string; classes: string }> = {
  preparing: { label: "Preparing", classes: "bg-blue-100 text-blue-800" },
  requirements_check: { label: "Checking Requirements", classes: "bg-blue-100 text-blue-800" },
  ready_to_run: { label: "Ready to Run", classes: "bg-blue-100 text-blue-800" },
  running: { label: "In Progress", classes: "bg-blue-100 text-blue-800 animate-pulse" },
  student_action_required: { label: "Action Required", classes: "bg-amber-100 text-amber-800 border border-amber-300 font-semibold" },
  awaiting_final_approval: { label: "Ready for Review", classes: "bg-indigo-100 text-indigo-800 border border-indigo-300 font-semibold" },
  submitting: { label: "Submitting…", classes: "bg-purple-100 text-purple-800 animate-pulse" },
  submitted: { label: "Submitted ✓", classes: "bg-emerald-100 text-emerald-800 font-semibold border border-emerald-300" },
  failed: { label: "Failed", classes: "bg-red-100 text-red-800 font-semibold" },
}

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

  // Auto-poll when application is actively working in background
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
      <div className="max-w-xl mx-auto p-8 text-center text-gray-500">
        Loading application details…
      </div>
    )
  }

  const badge = STATE_BADGES[status.state] || { label: status.state, classes: "bg-gray-100 text-gray-800" }

  return (
    <div className="max-w-xl mx-auto p-6 space-y-5 font-sans">
      <div className="flex items-center justify-between">
        <Link to="/" className="text-sm text-blue-600 hover:underline">&larr; Back to Dashboard</Link>
        <Link to={`/applications/${id}/activity`} className="text-sm text-blue-600 font-medium hover:underline">
          View Activity Trail &rarr;
        </Link>
      </div>

      <div className="border-b pb-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{status.university}</h1>
            <p className="text-base text-gray-600 font-medium">{status.program}</p>
          </div>
          <span className={`text-xs px-2.5 py-1 rounded-full ${badge.classes}`}>
            {badge.label}
          </span>
        </div>
        <p className="text-xs text-gray-400 mt-1 font-mono">ID: {status.application_id}</p>
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
          {error}
        </div>
      )}

      {status.failure && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-800 space-y-1">
          <p className="font-semibold">Run Paused / Failed</p>
          <p className="text-xs font-mono break-all">{status.failure}</p>
        </div>
      )}

      {busy && (
        <div className="flex items-center space-x-3 text-blue-700 text-sm bg-blue-50 border border-blue-200 p-3.5 rounded-lg">
          <svg className="animate-spin h-5 w-5 text-blue-600 shrink-0" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
          </svg>
          <div>
            <p className="font-medium">Agent is working in the browser portal…</p>
            <p className="text-xs text-blue-500">Filling fields and inspecting university requirements</p>
          </div>
        </div>
      )}

      {/* ACTION REQUIRED: Pending Question / Student Approval */}
      {status.state === "student_action_required" && status.pending && (
        <div className="border border-amber-300 bg-amber-50/40 rounded-xl p-5 space-y-3.5 shadow-sm">
          <div className="flex items-start justify-between gap-2">
            <h2 className="font-semibold text-gray-900 text-base">{status.pending.question}</h2>
            {status.pending.risk && (
              <span className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded ${
                status.pending.risk === "high" ? "bg-red-100 text-red-800 border border-red-200" : "bg-amber-100 text-amber-800 border border-amber-200"
              }`}>
                {status.pending.risk} risk
              </span>
            )}
          </div>

          <p className="text-xs text-gray-600">{status.pending.reason}</p>

          {status.pending.proposed_answer && (
            <div className="flex items-center justify-between bg-white border border-amber-200 p-2.5 rounded-lg text-xs">
              <span className="text-gray-700 truncate mr-2">
                <strong className="text-gray-900">Suggested:</strong> {status.pending.proposed_answer}
              </span>
              <button
                type="button"
                onClick={() => setAnswer(status.pending?.proposed_answer || "")}
                className="shrink-0 bg-amber-600 hover:bg-amber-700 text-white font-medium px-2 py-1 rounded text-xs transition-colors"
              >
                Use this
              </button>
            </div>
          )}

          <div className="space-y-2">
            {/* Render radio buttons when the form field is a radio group */}
            {status.pending.field_type === 'radio' && status.pending.options && status.pending.options.length > 0 ? (
              <fieldset className="space-y-2">
                {status.pending.options.map((opt) => (
                  <label
                    key={opt}
                    className={`flex items-center gap-3 cursor-pointer border rounded-lg px-4 py-2.5 text-sm transition-colors ${
                      answer === opt
                        ? 'bg-blue-50 border-blue-400 text-blue-900 font-medium'
                        : 'bg-white border-gray-200 text-gray-800 hover:border-gray-400'
                    }`}
                  >
                    <input
                      type="radio"
                      name="student_answer"
                      value={opt}
                      checked={answer === opt}
                      onChange={() => setAnswer(opt)}
                      className="h-4 w-4 text-blue-600 accent-blue-600"
                    />
                    {opt}
                  </label>
                ))}
              </fieldset>
            ) : (
              /* Default: plain text area for open-ended questions */
              <textarea
                className="border border-gray-300 rounded-lg p-2.5 w-full text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                rows={3}
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                placeholder="Type your answer or response here..."
              />
            )}
            <button
              onClick={() => run(() => api.answer(id, answer)).then(() => setAnswer(""))}
              disabled={busy || !answer.trim()}
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-medium rounded-lg text-sm transition-colors"
            >
              Submit Answer & Resume Application
            </button>
          </div>
        </div>
      )}

      {/* FINAL REVIEW: Human Approval Gate before submit */}
      {status.state === "awaiting_final_approval" && (
        <div className="border border-indigo-200 bg-indigo-50/40 rounded-xl p-5 space-y-4 shadow-sm">
          <div>
            <h2 className="font-semibold text-gray-900 text-base">Application Ready for Final Approval</h2>
            <p className="text-xs text-gray-600 mt-1">
              The agent has completed all form sections and uploads. As a safety policy, final submission requires your authorization.
            </p>
          </div>

          <button
            onClick={() => run(() => api.submit(id))}
            disabled={busy}
            className="w-full py-2.5 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white font-semibold rounded-lg text-sm shadow-sm transition-colors"
          >
            Authorize & Submit Application
          </button>

          <div className="pt-2 border-t border-indigo-100">
            <p className="text-xs font-medium text-gray-700 mb-1.5">Want changes made first?</p>
            <div className="flex gap-2">
              <input
                className="border border-gray-300 rounded-lg px-3 py-1.5 text-xs flex-1 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="e.g. Change graduation year to 2027"
              />
              <button
                onClick={() => run(() => api.requestChanges(id, note)).then(() => setNote(""))}
                disabled={busy || !note.trim()}
                className="px-3.5 py-1.5 bg-gray-700 hover:bg-gray-800 disabled:opacity-50 text-white rounded-lg text-xs font-medium transition-colors"
              >
                Request Edits
              </button>
            </div>
          </div>
        </div>
      )}

      {status.state === "running" && (
        <button
          onClick={() => run(() => api.continueRun(id))}
          disabled={busy}
          className="w-full py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-medium rounded-lg text-sm transition-colors"
        >
          Continue Run
        </button>
      )}

      {status.state === "failed" && (
        <button
          onClick={() => run(() => api.retry(id))}
          disabled={busy}
          className="w-full py-2.5 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white font-medium rounded-lg text-sm transition-colors"
        >
          Retry Application
        </button>
      )}

      {status.state === "submitted" && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-center space-y-1">
          <p className="text-emerald-800 font-bold text-lg">Application Submitted ✓</p>
          <p className="text-xs text-emerald-600">All fields filled, documents uploaded, and confirmation recorded.</p>
        </div>
      )}

      {/* PROGRESS OVERVIEW */}
      <div className="border border-gray-200 rounded-xl p-4 bg-gray-50/60 space-y-3.5">
        <h3 className="text-xs uppercase font-bold tracking-wider text-gray-500">Application Progress</h3>

        <div>
          <div className="flex items-center justify-between text-xs text-gray-600 mb-1.5">
            <span className="font-medium">Filled Form Fields</span>
            <span>{status.filled.length} fields</span>
          </div>
          {status.filled.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {status.filled.map((f) => (
                <span key={f} className="inline-flex items-center gap-1 text-[11px] bg-white border border-gray-200 text-gray-700 px-2 py-0.5 rounded shadow-2xs">
                  <span className="text-green-600 font-bold">✓</span> {f}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-xs text-gray-400 italic">No fields filled yet</p>
          )}
        </div>

        <div>
          <div className="flex items-center justify-between text-xs text-gray-600 mb-1.5">
            <span className="font-medium">Uploaded Documents</span>
            <span>{status.uploaded.length} files</span>
          </div>
          {status.uploaded.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {status.uploaded.map((u) => (
                <span key={u} className="inline-flex items-center gap-1 text-[11px] bg-white border border-blue-200 text-blue-800 px-2 py-0.5 rounded shadow-2xs">
                  <span>📄</span> {u}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-xs text-gray-400 italic">No documents uploaded yet</p>
          )}
        </div>
      </div>
    </div>
  )
}
