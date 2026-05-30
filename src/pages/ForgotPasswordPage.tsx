import React from "react"
import { useNavigate } from "react-router-dom"
import { ToastContainer } from "react-toastify"
import "react-toastify/dist/ReactToastify.css"

function PageShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#050505] relative overflow-hidden">
      <ToastContainer position="top-right" autoClose={3000} theme="dark" />
      <video autoPlay muted loop playsInline preload="auto" className="absolute inset-0 w-full h-full object-cover" src="/bg-video.mp4?v=2" />
      <div className="absolute inset-0 bg-black/60 pointer-events-none" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(214,179,106,0.08),transparent_40%)] pointer-events-none" />
      <div
        className="
          relative z-10 w-[420px]
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
          <img src="/ewc26-logo.webp?v=1" alt="EWC 26 Paris" className="h-10 w-auto object-contain mx-auto mb-5" />
          <h1 className="text-[28px] leading-[1.1] font-bold tracking-[0.01em] text-[#F5F1E8] mb-3">
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
        <img src="/ewc26-logo.webp?v=1" alt="EWC 26 Paris" className="h-12 w-auto object-contain mb-6 mx-auto block" />
        <h1 className="text-[32px] leading-[1.05] font-bold tracking-[0.01em] text-[#F5F1E8]">
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
              text-gear-gradient font-semibold mb-3
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
              w-full h-[56px] rounded-2xl border bg-white/10
              px-5 text-sm text-white outline-none transition-all
              placeholder:text-white/30
              focus:bg-white/15 focus:shadow-[0_0_25px_rgba(214,179,106,0.15)]
              disabled:opacity-50
              ${emailError
                ? "border-red-500/60 focus:border-red-500"
                : "border-white/20 focus:border-[#D6B36A]"
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
          onMouseMove={(e) => {
            const r = e.currentTarget.getBoundingClientRect()
            e.currentTarget.style.setProperty("--mx", `${((e.clientX - r.left) / r.width) * 100}%`)
            e.currentTarget.style.setProperty("--my", `${((e.clientY - r.top) / r.height) * 100}%`)
          }}
          className="
            btn-gear w-full h-[56px] mt-6 rounded-2xl text-sm font-semibold
          "
        >
          {isLoading ? "Sending..." : "Send Reset Link"}
        </button>
      </form>

      <p className="text-center text-sm text-zinc-600 mt-6">
        Remember your password?{" "}
        <button
          onClick={() => navigate("/login")}
          className="text-gear-gradient hover:opacity-80 transition font-semibold cursor-pointer"
        >
          Back to login
        </button>
      </p>
    </PageShell>
  )
}
