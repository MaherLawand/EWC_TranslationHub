import {
  Routes,
  Route,
  Navigate,
} from "react-router-dom"

import {
  useEffect,
  useState,
} from "react"

import LoginPage from "./pages/LoginPage"
import DashboardPage from "./pages/DashboardPage"
import SetupPasswordPage from "./components/pages/setPasswordPage"

import { api } from "./lib/api"

export default function App() {
  const [loading, setLoading] =
    useState(true)

  const [user, setUser] =
    useState(null)

  useEffect(() => {
async function fetchUser() {
  try {
    console.log("FETCHING USER")

    const res =
      await api.get("/auth/me")

    console.log("USER RESPONSE", res.data)

    setUser(res.data)

  } catch (error) {

    console.log("AUTH ERROR", error)

    setUser(null)

  } finally {

    console.log("DONE LOADING")

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

      {/* SET PASSWORD */}
      <Route
        path="/setup-password"
        element={
          <SetupPasswordPage />
        }
      />

      {/* MAIN APP */}
      <Route
        path="/"
        element={
          user
            ? <DashboardPage />
            : <LoginPage />
        }
      />

      {/* FALLBACK */}
      <Route
        path="*"
        element={
          <Navigate to="/" />
        }
      />

    </Routes>
  )
}