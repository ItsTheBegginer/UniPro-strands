import { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import { api, type ApplicationStatus } from "../api"
const STATE_BADGES: Record<string, { label: string; classes: string }> = {
  preparing: { label: "Preparing", classes: "bg-blue-100 text-blue-800" },
  requirements_check: { label: "Checking Reqs", classes: "bg-blue-100 text-blue-800" },
  ready_to_run: { label: "Ready", classes: "bg-blue-100 text-blue-800" },
  running: { label: "In Progress", classes: "bg-blue-100 text-blue-800 animate-pulse" },
  student_action_required: { label: "Action Required", classes: "bg-amber-100 text-amber-800 font-semibold border border-amber-300" },
  awaiting_final_approval: { label: "Ready for Review", classes: "bg-indigo-100 text-indigo-800 font-semibold border border-indigo-300" },
  submitting: { label: "Submitting…", classes: "bg-purple-100 text-purple-800 animate-pulse" },
  submitted: { label: "Submitted ✓", classes: "bg-emerald-100 text-emerald-800 font-semibold border border-emerald-300" },
  failed: { label: "Failed", classes: "bg-red-100 text-red-800 font-semibold" },
}

export function Dashboard() {
  const [apps, setApps] = useState<ApplicationStatus[]>([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showNewModal, setShowNewModal] = useState(false)
  const [university, setUniversity] = useState("Demo University")
  const [program, setProgram] = useState("Computer Science")

  async function load() {
    try {
      const res = await api.list()
      setApps(res.applications)
    } catch (e) {
      setError(String(e))
    }
  }

  useEffect(() => {
    load()
    const timer = setInterval(load, 5000)
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
    <div className="max-w-2xl mx-auto p-6 space-y-6 font-sans">
      <div className="flex items-center justify-between border-b pb-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">UniPro</h1>
          <p className="text-xs text-gray-500">Autonomous University Application Agent</p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            to="/profile"
            className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 hover:border-blue-400 hover:text-blue-700 rounded-lg transition-colors"
          >
            My Profile
          </Link>
          <button
            onClick={() => setShowNewModal(true)}
            disabled={busy}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-medium text-sm rounded-lg shadow-sm transition-colors"
          >
            {busy ? "Starting…" : "+ New Application"}
          </button>
        </div>
      </div>

      {showNewModal && (
        <div className="border border-blue-200 bg-blue-50/50 rounded-xl p-5 space-y-4 shadow-sm">
          <h2 className="font-semibold text-gray-900 text-sm">Start a New University Application</h2>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">University</label>
              <input
                className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-xs bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                value={university}
                onChange={(e) => setUniversity(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Program / Major</label>
              <input
                className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-xs bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                value={program}
                onChange={(e) => setProgram(e.target.value)}
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button
              onClick={() => setShowNewModal(false)}
              className="px-3 py-1.5 text-xs text-gray-600 hover:text-gray-800 rounded"
            >
              Cancel
            </button>
            <button
              onClick={handleStart}
              disabled={busy || !university || !program}
              className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-medium rounded-lg shadow-xs"
            >
              {busy ? "Launching Agent…" : "Start Agent Run"}
            </button>
          </div>
        </div>
      )}

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
          {error}
        </div>
      )}

      {busy && (
        <div className="flex items-center space-x-3 text-blue-700 text-sm bg-blue-50 border border-blue-200 p-3.5 rounded-lg">
          <svg className="animate-spin h-5 w-5 text-blue-600 shrink-0" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
          </svg>
          <div>
            <p className="font-medium">Agent is starting the application…</p>
            <p className="text-xs text-blue-500">Loading portal and checking verified student credentials</p>
          </div>
        </div>
      )}

      <div className="space-y-3">
        <h2 className="text-xs uppercase font-bold tracking-wider text-gray-500">Active Applications</h2>
        {apps.map((a) => {
          const badge = STATE_BADGES[a.state] || { label: a.state, classes: "bg-gray-100 text-gray-800" }
          return (
            <Link
              key={a.application_id}
              to={`/applications/${a.application_id}`}
              className="block border border-gray-200 rounded-xl p-4 hover:border-blue-300 hover:shadow-xs bg-white transition-all"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-semibold text-gray-900 text-base">{a.university}</h3>
                  <p className="text-xs text-gray-500 font-medium mt-0.5">{a.program}</p>
                  <p className="text-[11px] text-gray-400 font-mono mt-1">{a.application_id}</p>
                </div>
                <div className="flex flex-col items-end gap-1.5">
                  <span className={`text-xs px-2.5 py-0.5 rounded-full ${badge.classes}`}>
                    {badge.label}
                  </span>
                  <div className="text-[11px] text-gray-400">
                    {a.filled.length} fields filled · {a.uploaded.length} docs
                  </div>
                </div>
              </div>
            </Link>
          )
        })}

        {apps.length === 0 && !busy && (
          <div className="border border-dashed border-gray-300 rounded-xl p-8 text-center text-gray-500 text-sm">
            No applications started yet. Click <span className="font-semibold text-blue-600">+ New Application</span> to begin!
          </div>
        )}
      </div>
    </div>
  )
}
