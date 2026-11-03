import { useEffect, useRef, useState } from "react"
import { Link } from "react-router-dom"
import { api, type StudentProfile } from "../api"
import { Navbar } from "../components/Navbar"
import {
  User,
  GraduationCap,
  FileText,
  Upload,
  CheckCircle2,
  Trash2,
  ArrowLeft,
  CloudCheck,
  AlertCircle,
  Loader2,
  Save,
  BookOpen
} from "lucide-react"

const DOC_TYPES = [
  { key: "resume", label: "Resume / Curriculum Vitae", description: "PDF or Word document (under 10MB)", accept: ".pdf,.doc,.docx" },
  { key: "transcript", label: "Official / Unofficial Transcript", description: "High school or undergraduate transcript (PDF)", accept: ".pdf" },
  { key: "cover_letter", label: "Statement of Purpose / Cover Letter", description: "Optional supplementary letter (PDF)", accept: ".pdf,.doc,.docx" },
]

export function Profile() {
  const [profile, setProfile] = useState<StudentProfile | null>(null)
  const [form, setForm] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileRefs = useRef<Record<string, HTMLInputElement | null>>({})

  useEffect(() => {
    api.getProfile().then((p) => {
      setProfile(p)
      const initial: Record<string, string> = {}
      
      const fields = [
        "name", "email", "date_of_birth", "address", "gpa", "graduation_year",
        "education", "education_degree", "skills", "test_scores", "personal_statement"
      ]

      for (const key of fields) {
        if (key === "education_degree") {
          const edu = p.fields["education"]
          if (edu && Array.isArray(edu.value)) {
            const first = (edu.value as Record<string, unknown>[])[0]
            initial[key] = first ? String(first["degree"] ?? "") : ""
          }
          continue
        }
        if (key === "education") {
          const edu = p.fields["education"]
          if (edu && Array.isArray(edu.value)) {
            const first = (edu.value as Record<string, unknown>[])[0]
            initial[key] = first ? String(first["institution"] ?? "") : ""
          }
          continue
        }
        if (key === "test_scores") {
          const raw = p.fields["test_scores"]?.value
          if (raw && typeof raw === "object") {
            initial[key] = String((raw as Record<string, unknown>)["SAT"] ?? "")
          }
          continue
        }
        if (key === "skills") {
          const raw = p.fields["skills"]?.value
          if (Array.isArray(raw)) initial[key] = raw.join(", ")
          continue
        }

        const field = p.fields[key]
        if (field && field.value != null) {
          initial[key] = String(field.value)
        }
      }
      setForm(initial)
    }).catch(() => {
      setProfile({ fields: {}, documents: {} })
    })
  }, [])

  async function handleSave() {
    setSaving(true)
    setError(null)
    setSaved(false)
    try {
      const payload: Record<string, unknown> = {}
      if (form.name) payload["name"] = form.name.trim()
      if (form.email) payload["email"] = form.email.trim()
      if (form.date_of_birth) payload["date_of_birth"] = form.date_of_birth.trim()
      if (form.address) payload["address"] = form.address.trim()
      if (form.gpa) payload["gpa"] = Number(form.gpa) || form.gpa.trim()
      if (form.graduation_year) payload["graduation_year"] = Number(form.graduation_year) || form.graduation_year.trim()
      if (form.test_scores) payload["test_scores"] = { SAT: Number(form.test_scores) || form.test_scores.trim() }
      if (form.education) {
        payload["education"] = [{
          institution: form.education.trim(),
          degree: (form.education_degree || "").trim()
        }]
      }
      if (form.skills) {
        payload["skills"] = form.skills.split(",").map(s => s.trim()).filter(Boolean)
      }
      if (form.personal_statement) {
        payload["personal_statement"] = form.personal_statement.trim()
      }

      await api.saveProfile(payload)
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

  if (!profile) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
        <Navbar />
        <div className="flex-1 flex items-center justify-center p-8 text-slate-500 gap-2">
          <Loader2 className="w-5 h-5 animate-spin text-indigo-600" />
          <span>Loading verified profile…</span>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50/70 font-sans text-slate-900 flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Navigation Breadcrumb */}
        <div className="flex items-center justify-between">
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-indigo-600 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Dashboard</span>
          </Link>

          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>Verified Student Record</span>
            </span>
          </div>
        </div>

        {/* Profile Header */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center font-bold text-xl shadow-md shadow-indigo-200 shrink-0">
              <User className="w-7 h-7" />
            </div>
            <div className="space-y-1">
              <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900">Student Profile &amp; Documents</h1>
              <p className="text-xs text-slate-500 leading-relaxed max-w-xl">
                Store your verified academic history and credentials once. The UniPro agent uses this data to automatically fill applications without asking repetitive questions.
              </p>
            </div>
          </div>

          <button
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-semibold text-xs sm:text-sm shadow-sm shadow-indigo-200 transition-all cursor-pointer self-start sm:self-auto"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Saving…</span>
              </>
            ) : saved ? (
              <>
                <CheckCircle2 className="w-4 h-4" />
                <span>Saved Successfully!</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>Save Profile Changes</span>
              </>
            )}
          </button>
        </div>

        {error && (
          <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-sm flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-semibold text-rose-900">Error</p>
              <p className="text-xs">{error}</p>
            </div>
          </div>
        )}

        {/* SECTION 1: Personal & Contact Information */}
        <section className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <User className="w-4 h-4 text-indigo-600" />
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800">
              Personal &amp; Contact Details
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Full Legal Name</label>
              <input
                className="w-full bg-slate-50 border border-slate-200 focus:bg-white rounded-xl px-3.5 py-2 text-sm text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-colors"
                value={form.name ?? ""}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="e.g. Alex Johnson"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Primary Email Address</label>
              <input
                type="email"
                className="w-full bg-slate-50 border border-slate-200 focus:bg-white rounded-xl px-3.5 py-2 text-sm text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-colors"
                value={form.email ?? ""}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="e.g. alex.johnson@example.com"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Date of Birth</label>
              <input
                type="date"
                className="w-full bg-slate-50 border border-slate-200 focus:bg-white rounded-xl px-3.5 py-2 text-sm text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-colors"
                value={form.date_of_birth ?? ""}
                onChange={(e) => setForm({ ...form, date_of_birth: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Mailing Address</label>
              <input
                className="w-full bg-slate-50 border border-slate-200 focus:bg-white rounded-xl px-3.5 py-2 text-sm text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-colors"
                value={form.address ?? ""}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
                placeholder="Street address, City, Country"
              />
            </div>
          </div>
        </section>

        {/* SECTION 2: Academic Record & Standardized Testing */}
        <section className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <GraduationCap className="w-4 h-4 text-indigo-600" />
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800">
              Academic Record &amp; Standardized Testing
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1">Current / Previous Institution</label>
              <input
                className="w-full bg-slate-50 border border-slate-200 focus:bg-white rounded-xl px-3.5 py-2 text-sm text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-colors"
                value={form.education ?? ""}
                onChange={(e) => setForm({ ...form, education: e.target.value })}
                placeholder="e.g. Example Institute of Technology"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Degree Program</label>
              <input
                className="w-full bg-slate-50 border border-slate-200 focus:bg-white rounded-xl px-3.5 py-2 text-sm text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-colors"
                value={form.education_degree ?? ""}
                onChange={(e) => setForm({ ...form, education_degree: e.target.value })}
                placeholder="e.g. B.Tech Computer Science"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Cumulative GPA</label>
              <input
                className="w-full bg-slate-50 border border-slate-200 focus:bg-white rounded-xl px-3.5 py-2 text-sm text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-colors"
                value={form.gpa ?? ""}
                onChange={(e) => setForm({ ...form, gpa: e.target.value })}
                placeholder="e.g. 8.7 or 3.9"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Graduation Year</label>
              <input
                className="w-full bg-slate-50 border border-slate-200 focus:bg-white rounded-xl px-3.5 py-2 text-sm text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-colors"
                value={form.graduation_year ?? ""}
                onChange={(e) => setForm({ ...form, graduation_year: e.target.value })}
                placeholder="e.g. 2027"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">SAT Score</label>
              <input
                className="w-full bg-slate-50 border border-slate-200 focus:bg-white rounded-xl px-3.5 py-2 text-sm text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-colors"
                value={form.test_scores ?? ""}
                onChange={(e) => setForm({ ...form, test_scores: e.target.value })}
                placeholder="e.g. 1480"
              />
            </div>

            <div className="sm:col-span-3">
              <label className="block text-xs font-semibold text-slate-700 mb-1">Academic Skills &amp; Extracurriculars (comma-separated)</label>
              <input
                className="w-full bg-slate-50 border border-slate-200 focus:bg-white rounded-xl px-3.5 py-2 text-sm text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-colors"
                value={form.skills ?? ""}
                onChange={(e) => setForm({ ...form, skills: e.target.value })}
                placeholder="e.g. Python, Machine Learning, JavaScript, Robotics"
              />
            </div>
          </div>
        </section>

        {/* SECTION 3: Personal Statement */}
        <section className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <BookOpen className="w-4 h-4 text-indigo-600" />
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800">
              Personal Statement / Statement of Purpose
            </h2>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Your Personal Statement</label>
            <textarea
              rows={4}
              className="w-full bg-slate-50 border border-slate-200 focus:bg-white rounded-xl p-3 text-sm text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:outline-none resize-none transition-colors"
              value={form.personal_statement ?? ""}
              onChange={(e) => setForm({ ...form, personal_statement: e.target.value })}
              placeholder="Write your personal statement or statement of purpose here. When saved, the agent will automatically use it across university applications."
            />
            <p className="text-[11px] text-slate-400 mt-1">
              Characters: {(form.personal_statement ?? "").length} | Stored as verified student statement
            </p>
          </div>
        </section>

        {/* SECTION 4: S3 Synced Documents */}
        <section className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-indigo-600" />
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                Uploaded Application Documents (Amazon S3)
              </h2>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-emerald-700 font-semibold bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
              <CloudCheck className="w-3.5 h-3.5" />
              <span>S3 Vault Synced</span>
            </div>
          </div>

          <p className="text-xs text-slate-500">
            Upload your documents once. The autonomous agent will automatically match and attach them when university portals require transcripts or resumes.
          </p>

          <div className="grid grid-cols-1 gap-3">
            {DOC_TYPES.map(({ key, label, description, accept }) => {
              const existing = profile.documents[key]
              const isUploading = uploading === key

              return (
                <div
                  key={key}
                  className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl border border-slate-200 bg-slate-50/60 hover:bg-slate-50 gap-3 transition-colors"
                >
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-indigo-600 shrink-0" />
                      <span className="text-sm font-bold text-slate-900">{label}</span>
                    </div>
                    <p className="text-xs text-slate-500">{description}</p>
                    {existing ? (
                      <div className="inline-flex items-center gap-1.5 text-xs font-mono text-emerald-700 font-semibold bg-white px-2.5 py-0.5 rounded border border-emerald-200 mt-1">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        <span className="truncate">{existing.split("/").pop()}</span>
                      </div>
                    ) : (
                      <span className="text-xs text-slate-400 italic">No file uploaded</span>
                    )}
                  </div>

                  <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
                    <input
                      ref={(el) => { fileRefs.current[key] = el }}
                      type="file"
                      accept={accept}
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0]
                        if (file) handleUpload(key, file)
                        e.target.value = ""
                      }}
                    />

                    <button
                      type="button"
                      onClick={() => fileRefs.current[key]?.click()}
                      disabled={isUploading}
                      className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-white border border-slate-300 hover:border-indigo-400 text-slate-700 hover:text-indigo-700 shadow-2xs transition-all cursor-pointer disabled:opacity-50"
                    >
                      {isUploading ? (
                        <>
                          <Loader2 className="w-3 h-3 animate-spin text-indigo-600" />
                          <span>Uploading…</span>
                        </>
                      ) : (
                        <>
                          <Upload className="w-3 h-3 text-slate-500" />
                          <span>{existing ? "Replace File" : "Upload File"}</span>
                        </>
                      )}
                    </button>

                    {existing && (
                      <button
                        type="button"
                        onClick={() => handleRemoveDoc(key)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg border border-slate-200 hover:border-rose-200 hover:bg-rose-50 transition-colors cursor-pointer"
                        title="Remove file"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </section>
      </main>
    </div>
  )
}
