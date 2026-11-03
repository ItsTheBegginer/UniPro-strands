import { Link, useLocation } from "react-router-dom"
import { GraduationCap, Sparkles, User, Users, LayoutDashboard, ExternalLink, CloudCheck, Settings2 } from "lucide-react"

export function Navbar({ onNewApplication }: { onNewApplication?: () => void }) {
  const location = useLocation()

  const navLinks = [
    { label: "Dashboard", href: "/", icon: LayoutDashboard },
    { label: "Profiles", href: "/profiles", icon: Users },
    { label: "My Profile", href: "/profile", icon: User },
    { label: "Setup", href: "/setup", icon: Settings2 },
  ]

  return (
    <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-slate-200">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
        {/* Brand */}
        <Link to="/" className="flex items-center gap-3 group">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-purple-600 flex items-center justify-center text-white shadow-md shadow-indigo-200 group-hover:scale-105 transition-transform">
            <GraduationCap className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-lg text-slate-900 tracking-tight">UniPro</span>
              <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                <Sparkles className="w-2.5 h-2.5 text-indigo-600" /> Strands Agent
              </span>
            </div>
            <p className="text-[11px] text-slate-500 font-medium">Autonomous Admissions Guidance</p>
          </div>
        </Link>

        {/* Center Navigation */}
        <nav className="hidden md:flex items-center gap-1">
          {navLinks.map((item) => {
            const Icon = item.icon
            const isActive = location.pathname === item.href
            return (
              <Link
                key={item.href}
                to={item.href}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  isActive
                    ? "bg-slate-100 text-indigo-700 font-bold"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                }`}
              >
                <Icon className="w-4 h-4" />
                {item.label}
              </Link>
            )
          })}
          <a
            href="http://localhost:8080/login.html"
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-500 hover:text-slate-800 hover:bg-slate-50 transition-colors"
            title="Open Demo University Application Portal in a new tab"
          >
            <span>Demo Portal</span>
            <ExternalLink className="w-3 h-3 text-slate-400" />
          </a>
        </nav>

        {/* Status + Actions */}
        <div className="flex items-center gap-3">
          <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-[11px] font-medium">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <CloudCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>AWS Bedrock Nova</span>
          </div>

          {onNewApplication && (
            <button
              onClick={onNewApplication}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-medium text-xs rounded-lg shadow-sm shadow-indigo-200 transition-all active:scale-95 cursor-pointer"
            >
              <span>+ New Application</span>
            </button>
          )}
        </div>
      </div>
    </header>
  )
}

