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

      {/* BACKGROUND VIDEO */}
      <video
        autoPlay
        muted
        loop
        playsInline
        preload="auto"
        className="absolute inset-0 w-full h-full object-cover"
        src="/bg-video.mp4?v=2"
      />
      {/* DARK OVERLAY */}
      <div className="absolute inset-0 bg-black/60 pointer-events-none" />
      {/* GOLD GLOW */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(214,179,106,0.08),transparent_40%)] pointer-events-none" />

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
          border-white/10
          bg-white/5
          p-10
          shadow-[0_20px_80px_rgba(0,0,0,0.6)]
          backdrop-blur-2xl
        "
      >

        {/* HEADER */}
        <div className="mb-8">
          <img
            src="/ewc26-logo.webp?v=1"
            alt="EWC 26 Paris"
            className="h-12 w-auto object-contain mb-6 mx-auto block"
          />
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
                text-gear-gradient
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
                bg-white/10
                px-5
                text-sm
                text-white
                outline-none
                transition-all
                placeholder:text-white/30
                focus:bg-white/15
                focus:shadow-[0_0_25px_rgba(214,179,106,0.15)]
                disabled:opacity-50
                ${errors.email
                  ? "border-red-500/60 focus:border-red-500"
                  : "border-white/20 focus:border-[#D6B36A]"
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
                text-gear-gradient
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
                  bg-white/10
                  px-5
                  pr-12
                  text-sm
                  text-white
                  outline-none
                  transition-all
                  placeholder:text-white/30
                  focus:bg-white/15
                  focus:shadow-[0_0_25px_rgba(214,179,106,0.15)]
                  disabled:opacity-50
                  ${errors.password
                    ? "border-red-500/60 focus:border-red-500"
                    : "border-white/20 focus:border-[#D6B36A]"
                  }
                `}
              />
              <button
                type="button"
                tabIndex={-1}
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                className="
                  absolute right-4 top-1/2 -translate-y-1/2
                  cursor-pointer transition hover:opacity-80
                "
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="url(#eyeGradLogin)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <defs>
                    <linearGradient id="eyeGradLogin" x1="0" y1="0" x2="1" y2="1">
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
            {errors.password && (
              <p className="text-red-400 text-xs mt-2">{errors.password}</p>
            )}
          </div>

        </div>

        {/* BUTTON */}
        <button
          type="submit"
          disabled={isLoading || isLocked}
          onMouseMove={(e) => {
            const r = e.currentTarget.getBoundingClientRect()
            e.currentTarget.style.setProperty("--mx", `${((e.clientX - r.left) / r.width) * 100}%`)
            e.currentTarget.style.setProperty("--my", `${((e.clientY - r.top) / r.height) * 100}%`)
          }}
          className="
            btn-gear
            w-full
            h-[56px]
            mt-8
            rounded-2xl
            text-sm
            font-semibold
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
            className="text-gear-gradient hover:opacity-80 transition font-semibold cursor-pointer"
          >
            Forgot password?
          </button>
        </p>

      </form>
    </div>
  )
}
