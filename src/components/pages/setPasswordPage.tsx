import React from "react"
import { useSearchParams } from "react-router-dom"
import { useNavigate } from "react-router-dom"

export default function SetupPasswordPage() {
  const [searchParams] =
    useSearchParams()
const navigate = useNavigate()
  const token =
    searchParams.get("token")

  const [password, setPassword] =
    React.useState("")

  const [loading, setLoading] =
    React.useState(false)

  async function handleSubmit() {
    try {
      setLoading(true)

      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/auth/set-password`,
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json",
          },

          body: JSON.stringify({
            token,
            password,
          }),
        }
      )

      const data =
        await response.json()

      if (!response.ok) {
        alert(data.message)
        return
      }

      alert(
        "Password set successfully"
      )

      navigate("/login")

    } catch (error) {
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-black flex items-center justify-center text-white">

      <div className="w-[420px] bg-[#0E0E0E] border border-zinc-800 rounded-3xl p-8">

        <h1 className="text-3xl font-bold mb-2">
          Set Password
        </h1>

        <p className="text-zinc-500 mb-8">
          Create your account password
        </p>

        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) =>
            setPassword(
              e.target.value
            )
          }
          className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-3 outline-none"
        />

        <button
          onClick={handleSubmit}
          disabled={loading}
          className="w-full bg-white text-black py-3 rounded-xl font-semibold mt-6"
        >
          {loading
            ? "Saving..."
            : "Set Password"}
        </button>

      </div>

    </div>
  )
}