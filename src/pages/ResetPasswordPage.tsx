import React from "react"
import { useSearchParams, useNavigate } from "react-router-dom"
import { ToastContainer, toast } from "react-toastify"
import "react-toastify/dist/ReactToastify.css"

const RULES = [
  { label: "At least 8 characters", test: (p: string) => p.length >= 8 },
  { label: "One uppercase letter", test: (p: string) => /[A-Z]/.test(p) },
  { label: "One lowercase letter", test: (p: string) => /[a-z]/.test(p) },
  { label: "One number", test: (p: string) => /[0-9]/.test(p) },
  { label: "One special character", test: (p: string) => /[!@#$%^&*()_+\-=\[\]{}|;':",.<>?/\\`~]/.test(p) },
]

function PageShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#050505] relative overflow-hidden">
      <ToastContainer position="top-right" autoClose={3000} theme="dark" />
      <video autoPlay muted loop playsInline preload="auto" className="absolute inset-0 w-full h-full object-cover" src="/bg-video.mp4?v=2" />
      <div className="absolute inset-0 bg-black/60 pointer-events-none" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(214,179,106,0.08),transparent_40%)] pointer-events-none" />
      <div
        className="
          relative z-10 w-[440px]
          rounded-[36px] border border-white/10
          bg-white/5
          p-10 shadow-[0_20px_80px_rgba(0,0,0,0.6)] backdrop-blur-2xl
        "
      >
        {children}
      </div>
    </div>
  )
}

