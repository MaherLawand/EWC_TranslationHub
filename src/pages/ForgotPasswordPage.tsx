import React from "react"
import { useNavigate } from "react-router-dom"
import { ToastContainer } from "react-toastify"
import "react-toastify/dist/ReactToastify.css"

function PageShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#050505] relative overflow-hidden">
      <ToastContainer position="top-right" autoClose={3000} theme="dark" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(214,179,106,0.10),transparent_40%)] pointer-events-none" />
      <div
        className="
          relative z-10 w-[420px]
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

export default function ForgotPasswordPage() {
  const navigate = useNavigate()
  const [email, setEmail] = React.useState("")
  const [emailError, setEmailError] = React.useState("")
  const [isLoading, setIsLoading] = React.useState(false)
  const [sent, setSent] = React.useState(false)

  function validate() {
    const trimmed = email.trim()
    if (!trimmed) {
      setEmailError("Email is required")
      return false
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setEmailError("Enter a valid email address")
      return false
    }
    setEmailError("")
    return true
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (isLoading) return
    if (!validate()) return

    try {
      setIsLoading(true)
      await fetch(
        `${import.meta.env.VITE_API_URL}/auth/forgot-password`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: email.trim().toLowerCase() }),
        }
      )
      // Always show success — never reveal whether email exists
      setSent(true)
    } catch {
      // Still show success on network error to prevent enumeration
      setSent(true)
    } finally {
      setIsLoading(false)
    }
  }

  if (sent) {
    return (
      <PageShell>
        {/* Icon */}
        <div className="flex justify-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-green-500/10 border border-green-500/20 flex items-center justify-center">
            <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
              <path d="M5 14.5L11 20.5L23 8" stroke="#4ade80" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
        </div>

        <div className="text-center mb-8">
          <p className="text-[11px] uppercase tracking-[0.38em] text-[#D6B36A] font-semibold mb-3">EWC</p>
          <h1 className="text-[28px] leading-[1.1] font-bold tracking-[-0.03em] text-[#F5F1E8] mb-3">
            Check your inbox
          </h1>
          <p className="text-zinc-400 text-sm leading-relaxed">
            If <span className="text-[#F5F1E8] font-medium">{email}</span> is registered,
            you'll receive a reset link shortly.
            It will be valid for <span className="text-[#D6B36A] font-medium">1 hour</span>.
          </p>
        </div>

        <button
          onClick={() => navigate("/login")}
          className="
            w-full h-[56px] rounded-2xl border border-[#D6B36A]/20
            bg-[#D6B36A] text-black text-sm font-semibold
            transition-all hover:bg-[#E7C989] hover:shadow-[0_0_30px_rgba(214,179,106,0.20)]
            active:scale-[0.99]
          "
        >
          Back to Login
        </button>
      </PageShell>
    )
  }

  return (
    <PageShell>
      {/* Header */}
      <div className="mb-8">
        <p className="text-[11px] uppercase tracking-[0.38em] text-[#D6B36A] font-semibold mb-3">
          EWC
        </p>
        <h1 className="text-[32px] leading-[1.05] font-bold tracking-[-0.04em] text-[#F5F1E8]">
          Forgot Password
        </h1>
        <p className="text-zinc-500 mt-3 text-sm">
          Enter your email and we'll send you a reset link
        </p>
      </div>

      <form onSubmit={handleSubmit} noValidate>
        <div>
          <label
            className="
              block text-xs uppercase tracking-[0.18em]
              text-zinc-500 font-semibold mb-3
            "
          >
            Email
          </label>
          <input
            type="email"
            placeholder="Enter your email"
            value={email}
            disabled={isLoading}
            onChange={(e) => {
              setEmail(e.target.value)
              if (emailError) setEmailError("")
            }}
            className={`
              w-full h-[56px] rounded-2xl border bg-[#121212]
              px-5 text-sm text-white outline-none transition-all
              placeholder:text-zinc-600
              focus:bg-[#151515] focus:shadow-[0_0_25px_rgba(214,179,106,0.10)]
              disabled:opacity-60
              ${emailError
                ? "border-red-500/60 focus:border-red-500"
                : "border-[#2A2A2A] focus:border-[#D6B36A]"
              }
            `}
          />
          {emailError && (
            <p className="text-red-400 text-xs mt-2">{emailError}</p>
          )}
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="
            w-full h-[56px] mt-6 rounded-2xl border border-[#D6B36A]/20
            bg-[#D6B36A] text-black text-sm font-semibold
            transition-all hover:bg-[#E7C989] hover:shadow-[0_0_30px_rgba(214,179,106,0.20)]
            active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed
          "
        >
          {isLoading ? "Sending..." : "Send Reset Link"}
        </button>
      </form>

      <p className="text-center text-sm text-zinc-600 mt-6">
        Remember your password?{" "}
        <button
          onClick={() => navigate("/login")}
          className="text-[#D6B36A] hover:text-[#E7C989] transition font-medium"
        >
          Back to login
        </button>
      </p>
    </PageShell>
  )
}
