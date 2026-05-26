import { useState, useEffect, useRef } from "react"
import { useNavigate } from "react-router-dom"
import { api } from "../lib/api"
import { ToastContainer, toast } from "react-toastify"
import "react-toastify/dist/ReactToastify.css"

export default function LoginPage() {
  const navigate = useNavigate()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({})
  const [attemptsRemaining, setAttemptsRemaining] = useState<number | null>(null)
  const [lockoutSeconds, setLockoutSeconds] = useState(0)
  const lockoutInterval = useRef<ReturnType<typeof setInterval> | null>(null)

  // Countdown timer when locked
  useEffect(() => {
    if (lockoutSeconds <= 0) {
      if (lockoutInterval.current) clearInterval(lockoutInterval.current)
      return
    }
    lockoutInterval.current = setInterval(() => {
      setLockoutSeconds((s) => {
        if (s <= 1) {
          clearInterval(lockoutInterval.current!)
          return 0
        }
        return s - 1
      })
    }, 1000)
    return () => {
      if (lockoutInterval.current) clearInterval(lockoutInterval.current)
    }
  }, [lockoutSeconds > 0])

  const isLocked = lockoutSeconds > 0

  function formatCountdown(seconds: number) {
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    return m > 0 ? `${m}m ${s}s` : `${s}s`
  }

  function validate() {
    const e: typeof errors = {}
    const trimmed = email.trim()
    if (!trimmed) {
      e.email = "Email is required"
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      e.email = "Enter a valid email address"
    }
    if (!password) {
      e.password = "Password is required"
    }
    setErrors(e)
    return Object.keys(e).length === 0
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    if (isLoading || isLocked) return
    if (!validate()) return

    try {
      setIsLoading(true)
      setAttemptsRemaining(null)
      await api.post("/auth/login", { email: email.trim().toLowerCase(), password })
      toast.success("Login successful")
      setTimeout(() => window.location.reload(), 700)
    } catch (err: any) {
      const data = err?.response?.data
      if (data?.locked) {
        setLockoutSeconds(data.remainingSeconds || 300)
        setAttemptsRemaining(null)
      } else if (typeof data?.attemptsRemaining === "number") {
        setAttemptsRemaining(data.attemptsRemaining)
        toast.error(data.message || "Invalid credentials")
      } else {
        toast.error(data?.message || "Invalid email or password")
      }
    } finally {
      setIsLoading(false)
    }
  }

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
        onSubmit={handleLogin}
        noValidate
        className="
          relative
          z-10
          w-[420px]
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
              text-[34px]
              leading-[1.05]
              font-bold
              tracking-[-0.04em]
              text-[#F5F1E8]
            "
          >
            Translation
            Hub
          </h1>
          <p className="text-zinc-500 mt-4 text-sm">
            Sign in to continue
          </p>
        </div>

        {/* LOCKOUT BANNER */}
        {isLocked && (
          <div className="mb-6 rounded-2xl border border-red-500/20 bg-red-500/10 p-4">
            <div className="flex items-center gap-2 mb-1">
              <svg className="w-4 h-4 text-red-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
              </svg>
              <p className="text-red-400 text-sm font-semibold">Account temporarily locked</p>
            </div>
            <p className="text-red-300/70 text-xs leading-relaxed">
              Too many failed attempts. Try again in{" "}
              <span className="text-red-300 font-bold font-mono">{formatCountdown(lockoutSeconds)}</span>
              {" "}or{" "}
              <button
                type="button"
                onClick={() => navigate("/forgot-password")}
                className="text-[#D6B36A] hover:text-[#E4C27C] underline underline-offset-2 transition"
              >
                reset your password
              </button>
              {" "}to unlock immediately.
            </p>
          </div>
        )}

        {/* LOW ATTEMPTS WARNING */}
        {!isLocked && attemptsRemaining !== null && attemptsRemaining <= 2 && (
          <div className="mb-6 rounded-2xl border border-yellow-500/20 bg-yellow-500/10 p-4">
            <p className="text-yellow-400 text-sm font-semibold">
              {attemptsRemaining === 1
                ? "⚠️  1 attempt remaining before lockout"
                : `⚠️  ${attemptsRemaining} attempts remaining before lockout`}
            </p>
          </div>
        )}

        {/* FIELDS */}
        <div className="space-y-5">

          {/* EMAIL */}
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
              Email
            </label>
            <input
              type="email"
              placeholder="Enter your email"
              value={email}
              disabled={isLoading || isLocked}
              onChange={(e) => {
                setEmail(e.target.value)
                if (errors.email) setErrors((prev) => ({ ...prev, email: undefined }))
              }}
              className={`
                w-full
                h-[56px]
                rounded-2xl
                border
                bg-[#121212]
                px-5
                text-sm
                text-white
                outline-none
                transition-all
                placeholder:text-zinc-600
                focus:bg-[#151515]
                focus:shadow-[0_0_25px_rgba(214,179,106,0.10)]
                disabled:opacity-60
                ${errors.email
                  ? "border-red-500/60 focus:border-red-500"
                  : "border-[#2A2A2A] focus:border-[#D6B36A]"
                }
              `}
            />
            {errors.email && (
              <p className="text-red-400 text-xs mt-2">{errors.email}</p>
            )}
          </div>

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
                placeholder="Enter your password"
                value={password}
                disabled={isLoading || isLocked}
                onChange={(e) => {
                  setPassword(e.target.value)
                  if (errors.password) setErrors((prev) => ({ ...prev, password: undefined }))
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
                  ${errors.password
                    ? "border-red-500/60 focus:border-red-500"
                    : "border-[#2A2A2A] focus:border-[#D6B36A]"
                  }
                `}
              />
              <button
                type="button"
                tabIndex={-1}
                onClick={() => setShowPassword((v) => !v)}
                className="
                  absolute
                  right-4
                  top-1/2
                  -translate-y-1/2
                  text-zinc-500
                  hover:text-zinc-300
                  transition
                  text-xs
                  font-semibold
                  uppercase
                  tracking-wide
                "
              >
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>
            {errors.password && (
              <p className="text-red-400 text-xs mt-2">{errors.password}</p>
            )}
          </div>

        </div>

        {/* BUTTON */}
        <button
          type="submit"
          disabled={isLoading || isLocked}
          className="
            w-full
            h-[56px]
            mt-8
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
            disabled:opacity-60
            disabled:cursor-not-allowed
          "
        >
          {isLocked
            ? `Locked — ${formatCountdown(lockoutSeconds)}`
            : isLoading
            ? "Logging in..."
            : "Login"}
        </button>

        {/* FORGOT PASSWORD */}
        <p className="text-center text-sm text-zinc-600 mt-5">
          <button
            type="button"
            onClick={() => navigate("/forgot-password")}
            className="text-zinc-500 hover:text-[#D6B36A] transition font-medium"
          >
            Forgot password?
          </button>
        </p>

      </form>
    </div>
  )
}
