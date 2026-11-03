import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { api, type ProfileSummary } from "../api"
import { Navbar } from "../components/Navbar"
import {
  Users,
  UserPlus,
  CheckCircle2,
  Trash2,
  ArrowRightCircle,
  Loader2,
  AlertCircle,
  User,
} from "lucide-react"

export function Profiles() {
  const navigate = useNavigate()
  const [profiles, setProfiles] = useState<ProfileSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState<string | null>(null)

  // New profile form
  const [showCreate, setShowCreate] = useState(false)
  const [newName, setNewName] = useState("")
  const [creating, setCreating] = useState(false)

  async function load() {
    try {
      const res = await api.listProfiles()
      setProfiles(res.profiles)
    } catch (e) {
      setError(String(e))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  async function handleActivate(id: string) {
    setBusy(id)
    try {
      await api.activateProfile(id)
      await load()
    } catch (e) {
      setError(String(e))
    } finally {
      setBusy(null)
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this profile? This cannot be undone.")) return
    setBusy(id)
    try {
      await api.deleteProfile(id)
      await load()
    } catch (e) {
      setError(String(e))
    } finally {
      setBusy(null)
    }
  }

  async function handleCreate() {
    if (!newName.trim()) return
    setCreating(true)
    setError(null)
    try {
      await api.createProfile(newName.trim())
      setShowCreate(false)
      setNewName("")
      await load()
      navigate("/profile")
    } catch (e) {
      setError(String(e))
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50/70 font-sans text-slate-900 flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-3xl w-full mx-auto px-4 sm:px-6 py-8 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center">
              <Users className="w-5 h-5 text-indigo-600" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900">Student Profiles</h1>
              <p className="text-xs text-slate-500">Switch between students or create a new profile</p>
            </div>
          </div>
          <button
            onClick={() => setShowCreate(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs rounded-xl shadow-sm transition-all active:scale-95 cursor-pointer"
          >
            <UserPlus className="w-3.5 h-3.5" />
            New Profile
          </button>
        </div>

        {error && (
          <div className="flex items-center gap-2 p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700">
            <AlertCircle className="w-4 h-4 shrink-0" />
            {error}
          </div>
        )}

        {/* Create Profile Card */}
        {showCreate && (
          <div className="bg-white border border-indigo-200 rounded-2xl p-5 shadow-sm space-y-3">
            <h2 className="font-bold text-sm text-slate-900 flex items-center gap-2">
              <UserPlus className="w-4 h-4 text-indigo-600" /> Create New Profile
            </h2>
            <div className="flex gap-2">
              <input
                autoFocus
                type="text"
                placeholder="Student full name (e.g. Priya Sharma)"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleCreate()}
                className="flex-1 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
              />
              <button
                onClick={handleCreate}
                disabled={creating || !newName.trim()}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-semibold text-xs rounded-xl transition-all cursor-pointer"
              >
                {creating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                Create
              </button>
              <button
                onClick={() => { setShowCreate(false); setNewName("") }}
                className="px-3 py-2 text-xs text-slate-500 hover:text-slate-800 rounded-xl border border-slate-200 hover:bg-slate-50 transition-all cursor-pointer"
              >
                Cancel
              </button>
            </div>
            <p className="text-[11px] text-slate-400">After creating, you'll be taken to the profile editor to fill in details.</p>
          </div>
        )}

        {/* Profile List */}
        <div className="space-y-3">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 text-indigo-600 animate-spin" />
            </div>
          ) : profiles.length === 0 ? (
            <div className="bg-white border-2 border-dashed border-slate-200 rounded-2xl p-10 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto">
                <User className="w-6 h-6 text-slate-400" />
              </div>
              <p className="text-sm font-medium text-slate-500">
                No profiles found. Create one above or run{" "}
                <code className="bg-slate-100 px-1 rounded text-xs">python scripts/seed_demo_profile.py</code>
              </p>
            </div>
          ) : (
            profiles.map((p) => (
              <div
                key={p.id}
                className={`bg-white rounded-2xl border p-4 flex items-center gap-4 shadow-sm transition-all ${
                  p.active
                    ? "border-indigo-300 ring-2 ring-indigo-50 shadow-indigo-100"
                    : "border-slate-200 hover:border-slate-300"
                }`}
              >
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                    p.active ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-500"
                  }`}
                >
                  <User className="w-5 h-5" />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-bold text-sm text-slate-900 truncate">{p.name}</h3>
                    {p.active && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-indigo-100 text-indigo-700 text-[10px] font-bold rounded-full border border-indigo-200">
                        <CheckCircle2 className="w-2.5 h-2.5" /> ACTIVE
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-400 font-mono">{p.id}</p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {p.active ? (
                    <button
                      onClick={() => navigate("/profile")}
                      className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-slate-600 border border-slate-200 hover:bg-slate-50 rounded-lg transition-all cursor-pointer"
                    >
                      Edit Profile
                    </button>
                  ) : (
                    <>
                      <button
                        onClick={() => handleActivate(p.id)}
                        disabled={busy === p.id}
                        className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-indigo-600 border border-indigo-200 hover:bg-indigo-50 rounded-lg transition-all disabled:opacity-50 cursor-pointer"
                      >
                        {busy === p.id ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <ArrowRightCircle className="w-3 h-3" />
                        )}
                        Switch
                      </button>
                      <button
                        onClick={() => handleDelete(p.id)}
                        disabled={busy === p.id}
                        className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all disabled:opacity-50 cursor-pointer"
                        title="Delete profile"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        <p className="text-xs text-slate-400 text-center">
          Each profile is an independent student with their own verified data and application history.
        </p>
      </main>

      <footer className="border-t border-slate-200 bg-white py-6 mt-12 text-center text-xs text-slate-400">
        <p>UniPro — Built with Strands Agents SDK &amp; Amazon Bedrock for the AWS Builder Center Hackathon</p>
      </footer>
    </div>
  )
}

