import { useEffect, useState } from "react"
import { api } from "../api"
import { Navbar } from "../components/Navbar"
import {
  Server,
  CheckCircle2,
  XCircle,
  Loader2,
  Terminal,
  Copy,
  Check,
  RefreshCw,
} from "lucide-react"

type ServerStatus = { api: boolean; demo_portal: boolean; frontend: boolean }

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  const copy = () => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  return (
    <button
      onClick={copy}
      className="ml-2 p-1 rounded hover:bg-white/10 transition-colors cursor-pointer"
      title="Copy to clipboard"
    >
      {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-slate-400" />}
    </button>
  )
}

function ServiceRow({
  label,
  ok,
  port,
  description,
}: {
  label: string
  ok: boolean
  port: number
  description: string
}) {
  return (
    <div
      className={`flex items-center gap-4 p-4 rounded-xl border transition-all ${
        ok ? "bg-emerald-50 border-emerald-200" : "bg-rose-50 border-rose-200"
      }`}
    >
      <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${ok ? "bg-emerald-100" : "bg-rose-100"}`}>
        <Server className={`w-4 h-4 ${ok ? "text-emerald-600" : "text-rose-500"}`} />
      </div>
      <div className="flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-bold text-sm text-slate-900">{label}</span>
          <span className="text-[10px] font-mono text-slate-400">:{port}</span>
          {ok ? (
            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full border border-emerald-200">
              <CheckCircle2 className="w-2.5 h-2.5" /> RUNNING
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-700 bg-rose-100 px-2 py-0.5 rounded-full border border-rose-200">
              <XCircle className="w-2.5 h-2.5" /> NOT RUNNING
            </span>
          )}
        </div>
        <p className="text-xs text-slate-500 mt-0.5">{description}</p>
      </div>
    </div>
  )
}

function CodeBlock({ label, cmd }: { label: string; cmd: string }) {
  return (
    <div className="bg-slate-900 rounded-xl p-4 space-y-1.5">
      {label && <p className="text-xs text-slate-400 font-semibold">{label}</p>}
      <div className="flex items-center gap-2 bg-slate-800 rounded-lg px-3 py-2.5">
        <code className="text-emerald-400 text-xs flex-1 font-mono break-all">{cmd}</code>
        <CopyButton text={cmd} />
      </div>
    </div>
  )
}

export function Setup() {
  const [status, setStatus] = useState<ServerStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  async function fetchStatus() {
    try {
      const s = await api.serverStatus()
      setStatus(s)
    } catch {
      setStatus({ api: false, demo_portal: false, frontend: false })
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    fetchStatus()
    const t = setInterval(fetchStatus, 5000)
    return () => clearInterval(t)
  }, [])

  const allOk = status?.api && status?.demo_portal

  const CMD_ONE = `cd ~/Downloads/UniPro-AWS && ./start.sh`
  const CMD_BACKEND = `cd ~/Downloads/UniPro-AWS && source .venv/bin/activate && uvicorn app.api.routes:app --reload --port 8000`
  const CMD_PORTAL = `cd ~/Downloads/UniPro-AWS && source .venv/bin/activate && python scripts/serve_demo_university.py`
  const CMD_FRONTEND = `cd ~/Downloads/UniPro-AWS/frontend && npm run dev`
  const CMD_SEED = `cd ~/Downloads/UniPro-AWS && python scripts/seed_demo_profile.py`

  return (
    <div className="min-h-screen bg-slate-50/70 font-sans text-slate-900 flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-3xl w-full mx-auto px-4 sm:px-6 py-8 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center">
              <Terminal className="w-5 h-5 text-slate-600" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900">Setup &amp; Services</h1>
              <p className="text-xs text-slate-500">Monitor running services and copy startup commands</p>
            </div>
          </div>
          <button
            onClick={() => { setRefreshing(true); fetchStatus() }}
            disabled={refreshing}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-600 border border-slate-200 hover:bg-slate-50 rounded-xl transition-all cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>

        {/* Overall status banner */}
        <div
          className={`p-4 rounded-2xl border text-sm font-semibold flex items-center gap-3 ${
            loading
              ? "bg-slate-50 border-slate-200 text-slate-600"
              : allOk
              ? "bg-emerald-50 border-emerald-300 text-emerald-800"
              : "bg-amber-50 border-amber-300 text-amber-900"
          }`}
        >
          {loading ? (
            <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
          ) : allOk ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
          ) : (
            <XCircle className="w-5 h-5 text-amber-600" />
          )}
          {loading
            ? "Checking services…"
            : allOk
            ? "All required services are running. You're good to go!"
            : "Some services are not running. See startup commands below."}
        </div>

        {/* Service rows */}
        <div className="space-y-3">
          {loading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="w-6 h-6 text-indigo-600 animate-spin" />
            </div>
          ) : (
            <>
              <ServiceRow
                label="FastAPI Backend"
                ok={status?.api ?? false}
                port={8000}
                description="Main AI agent API — required for all functionality."
              />
              <ServiceRow
                label="Demo University Portal"
                ok={status?.demo_portal ?? false}
                port={8080}
                description="Mock university website the agent browses and fills out."
              />
              <ServiceRow
                label="React Frontend"
                ok={status?.frontend ?? false}
                port={5173}
                description="This UI — you're already using it."
              />
            </>
          )}
        </div>

        {/* One-command quickstart */}
        <div className="space-y-2">
          <h2 className="font-bold text-sm text-slate-700 flex items-center gap-2">
            <span className="w-5 h-5 rounded-full bg-indigo-600 text-white text-[10px] font-black flex items-center justify-center">1</span>
            Quickstart — one command to start everything
          </h2>
          <div className="bg-slate-900 rounded-2xl p-5 space-y-3">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
              <span className="w-2.5 h-2.5 rounded-full bg-yellow-500" />
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              <span className="ml-2 text-[11px] text-slate-500">Terminal</span>
            </div>
            <div className="flex items-center gap-2 bg-slate-800 rounded-lg px-4 py-3">
              <code className="text-emerald-400 text-sm flex-1 font-mono">{CMD_ONE}</code>
              <CopyButton text={CMD_ONE} />
            </div>
          </div>
        </div>

        {/* Manual commands */}
        <div className="space-y-3">
          <h2 className="font-bold text-sm text-slate-700 flex items-center gap-2">
            <span className="w-5 h-5 rounded-full bg-slate-400 text-white text-[10px] font-black flex items-center justify-center">2</span>
            Or start manually (3 separate terminals)
          </h2>
          <CodeBlock label="Terminal 1 — FastAPI Backend (port 8000)" cmd={CMD_BACKEND} />
          <CodeBlock label="Terminal 2 — Demo University Portal (port 8080)" cmd={CMD_PORTAL} />
          <CodeBlock label="Terminal 3 — React Frontend (port 5173)" cmd={CMD_FRONTEND} />
        </div>

        {/* Reset demo */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-3">
          <h2 className="font-bold text-sm text-slate-800">🔄 Reset Demo Data</h2>
          <p className="text-xs text-slate-500">
            Resets the student profile to Alex Johnson's demo data and clears all application run state. Run this before a demo.
          </p>
          <CodeBlock label="" cmd={CMD_SEED} />
        </div>
      </main>

      <footer className="border-t border-slate-200 bg-white py-6 mt-12 text-center text-xs text-slate-400">
        <p>UniPro — Built with Strands Agents SDK &amp; Amazon Bedrock for the AWS Builder Center Hackathon</p>
      </footer>
    </div>
  )
}

