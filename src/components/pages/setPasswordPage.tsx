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

  React.useEffect(() => {
    if (!token) navigate("/login", { replace: true })
  }, [token, navigate])

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

  if (!token) return null

  return (
    <div
      className="
        min-h-screen
        flex
        items-center
        justify-center
        bg-[#050505]
        relative
        overflow-hidden
      "
    >
      <ToastContainer position="top-right" autoClose={3000} theme="dark" />

      {/* BACKGROUND GLOW */}
      <div
        className="
          absolute
          inset-0
          bg-[radial-gradient(circle_at_top,rgba(214,179,106,0.10),transparent_40%)]
          pointer-events-none
        "
      />

      {/* CARD */}
      <form
        onSubmit={handleSubmit}
        noValidate
        className="
          relative
          z-10
          w-[440px]
          rounded-[36px]
          border
          border-[#242424]
          bg-[linear-gradient(180deg,#111111_0%,#0B0B0B_100%)]
          p-10
          shadow-[0_20px_80px_rgba(0,0,0,0.55)]
          backdrop-blur-2xl
        "
      >

        {/* HEADER */}
        <div className="mb-8">
          <p
            className="
              text-[11px]
              uppercase
              tracking-[0.38em]
              text-[#D6B36A]
              font-semibold
              mb-3
            "
          >
            EWC
          </p>
          <h1
            className="
              text-[32px]
              leading-[1.05]
              font-bold
              tracking-[-0.04em]
              text-[#F5F1E8]
            "
          >
            Set Password
          </h1>
          <p className="text-zinc-500 mt-3 text-sm">
            Create a secure password for your account
          </p>
        </div>

        {/* FIELDS */}
        <div className="space-y-5">

          {/* PASSWORD */}
          <div>
            <label
              className="
                block
                text-xs
                uppercase
                tracking-[0.18em]
                text-zinc-500
                font-semibold
                mb-3
              "
            >
              Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Create a password"
                value={password}
                disabled={loading}
                onChange={(e) => {
                  setPassword(e.target.value)
                  setError("")
                }}
                className="
                  w-full
                  h-[56px]
                  rounded-2xl
                  border
                  border-[#2A2A2A]
                  bg-[#121212]
                  px-5
                  pr-12
                  text-sm
                  text-white
                  outline-none
                  transition-all
                  placeholder:text-zinc-600
                  focus:border-[#D6B36A]
                  focus:bg-[#151515]
                  focus:shadow-[0_0_25px_rgba(214,179,106,0.10)]
                  disabled:opacity-60
                "
              />
              <button
                type="button"
                tabIndex={-1}
                onClick={() => setShowPassword((v) => !v)}
                className="
                  absolute right-4 top-1/2 -translate-y-1/2
                  text-zinc-500 hover:text-zinc-300 transition
                  text-xs font-semibold uppercase tracking-wide
                "
              >
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>
          </div>

          {/* CONFIRM PASSWORD */}
          <div>
            <label
              className="
                block
                text-xs
                uppercase
                tracking-[0.18em]
                text-zinc-500
                font-semibold
                mb-3
              "
            >
              Confirm Password
            </label>
            <div className="relative">
              <input
                type={showConfirm ? "text" : "password"}
                placeholder="Repeat your password"
                value={confirm}
                disabled={loading}
                onChange={(e) => {
                  setConfirm(e.target.value)
                  setError("")
                }}
                className={`
                  w-full
                  h-[56px]
                  rounded-2xl
                  border
                  bg-[#121212]
                  px-5
                  pr-12
                  text-sm
                  text-white
                  outline-none
                  transition-all
                  placeholder:text-zinc-600
                  focus:bg-[#151515]
                  focus:shadow-[0_0_25px_rgba(214,179,106,0.10)]
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
                className="
                  absolute right-4 top-1/2 -translate-y-1/2
                  text-zinc-500 hover:text-zinc-300 transition
                  text-xs font-semibold uppercase tracking-wide
                "
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
                  <div
                    className={`
                      w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0
                      transition-all
                      ${met ? "bg-green-500/20 text-green-400" : "bg-zinc-800 text-zinc-600"}
                    `}
                  >
                    {met ? (
                      <svg width="9" height="9" viewBox="0 0 9 9" fill="none">
                        <path d="M1.5 4.5L3.5 6.5L7.5 2.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    ) : (
                      <div className="w-1.5 h-1.5 rounded-full bg-current" />
                    )}
                  </div>
                  <span
                    className={`text-xs transition-colors ${met ? "text-green-400" : "text-zinc-500"}`}
                  >
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

        {/* BUTTON */}
        <button
          type="submit"
          disabled={loading || !allRulesMet || password !== confirm}
          className="
            w-full
            h-[56px]
            mt-6
            rounded-2xl
            border
            border-[#D6B36A]/20
            bg-[#D6B36A]
            text-black
            text-sm
            font-semibold
            transition-all
            hover:bg-[#E7C989]
            hover:shadow-[0_0_30px_rgba(214,179,106,0.20)]
            active:scale-[0.99]
            disabled:opacity-40
            disabled:cursor-not-allowed
          "
        >
          {loading ? "Saving..." : "Set Password"}
        </button>

      </form>
    </div>
  )
}
