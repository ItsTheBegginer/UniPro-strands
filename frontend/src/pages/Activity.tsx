import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { api } from '../api'

export function Activity() {
  const { id } = useParams<{ id: string }>()
  const [lines, setLines] = useState<string[]>([])

  useEffect(() => {
    if (id) api.activity(id).then((r) => setLines(r.timeline))
  }, [id])

  return (
    <div className="max-w-xl mx-auto p-6 space-y-2">
      <Link to={`/applications/${id}`} className="text-sm text-blue-600">&larr; Back</Link>
      <h1 className="text-xl font-semibold">Activity</h1>
      <ul className="text-sm font-mono space-y-1">
        {lines.map((l, i) => <li key={i}>{l}</li>)}
      </ul>
    </div>
  )
}
