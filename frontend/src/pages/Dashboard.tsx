import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api, type ApplicationStatus } from '../api'

export function Dashboard() {
  const [apps, setApps] = useState<ApplicationStatus[]>([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function load() {
    setApps((await api.list()).applications)
  }

  useEffect(() => { load() }, [])

  async function startNew() {
    setBusy(true); setError(null)
    try {
      await api.start('Demo University', 'Computer Science')
      await load()
    } catch (e) {
      setError(String(e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">My Applications</h1>
        <button onClick={startNew} disabled={busy} className="px-4 py-2 bg-blue-600 text-white rounded">
          {busy ? 'Starting…' : 'New Application'}
        </button>
      </div>
      {error && <p className="text-red-600 text-sm">{error}</p>}
      <div className="space-y-2">
        {apps.map((a) => (
          <Link
            key={a.application_id}
            to={`/applications/${a.application_id}`}
            className="block border rounded p-4 hover:bg-gray-50"
          >
            <div className="flex justify-between">
              <span>{a.university} — {a.program}</span>
              <span className="text-sm text-gray-500">{a.state}</span>
            </div>
          </Link>
        ))}
        {apps.length === 0 && <p className="text-gray-500">No applications yet.</p>}
      </div>
    </div>
  )
}
