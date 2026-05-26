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
    async function fetchUser() {
      try {
        const res = await api.get("/auth/me")
        setUser(res.data)
      } catch {
        setUser(null)
      } finally {
        setLoading(false)
      }
    }
    fetchUser()
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