function ExpiredScreen() {
  const navigate = useNavigate()
  return (
    <PageShell>
      <div className="flex justify-center mb-8">
        <div className="w-16 h-16 rounded-2xl bg-[#D6B36A]/10 border border-[#D6B36A]/20 flex items-center justify-center">
          <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
            <circle cx="14" cy="14" r="11" stroke="#D6B36A" strokeWidth="1.8"/>
            <path d="M14 8v6.5l4 2.5" stroke="#D6B36A" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
      </div>

      <div className="text-center mb-8">
        <img src="/ewc26-logo.webp" alt="EWC 26 Paris" className="h-10 w-auto object-contain mx-auto mb-5" />
        <h1 className="text-[28px] leading-[1.1] font-bold tracking-[0.01em] text-[#F5F1E8] mb-3">
          Link Expired
        </h1>
        <p className="text-zinc-400 text-sm leading-relaxed">
          This reset link has expired or is invalid.
          Please request a new one from the login page.
        </p>
      </div>

      <button
        onClick={() => navigate("/forgot-password")}
        className="
          w-full h-[56px] rounded-2xl border border-[#D6B36A]/20
          bg-[#D6B36A] text-black text-sm font-semibold
          transition-all hover:bg-[#E7C989] hover:shadow-[0_0_30px_rgba(214,179,106,0.20)]
          active:scale-[0.99]
        "
      >
        Request New Link
      </button>
    </PageShell>
  )
}

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const token = searchParams.get("token")

  const [password, setPassword] = React.useState("")
  const [confirm, setConfirm] = React.useState("")
  const [showPassword, setShowPassword] = React.useState(false)
  const [showConfirm, setShowConfirm] = React.useState(false)
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState("")
  const [expired, setExpired] = React.useState(false)
  const [validating, setValidating] = React.useState(true)

  React.useEffect(() => {
    if (!token) { navigate("/login", { replace: true }); return }
    fetch(`${import.meta.env.VITE_API_URL}/auth/validate-reset-token?token=${encodeURIComponent(token)}`)
      .then((r) => r.json())
      .then((data) => {
        if (!data.valid) setExpired(true)
      })
      .catch(() => { /* network error — let form submission handle it */ })
      .finally(() => setValidating(false))
  }, [token])

  const passedRules = RULES.filter((r) => r.test(password))
  const allRulesMet = passedRules.length === RULES.length

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError("")

    if (!allRulesMet) {
      setError("Password does not meet all requirements")
      return
    }
    if (password !== confirm) {
      setError("Passwords do not match")
      return
    }

    try {
      setLoading(true)
      const res = await fetch(
        `${import.meta.env.VITE_API_URL}/auth/reset-password`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token, password }),
        }
      )
      const data = await res.json()
      if (!res.ok) {
        if (data.message === "Reset link expired" || data.message === "Invalid or expired reset link") {
          setExpired(true)
          return
        }
        setError(data.message || "Failed to reset password")
        return
      }
      toast.success("Password reset! Redirecting to login...")
      setTimeout(() => navigate("/login"), 1800)
    } catch {
      setError("Network error. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  if (validating) {
    return (
      <PageShell>
        <div className="flex flex-col items-center justify-center py-8 gap-4">
          <div className="w-8 h-8 rounded-full border-2 border-[#D6B36A]/30 border-t-[#D6B36A] animate-spin" />
          <p className="text-sm text-zinc-500">Verifying reset link...</p>
        </div>
      </PageShell>
    )
  }

  if (expired) return <ExpiredScreen />

  if (!token) return null

  return (
    <PageShell>
      <div className="mb-8">
        <img src="/ewc26-logo.webp" alt="EWC 26 Paris" className="h-12 w-auto object-contain mb-6 mx-auto block" />
        <h1 className="text-[32px] leading-[1.05] font-bold tracking-[0.01em] text-[#F5F1E8]">
          Reset Password
        </h1>
        <p className="text-zinc-500 mt-3 text-sm">
          Create a new secure password for your account
        </p>
      </div>

      <form onSubmit={handleSubmit} noValidate>
        <div className="space-y-5">

          {/* PASSWORD */}
          <div>
            <label className="block text-xs uppercase tracking-[0.18em] text-gear-gradient font-semibold mb-3">
              New Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Create a new password"
                value={password}
                disabled={loading}
                onChange={(e) => { setPassword(e.target.value); setError("") }}
                className="
                  w-full h-[56px] rounded-2xl border border-white/20
                  bg-white/10 px-5 pr-12 text-sm text-white outline-none transition-all
                  placeholder:text-white/30
                  focus:border-[#D6B36A] focus:bg-white/15 focus:shadow-[0_0_25px_rgba(214,179,106,0.15)]
                  disabled:opacity-50
                "
              />
              <button
                type="button"
                tabIndex={-1}
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                className="absolute right-4 top-1/2 -translate-y-1/2 cursor-pointer transition hover:opacity-80"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="url(#eyeGradReset1)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <defs>
                    <linearGradient id="eyeGradReset1" x1="0" y1="0" x2="1" y2="1">
                      <stop offset="0%" stopColor="#F0C75E" />
                      <stop offset="35%" stopColor="#E89B3A" />
                      <stop offset="65%" stopColor="#D9692A" />
                      <stop offset="100%" stopColor="#BE3F1E" />
                    </linearGradient>
                  </defs>
                  {showPassword ? (
                    <>
                      <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
                      <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" />
                      <path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" />
                      <line x1="2" y1="2" x2="22" y2="22" />
                    </>
                  ) : (
                    <>
                      <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
                      <circle cx="12" cy="12" r="3" />
                    </>
                  )}
                </svg>
              </button>
            </div>
          </div>

          {/* CONFIRM */}
          <div>
            <label className="block text-xs uppercase tracking-[0.18em] text-gear-gradient font-semibold mb-3">
              Confirm Password
            </label>
            <div className="relative">
              <input
                type={showConfirm ? "text" : "password"}
                placeholder="Repeat your password"
                value={confirm}
                disabled={loading}
                onChange={(e) => { setConfirm(e.target.value); setError("") }}
                className={`
                  w-full h-[56px] rounded-2xl border bg-white/10 px-5 pr-12 text-sm text-white
                  outline-none transition-all placeholder:text-white/30
                  focus:bg-white/15 focus:shadow-[0_0_25px_rgba(214,179,106,0.15)]
                  disabled:opacity-50
                  ${confirm && password !== confirm
                    ? "border-red-500/60 focus:border-red-500"
                    : confirm && password === confirm
                    ? "border-green-500/50 focus:border-green-500"
                    : "border-white/20 focus:border-[#D6B36A]"
                  }
                `}
              />
              <button
                type="button"
                tabIndex={-1}
                onClick={() => setShowConfirm((v) => !v)}
                aria-label={showConfirm ? "Hide password" : "Show password"}
                className="absolute right-4 top-1/2 -translate-y-1/2 cursor-pointer transition hover:opacity-80"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="url(#eyeGradReset2)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <defs>
                    <linearGradient id="eyeGradReset2" x1="0" y1="0" x2="1" y2="1">
                      <stop offset="0%" stopColor="#F0C75E" />
                      <stop offset="35%" stopColor="#E89B3A" />
                      <stop offset="65%" stopColor="#D9692A" />
                      <stop offset="100%" stopColor="#BE3F1E" />
                    </linearGradient>
                  </defs>
                  {showConfirm ? (
                    <>
                      <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
                      <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" />
                      <path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" />
                      <line x1="2" y1="2" x2="22" y2="22" />
                    </>
                  ) : (
                    <>
                      <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
                      <circle cx="12" cy="12" r="3" />
                    </>
                  )}
                </svg>
              </button>
            </div>
          </div>

        </div>

        {/* STRENGTH CHECKLIST */}
        {password.length > 0 && (
          <div className="mt-5 p-4 rounded-2xl border border-white/10 bg-white/5 space-y-2">
            {RULES.map((rule) => {
              const met = rule.test(password)
              return (
                <div key={rule.label} className="flex items-center gap-2.5">
                  <div className={`w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 transition-all ${met ? "bg-green-500/20 text-green-400" : "bg-zinc-800 text-zinc-600"}`}>
                    {met ? (
                      <svg width="9" height="9" viewBox="0 0 9 9" fill="none">
                        <path d="M1.5 4.5L3.5 6.5L7.5 2.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    ) : (
                      <div className="w-1.5 h-1.5 rounded-full bg-current" />
                    )}
                  </div>
                  <span className={`text-xs transition-colors ${met ? "text-green-400" : "text-zinc-500"}`}>
                    {rule.label}
                  </span>
                </div>
              )
            })}
          </div>
        )}

        {error && (
          <p className="mt-4 text-red-400 text-sm text-center">{error}</p>
        )}

        <button
          type="submit"
          disabled={loading || !allRulesMet || password !== confirm}
          onMouseMove={(e) => {
            const r = e.currentTarget.getBoundingClientRect()
            e.currentTarget.style.setProperty("--mx", `${((e.clientX - r.left) / r.width) * 100}%`)
            e.currentTarget.style.setProperty("--my", `${((e.clientY - r.top) / r.height) * 100}%`)
          }}
          className="
            btn-gear w-full h-[56px] mt-6 rounded-2xl text-sm font-semibold
          "
        >
          {loading ? "Saving..." : "Reset Password"}
        </button>
      </form>
    </PageShell>
  )
}
