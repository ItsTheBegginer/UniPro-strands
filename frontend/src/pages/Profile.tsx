import { useEffect, useRef, useState } from "react"
import { Link } from "react-router-dom"
import { api, type StudentProfile } from "../api"

// ─── Field definitions ────────────────────────────────────────────────────────
// Each entry maps a human label to the profile JSON key and an input hint.
const SCALAR_FIELDS: { label: string; key: string; placeholder: string; type?: string }[] = [
  { label: "Full Name",         key: "name",              placeholder: "e.g. Alex Johnson" },
  { label: "Email Address",     key: "email",             placeholder: "e.g. alex@example.com", type: "email" },
  { label: "Date of Birth",     key: "date_of_birth",     placeholder: "YYYY-MM-DD",             type: "date" },
  { label: "Home Address",      key: "address",           placeholder: "Street, City, Country" },
  { label: "GPA",               key: "gpa",               placeholder: "e.g. 3.9",               type: "number" },
  { label: "Graduation Year",   key: "graduation_year",   placeholder: "e.g. 2026",              type: "number" },
  { label: "SAT Score",         key: "test_scores",       placeholder: "e.g. 1480" },
  { label: "Institution",       key: "education",         placeholder: "e.g. MIT" },
  { label: "Degree",            key: "education_degree",  placeholder: "e.g. B.Tech Computer Science" },
  { label: "Skills (comma-sep)",key: "skills",            placeholder: "Python, ML, TypeScript" },
  { label: "Personal Statement",key: "personal_statement",placeholder: "Write your personal statement…" },
]

const DOC_TYPES = [
  { key: "resume",       label: "Resume / CV",        accept: ".pdf,.doc,.docx" },
  { key: "transcript",   label: "Transcript",          accept: ".pdf" },
  { key: "cover_letter", label: "Cover Letter",        accept: ".pdf,.doc,.docx" },
]

// ─── Helpers ──────────────────────────────────────────────────────────────────
function profileValueToString(key: string, raw: unknown): string {
  if (raw == null) return ""

  // test_scores: {SAT: 1480} → "1480"
  if (key === "test_scores" && typeof raw === "object" && !Array.isArray(raw)) {
    const sat = (raw as Record<string, unknown>)["SAT"]
    return sat != null ? String(sat) : ""
  }

  // education: [{institution, degree}] → institution only (degree handled separately)
  if (key === "education" && Array.isArray(raw)) {
    const first = raw[0] as Record<string, unknown> | undefined
    return first ? String(first["institution"] ?? "") : ""
  }

  // education_degree: derive from education array
  if (key === "education_degree") return ""   // populated below separately

  // skills: string[] → "Python, ML"
  if (Array.isArray(raw)) return raw.join(", ")

  return String(raw)
}

function buildSavePayload(form: Record<string, string>): Record<string, unknown> {
  const out: Record<string, unknown> = {}

  for (const { key } of SCALAR_FIELDS) {
    if (key === "education_degree") continue   // merged below
    const v = form[key]?.trim()
    if (!v) continue

    if (key === "test_scores") {
      out["test_scores"] = { SAT: Number(v) || v }
      continue
    }
    if (key === "education") {
      // Merge institution + degree into education array
      const degree = form["education_degree"]?.trim() ?? ""
      out["education"] = [{ institution: v, degree }]
      continue
    }
    if (key === "skills") {
      out["skills"] = v.split(",").map((s) => s.trim()).filter(Boolean)
      continue
    }
    if (key === "gpa" || key === "graduation_year") {
      out[key] = Number(v) || v
      continue
    }
    out[key] = v
  }

  return out
}

