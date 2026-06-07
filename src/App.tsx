import { Routes, Route, Navigate } from "react-router-dom"
import { useEffect, useState } from "react"

import LoginPage from "./pages/LoginPage"
import DashboardPage from "./pages/DashboardPage"
import SetupPasswordPage from "./components/pages/setPasswordPage"
import ForgotPasswordPage from "./pages/ForgotPasswordPage"
import ResetPasswordPage from "./pages/ResetPasswordPage"

import { api } from "./lib/api"

export default function App() {
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState(null)

  useEffect(() => {
    let cancelled = false

    // Only treat the user as "not authenticated" when the server explicitly
    // says so (401/403). Network errors and cancelled requests (e.g. user
    // presses Stop during initial load) are NOT auth failures — retry once
    // so a brief interruption never boots a logged-in user to the login page.
    const isAuthError = (err: any) =>
      err?.response?.status === 401 || err?.response?.status === 403

    async function fetchUser() {
      try {
        const res = await api.get("/auth/me")
        if (!cancelled) { setUser(res.data); setLoading(false) }
      } catch (err: any) {
        if (cancelled) return
        if (isAuthError(err)) {
          // Server confirmed: session invalid → go to login
          setUser(null)
          setLoading(false)
        } else {
          // Network error / request cancelled — wait briefly then retry once
          await new Promise((r) => setTimeout(r, 800))
          if (cancelled) return
          try {
            const res = await api.get("/auth/me")
            if (!cancelled) { setUser(res.data) }
          } catch (retryErr: any) {
            if (!cancelled) { setUser(null) }
          } finally {
            if (!cancelled) setLoading(false)
          }
        }
      }
    }

    fetchUser()
    return () => { cancelled = true }
  }, [])

  if (loading) {
    return (
      <div className="bg-black text-white h-screen flex items-center justify-center">
        Loading...
      </div>
    )
  }

  return (
    <Routes>

      {/* SET PASSWORD — only for unauthenticated users */}
      <Route
        path="/setup-password"
        element={user ? <Navigate to="/" replace /> : <SetupPasswordPage />}
      />

      {/* FORGOT PASSWORD */}
      <Route
        path="/forgot-password"
        element={user ? <Navigate to="/" replace /> : <ForgotPasswordPage />}
      />

      {/* RESET PASSWORD */}
      <Route
        path="/reset-password"
        element={user ? <Navigate to="/" replace /> : <ResetPasswordPage />}
      />

      {/* LOGIN — redirect to dashboard if already authenticated */}
      <Route
        path="/login"
        element={user ? <Navigate to="/" replace /> : <LoginPage />}
      />

      {/* MAIN APP — redirect to login if not authenticated */}
      <Route
        path="/"
        element={user ? <DashboardPage initialUser={user} /> : <Navigate to="/login" replace />}
      />

      {/* FALLBACK */}
      <Route path="*" element={<Navigate to="/" replace />} />

    </Routes>
  )
}
