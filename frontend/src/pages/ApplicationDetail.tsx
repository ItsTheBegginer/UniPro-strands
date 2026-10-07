import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { api, type ApplicationStatus } from '../api'

export function ApplicationDetail() {
  const { id } = useParams<{ id: string }>()
  const [status, setStatus] = useState<ApplicationStatus | null>(null)
  const [answer, setAnswer] = useState('')
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function refresh() {
    if (!id) return
    setStatus(await api.status(id))
  }

  useEffect(() => { refresh() }, [id])

  async function run(fn: () => Promise<ApplicationStatus>) {
    setBusy(true); setError(null)
    try {
      setStatus(await fn())
    } catch (e) {
      setError(String(e))
    } finally {
      setBusy(false)
    }
  }

  if (!status || !id) return <div className="p-6">Loading…</div>

  return (
    <div className="max-w-xl mx-auto p-6 space-y-4">
      <Link to="/" className="text-sm text-blue-600">&larr; Dashboard</Link>
      <h1 className="text-xl font-semibold">{status.university} — {status.program}</h1>
      <p className="text-sm text-gray-500">
        {status.application_id} — state: <b>{status.state}</b> —{' '}
        <Link to={`/applications/${id}/activity`} className="text-blue-600">activity</Link>
      </p>

      {error && <p className="text-red-600 text-sm">{error}</p>}
      {status.failure && <p className="text-red-600 text-sm">Failure: {status.failure}</p>}

      {status.state === 'student_action_required' && status.pending && (
        <div className="border rounded p-4 space-y-2">
          <p className="font-medium">{status.pending.question}</p>
          <p className="text-sm text-gray-500">{status.pending.reason}</p>
          {status.pending.proposed_answer && (
            <p className="text-sm italic">Suggested: {status.pending.proposed_answer}</p>
          )}
          <input
            className="border rounded px-2 py-1 w-full"
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            placeholder="Your answer"
          />
          <button
            onClick={() => run(() => api.answer(id, answer)).then(() => setAnswer(''))}
            disabled={busy || !answer}
            className="px-4 py-2 bg-blue-600 text-white rounded"
          >
            Answer
          </button>
        </div>
      )}

      {status.state === 'awaiting_final_approval' && (
        <div className="border rounded p-4 space-y-3">
          <p>Application ready for your review in the browser window.</p>
          <button onClick={() => run(() => api.submit(id))} disabled={busy} className="px-4 py-2 bg-green-600 text-white rounded">
            Submit
          </button>
          <div className="flex gap-2">
            <input
              className="border rounded px-2 py-1 flex-1"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Describe changes instead"
            />
            <button
              onClick={() => run(() => api.requestChanges(id, note)).then(() => setNote(''))}
              disabled={busy || !note}
              className="px-4 py-2 bg-gray-600 text-white rounded"
            >
              Request changes
            </button>
          </div>
        </div>
      )}

      {status.state === 'running' && (
        <button onClick={() => run(() => api.continueRun(id))} disabled={busy} className="px-4 py-2 bg-blue-600 text-white rounded">
          Continue
        </button>
      )}

      {status.state === 'failed' && (
        <button onClick={() => run(() => api.retry(id))} disabled={busy} className="px-4 py-2 bg-amber-600 text-white rounded">
          Retry
        </button>
      )}

      {status.state === 'submitted' && <p className="text-green-700 font-medium">Submitted ✓</p>}

      <div className="text-xs text-gray-500">
        Filled: {status.filled.join(', ') || 'none'}<br />
        Uploaded: {status.uploaded.join(', ') || 'none'}
      </div>
    </div>
  )
}
