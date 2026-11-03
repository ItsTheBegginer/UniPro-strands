import { useEffect, useState } from "react"
import { useParams, Link } from "react-router-dom"
import { api } from "../api"
import { Navbar } from "../components/Navbar"
import {
  ArrowLeft,
  History,
  RotateCw,
  Clock,
  ShieldAlert,
  CheckCircle2,
  AlertCircle,
  FileText,
  Search,
  Terminal
} from "lucide-react"

export function Activity() {
  const { id } = useParams<{ id: string }>()
  const [lines, setLines] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState("all")
  const [searchTerm, setSearchTerm] = useState("")

  async function load() {
    if (!id) return
    try {
      const res = await api.activity(id)
      setLines(res.timeline)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    const timer = setInterval(load, 3000)
    return () => clearInterval(timer)
  }, [id])

  const filteredLines = lines.filter((l) => {
    if (searchTerm && !l.toLowerCase().includes(searchTerm.toLowerCase())) return false
    if (filter === "approval") return l.includes("approval") || l.includes("action_required") || l.includes("question") || l.includes("responded")
    if (filter === "browser") return l.includes("fill_field") || l.includes("select_option") || l.includes("click_button") || l.includes("open_page")
    if (filter === "error") return l.includes("error") || l.includes("failed") || l.includes("denied")
    return true
  })

  function getEventStyle(line: string) {
    if (line.includes("error") || line.includes("failed")) {
      return { badge: "bg-rose-100 text-rose-800 border-rose-200", icon: AlertCircle, text: "text-rose-950" }
    }
    if (line.includes("human_approval") || line.includes("student_action") || line.includes("question_encountered")) {
      return { badge: "bg-amber-100 text-amber-800 border-amber-200", icon: ShieldAlert, text: "text-amber-950 font-semibold" }
    }
    if (line.includes("submitted") || line.includes("student_responded") || line.includes("final_review_ready")) {
      return { badge: "bg-emerald-100 text-emerald-800 border-emerald-200", icon: CheckCircle2, text: "text-emerald-950 font-semibold" }
    }
    if (line.includes("field_filled") || line.includes("fill_field") || line.includes("select_option")) {
      return { badge: "bg-blue-100 text-blue-800 border-blue-200", icon: FileText, text: "text-slate-900" }
    }
    return { badge: "bg-slate-100 text-slate-700 border-slate-200", icon: Terminal, text: "text-slate-700" }
  }

  return (
    <div className="min-h-screen bg-slate-50/70 font-sans text-slate-900 flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Navigation Breadcrumb */}
        <div className="flex items-center justify-between">
          <Link
            to={`/applications/${id}`}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-indigo-600 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Application</span>
          </Link>

          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs text-slate-500 font-medium">Live Audit Streaming</span>
          </div>
        </div>

        {/* Header Card */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-100 text-indigo-700 flex items-center justify-center shrink-0">
              <History className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900">Audit &amp; Activity Trail</h1>
              <p className="text-xs font-mono text-slate-500">Application ID: {id}</p>
            </div>
          </div>

          <button
            onClick={load}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs transition-colors cursor-pointer self-start sm:self-auto"
          >
            <RotateCw className="w-3.5 h-3.5 text-slate-500" />
            <span>Refresh Log</span>
          </button>
        </div>

        {/* Filter Controls */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
            {[
              { key: "all", label: "All Events" },
              { key: "browser", label: "Browser Actions" },
              { key: "approval", label: "Student Decisions" },
              { key: "error", label: "Errors & Warnings" },
            ].map((f) => (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                  filter === f.key
                    ? "bg-indigo-600 text-white shadow-2xs"
                    : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search logs…"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>

        {/* Timeline Log Container */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-3">
          {loading && lines.length === 0 ? (
            <div className="flex items-center justify-center p-12 text-slate-400 gap-2 text-xs">
              <Clock className="w-4 h-4 animate-spin text-indigo-600" />
              <span>Fetching activity stream…</span>
            </div>
          ) : filteredLines.length === 0 ? (
            <div className="text-center py-12 text-slate-400 text-xs">
              No matching activity events recorded.
            </div>
          ) : (
            <div className="space-y-2 font-mono text-xs divide-y divide-slate-100">
              {filteredLines.map((l, i) => {
                const timePart = l.slice(0, 5)
                const textPart = l.slice(5).trim()
                const style = getEventStyle(l)
                const EventIcon = style.icon

                return (
                  <div key={i} className="pt-2.5 first:pt-0 flex items-start gap-3">
                    <span className="shrink-0 text-[11px] text-slate-400 font-medium px-2 py-0.5 rounded bg-slate-50 border border-slate-200 mt-0.5">
                      {timePart}
                    </span>
                    <div className="flex items-start gap-2 flex-1">
                      <EventIcon className="w-3.5 h-3.5 shrink-0 mt-0.5 text-slate-400" />
                      <p className={`break-all leading-relaxed ${style.text}`}>
                        {textPart}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
