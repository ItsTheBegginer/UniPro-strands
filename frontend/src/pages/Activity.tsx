import { useEffect, useState } from "react"
import { useParams, Link } from "react-router-dom"
import { api } from "../api"

export function Activity() {
  const { id } = useParams<{ id: string }>()
  const [lines, setLines] = useState<string[]>([])
  const [loading, setLoading] = useState(true)

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

  return (
    <div className="max-w-xl mx-auto p-6 space-y-4 font-sans">
      <div className="flex items-center justify-between border-b pb-4">
        <div>
          <Link to={`/applications/${id}`} className="text-sm text-blue-600 hover:underline">&larr; Back to Application</Link>
          <h1 className="text-2xl font-bold text-gray-900 mt-1">Audit & Activity Trail</h1>
          <p className="text-xs text-gray-500 font-mono">{id}</p>
        </div>
        <button
          onClick={load}
          className="px-3 py-1.5 text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-lg border border-gray-200 transition-colors"
        >
          Refresh
        </button>
      </div>

      {loading && lines.length === 0 ? (
        <p className="text-sm text-gray-500 italic py-4">Loading activity trail…</p>
      ) : lines.length === 0 ? (
        <p className="text-sm text-gray-500 italic py-4">No activity events recorded yet.</p>
      ) : (
        <div className="border border-gray-200 rounded-xl bg-gray-50/70 p-4 divide-y divide-gray-200/60">
          {lines.map((l, i) => {
            const timePart = l.slice(0, 5)
            const textPart = l.slice(5).trim()
            const isStateChange = textPart.startsWith("State ->")
            const isSubmission = textPart.includes("submitted") || textPart.includes("approved")
            const isBlocked = textPart.includes("Blocked") || textPart.includes("failed")

            return (
              <div key={i} className="py-2.5 first:pt-0 last:pb-0 flex items-start gap-3 text-xs">
                <span className="shrink-0 font-mono font-bold text-gray-400 bg-white border border-gray-200 px-1.5 py-0.5 rounded text-[10px]">
                  {timePart}
                </span>
                <span className={`flex-1 ${
                  isSubmission ? "font-semibold text-emerald-800" :
                  isBlocked ? "font-medium text-red-700" :
                  isStateChange ? "font-medium text-blue-800" : "text-gray-700"
                }`}>
                  {textPart}
                </span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
