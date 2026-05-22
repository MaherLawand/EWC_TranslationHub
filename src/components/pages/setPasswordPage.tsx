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

// ─── Shared page shell ────────────────────────────────────────────────────────
function PageShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#050505] relative overflow-hidden">
      <ToastContainer position="top-right" autoClose={3000} theme="dark" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(214,179,106,0.10),transparent_40%)] pointer-events-none" />
      <div
        className="
          relative z-10 w-[440px]
          rounded-[36px] border border-[#242424]
          bg-[linear-gradient(180deg,#111111_0%,#0B0B0B_100%)]
          p-10 shadow-[0_20px_80px_rgba(0,0,0,0.55)] backdrop-blur-2xl
        "
      >
        {children}
      </div>
    </div>
  )
}

// ─── Expired invite screen ────────────────────────────────────────────────────
function ExpiredScreen() {
  const [resendEmail, setResendEmail] = React.useState("")
  const [resendSent, setResendSent] = React.useState(false)
  const [isSending, setIsSending] = React.useState(false)
  const [resendError, setResendError] = React.useState("")

  async function handleResend(e: React.FormEvent) {
    e.preventDefault()
    if (!resendEmail.trim()) return
    setIsSending(true)
    setResendError("")
    try {
      const res = await fetch(
        `${import.meta.env.VITE_API_URL}/auth/resend-invite`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: resendEmail }),
        }
      )
      if (!res.ok) throw new Error()
      setResendSent(true)
    } catch {
      setResendError("Something went wrong. Please try again.")
    } finally {
      setIsSending(false)
    }
  }

  if (resendSent) {
    return (
      <PageShell>
        {/* icon */}
        <div className="flex justify-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-green-500/10 border border-green-500/20 flex items-center justify-center">
            <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
              <path d="M5 14.5L11 20.5L23 8" stroke="#4ade80" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
        </div>

        {/* text */}
        <div className="text-center mb-8">
          <p className="text-[11px] uppercase tracking-[0.38em] text-[#D6B36A] font-semibold mb-3">EWC</p>
          <h1 className="text-[28px] leading-[1.1] font-bold tracking-[-0.03em] text-[#F5F1E8] mb-3">
            Check your inbox
          </h1>
          <p className="text-zinc-400 text-sm leading-relaxed">
            A new invitation link has been sent to{" "}
            <span className="text-[#F5F1E8] font-medium">{resendEmail}</span>.
            It will be valid for <span className="text-[#D6B36A] font-medium">3 days</span>.
          </p>
        </div>

        {/* back link */}
        <p className="text-center text-sm text-zinc-600">
          Wrong email?{" "}
          <button
            onClick={() => { setResendSent(false); setResendEmail("") }}
            className="text-[#D6B36A] hover:text-[#E7C989] transition font-medium"
          >
            Try again
          </button>
        </p>
      </PageShell>
    )
  }

  return (
    <PageShell>
      {/* icon */}
      <div className="flex justify-center mb-8">
        <div className="w-16 h-16 rounded-2xl bg-[#D6B36A]/10 border border-[#D6B36A]/20 flex items-center justify-center">
          <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
            <circle cx="14" cy="14" r="11" stroke="#D6B36A" strokeWidth="1.8"/>
            <path d="M14 8v6.5l4 2.5" stroke="#D6B36A" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
      </div>

      {/* text */}
      <div className="mb-8">
        <p className="text-[11px] uppercase tracking-[0.38em] text-[#D6B36A] font-semibold mb-3 text-center">EWC</p>
        <h1 className="text-[28px] leading-[1.1] font-bold tracking-[-0.03em] text-[#F5F1E8] mb-3 text-center">
          Invitation Expired
        </h1>
        <p className="text-zinc-400 text-sm leading-relaxed text-center">
          This link is no longer valid. Enter your email below and we'll send you a fresh one.
        </p>
      </div>

      {/* form */}
      <form onSubmit={handleResend} noValidate className="space-y-4">
        <div>
          <label className="block text-xs uppercase tracking-[0.18em] text-zinc-500 font-semibold mb-3">
            Email address
          </label>
          <input
            type="email"
            placeholder="your@email.com"
            value={resendEmail}
            disabled={isSending}
            onChange={(e) => { setResendEmail(e.target.value); setResendError("") }}
            className="
              w-full h-[56px] rounded-2xl border border-[#2A2A2A]
              bg-[#121212] px-5 text-sm text-white outline-none transition-all
              placeholder:text-zinc-600
              focus:border-[#D6B36A] focus:bg-[#151515] focus:shadow-[0_0_25px_rgba(214,179,106,0.10)]
              disabled:opacity-60
            "
          />
        </div>

        {resendError && (
          <p className="text-red-400 text-sm text-center">{resendError}</p>
        )}

        <button
          type="submit"
          disabled={isSending || !resendEmail.trim()}
          className="
            w-full h-[56px] rounded-2xl border border-[#D6B36A]/20
            bg-[#D6B36A] text-black text-sm font-semibold
            transition-all hover:bg-[#E7C989] hover:shadow-[0_0_30px_rgba(214,179,106,0.20)]
            active:scale-[0.99] disabled:opacity-40 disabled:cursor-not-allowed
          "
        >
          {isSending ? "Sending..." : "Send New Link"}
        </button>
      </form>
    </PageShell>
  )
}

// ─── Main set-password page ───────────────────────────────────────────────────
export default function SetupPasswordPage() {
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

  // Validate token on mount — show expired screen immediately if needed
  React.useEffect(() => {
    if (!token) { navigate("/login", { replace: true }); return }
    fetch(`${import.meta.env.VITE_API_URL}/auth/validate-invite?token=${encodeURIComponent(token)}`)
      .then((r) => r.json())
      .then((data) => {
        if (!data.valid && data.reason === "expired") setExpired(true)
        if (!data.valid && data.reason === "invalid") navigate("/login", { replace: true })
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
        `${import.meta.env.VITE_API_URL}/auth/set-password`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token, password }),
        }
      )
      const data = await res.json()
      if (!res.ok) {
        if (data.message === "Invite expired") {
          setExpired(true)
          return
        }
        setError(data.message || "Failed to set password")
        return
      }
      toast.success("Password set! Redirecting to login...")
      setTimeout(() => navigate("/login"), 1800)
    } catch {
      setError("Network error. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  // Validating — show minimal loading shell so there's no flash of the form
  if (validating) {
    return (
      <PageShell>
        <div className="flex flex-col items-center justify-center py-8 gap-4">
          <div className="w-8 h-8 rounded-full border-2 border-[#D6B36A]/30 border-t-[#D6B36A] animate-spin" />
          <p className="text-sm text-zinc-500">Checking invitation...</p>
        </div>
      </PageShell>
    )
  }

  // Show themed expired screen
  if (expired) return <ExpiredScreen />

  if (!token) return null

  return (
    <PageShell>
      {/* HEADER */}
      <div className="mb-8">
        <p className="text-[11px] uppercase tracking-[0.38em] text-[#D6B36A] font-semibold mb-3">
          EWC
        </p>
        <h1 className="text-[32px] leading-[1.05] font-bold tracking-[-0.04em] text-[#F5F1E8]">
          Set Password
        </h1>
        <p className="text-zinc-500 mt-3 text-sm">
          Create a secure password for your account
        </p>
      </div>

      <form onSubmit={handleSubmit} noValidate>
        {/* FIELDS */}
        <div className="space-y-5">

          {/* PASSWORD */}
          <div>
            <label className="block text-xs uppercase tracking-[0.18em] text-zinc-500 font-semibold mb-3">
              Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Create a password"
                value={password}
                disabled={loading}
                onChange={(e) => { setPassword(e.target.value); setError("") }}
                className="
                  w-full h-[56px] rounded-2xl border border-[#2A2A2A]
                  bg-[#121212] px-5 pr-12 text-sm text-white outline-none transition-all
                  placeholder:text-zinc-600
                  focus:border-[#D6B36A] focus:bg-[#151515] focus:shadow-[0_0_25px_rgba(214,179,106,0.10)]
                  disabled:opacity-60
                "
              />
              <button
                type="button"
                tabIndex={-1}
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition text-xs font-semibold uppercase tracking-wide"
              >
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>
          </div>

          {/* CONFIRM PASSWORD */}
          <div>
            <label className="block text-xs uppercase tracking-[0.18em] text-zinc-500 font-semibold mb-3">
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
                  w-full h-[56px] rounded-2xl border bg-[#121212] px-5 pr-12 text-sm text-white
                  outline-none transition-all placeholder:text-zinc-600
                  focus:bg-[#151515] focus:shadow-[0_0_25px_rgba(214,179,106,0.10)]
                  disabled:opacity-60
                  ${confirm && password !== confirm
                    ? "border-red-500/60 focus:border-red-500"
                    : confirm && password === confirm
                    ? "border-green-500/50 focus:border-green-500"
                    : "border-[#2A2A2A] focus:border-[#D6B36A]"
                  }
                `}
              />
              <button
                type="button"
                tabIndex={-1}
                onClick={() => setShowConfirm((v) => !v)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition text-xs font-semibold uppercase tracking-wide"
              >
                {showConfirm ? "Hide" : "Show"}
              </button>
            </div>
          </div>

        </div>

        {/* STRENGTH CHECKLIST */}
        {password.length > 0 && (
          <div className="mt-5 p-4 rounded-2xl border border-[#1F1F1F] bg-[#0D0D0D] space-y-2">
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

        {/* ERROR */}
        {error && (
          <p className="mt-4 text-red-400 text-sm text-center">{error}</p>
        )}

        {/* SUBMIT */}
        <button
          type="submit"
          disabled={loading || !allRulesMet || password !== confirm}
          className="
            w-full h-[56px] mt-6 rounded-2xl border border-[#D6B36A]/20
            bg-[#D6B36A] text-black text-sm font-semibold transition-all
            hover:bg-[#E7C989] hover:shadow-[0_0_30px_rgba(214,179,106,0.20)]
            active:scale-[0.99] disabled:opacity-40 disabled:cursor-not-allowed
          "
        >
          {loading ? "Saving..." : "Set Password"}
        </button>
      </form>
    </PageShell>
  )
}