// ─── Component ────────────────────────────────────────────────────────────────
export function Profile() {
  const [profile, setProfile] = useState<StudentProfile | null>(null)
  const [form, setForm] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState<string | null>(null)   // doc_type being uploaded
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileRefs = useRef<Record<string, HTMLInputElement | null>>({})

  // ── Load profile on mount ──────────────────────────────────────────────────
  useEffect(() => {
    api.getProfile().then((p) => {
      setProfile(p)
      // Pre-fill form from loaded profile
      const initial: Record<string, string> = {}
      for (const { key } of SCALAR_FIELDS) {
        if (key === "education_degree") {
          // Pull from education array
          const eduField = p.fields["education"]
          if (eduField && Array.isArray(eduField.value)) {
            const first = (eduField.value as Record<string, unknown>[])[0]
            initial[key] = first ? String(first["degree"] ?? "") : ""
          }
          continue
        }
        const field = p.fields[key]
        if (field) initial[key] = profileValueToString(key, field.value)
      }
      setForm(initial)
    }).catch(() => {
      // No profile yet — start empty
      setProfile({ fields: {}, documents: {} })
    })
  }, [])

  // ── Save scalar fields ─────────────────────────────────────────────────────
  async function handleSave() {
    setSaving(true)
    setError(null)
    setSaved(false)
    try {
      const payload = buildSavePayload(form)
      await api.saveProfile(payload)
      // Reload to reflect saved state
      const fresh = await api.getProfile()
      setProfile(fresh)
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (e) {
      setError(String(e))
    } finally {
      setSaving(false)
    }
  }

  // ── Upload a document ──────────────────────────────────────────────────────
  async function handleUpload(docType: string, file: File) {
    setUploading(docType)
    setError(null)
    try {
      await api.uploadDocument(docType, file)
      const fresh = await api.getProfile()
      setProfile(fresh)
    } catch (e) {
      setError(String(e))
    } finally {
      setUploading(null)
    }
  }

  // ── Remove a document ─────────────────────────────────────────────────────
  async function handleRemoveDoc(docType: string) {
    setError(null)
    try {
      await api.deleteDocument(docType)
      const fresh = await api.getProfile()
      setProfile(fresh)
    } catch (e) {
      setError(String(e))
    }
  }

  // ─── Render ───────────────────────────────────────────────────────────────
  if (!profile) {
    return (
      <div className="max-w-2xl mx-auto p-8 text-center text-gray-500">
        Loading your profile…
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6 font-sans">
      {/* Header */}
      <div className="flex items-center justify-between border-b pb-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Profile</h1>
          <p className="text-xs text-gray-500 mt-0.5">
            UniPro uses this information to fill every application automatically.
          </p>
        </div>
        <Link to="/" className="text-sm text-blue-600 hover:underline">
          ← Dashboard
        </Link>
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
          {error}
        </div>
      )}

      {/* ── Personal Information ────────────────────────────────────────── */}
      <section className="border border-gray-200 rounded-xl p-5 space-y-4 bg-white">
        <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wider">
          Personal &amp; Academic Information
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {SCALAR_FIELDS.map(({ label, key, placeholder, type }) => {
            const stored = key === "education_degree"
              ? profile.fields["education"]
              : profile.fields[key]
            const isVerified = stored?.verified === true

            return (
              <div key={key} className={key === "personal_statement" ? "sm:col-span-2" : ""}>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  {label}
                  {isVerified && (
                    <span className="ml-1.5 text-[10px] text-emerald-600 font-semibold uppercase">
                      ✓ saved
                    </span>
                  )}
                </label>

                {key === "personal_statement" ? (
                  <textarea
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none resize-none"
                    rows={4}
                    placeholder={placeholder}
                    value={form[key] ?? ""}
                    onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                  />
                ) : (
                  <input
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    type={type ?? "text"}
                    placeholder={placeholder}
                    value={form[key] ?? ""}
                    onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                  />
                )}
              </div>
            )
          })}
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-medium rounded-lg text-sm transition-colors"
        >
          {saving ? "Saving…" : saved ? "✓ Saved!" : "Save Profile"}
        </button>
      </section>

      {/* ── Documents ──────────────────────────────────────────────────── */}
      <section className="border border-gray-200 rounded-xl p-5 space-y-4 bg-white">
        <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wider">
          Documents
        </h2>
        <p className="text-xs text-gray-500">
          Upload once — the agent will attach these files to every application that needs them.
        </p>

        <div className="space-y-3">
          {DOC_TYPES.map(({ key, label, accept }) => {
            const existing = profile.documents[key]
            const isUploading = uploading === key

            return (
              <div
                key={key}
                className="flex items-center justify-between border border-gray-200 rounded-lg px-4 py-3 bg-gray-50/60"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-800">{label}</p>
                  {existing ? (
                    <p className="text-[11px] text-emerald-600 font-mono truncate mt-0.5">
                      ✓ {existing.split("/").pop()}
                    </p>
                  ) : (
                    <p className="text-[11px] text-gray-400 italic mt-0.5">Not uploaded</p>
                  )}
                </div>

                <div className="flex items-center gap-2 shrink-0 ml-3">
                  {/* Hidden file input */}
                  <input
                    ref={(el) => { fileRefs.current[key] = el }}
                    type="file"
                    accept={accept}
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      if (file) handleUpload(key, file)
                      e.target.value = ""   // reset so same file can re-upload
                    }}
                  />

                  <button
                    onClick={() => fileRefs.current[key]?.click()}
                    disabled={isUploading}
                    className="px-3 py-1.5 text-xs font-medium bg-white border border-gray-300 hover:border-blue-400 hover:text-blue-700 rounded-lg transition-colors disabled:opacity-50"
                  >
                    {isUploading ? "Uploading…" : existing ? "Replace" : "Upload"}
                  </button>

                  {existing && (
                    <button
                      onClick={() => handleRemoveDoc(key)}
                      className="px-2 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 border border-red-200 rounded-lg transition-colors"
                      title="Remove document"
                    >
                      ✕
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </section>

      {/* ── Profile completeness tip ────────────────────────────────────── */}
      <div className="text-xs text-gray-400 text-center pb-2">
        All saved information is stored locally and used automatically when the agent fills applications.
        You can update any field at any time and it will apply to future runs.
      </div>
    </div>
  )
}

