import { useState } from "react"
import { api } from "../lib/api"

export default function LoginPage() {
  const [email, setEmail] =
    useState("")

  const [password, setPassword] =
    useState("")

  async function handleLogin(
    e: React.FormEvent
  ) {
    e.preventDefault()

    try {
      const res = await api.post(
        "/auth/login",
        {
          email,
          password,
        }
      )

      console.log(res.data)

      window.location.reload()

    } catch (error) {
      console.error(error)
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
              onChange={(e) =>
                setEmail(e.target.value)
              }
              className="
                w-full
                h-[56px]
                rounded-2xl
                border
                border-[#2A2A2A]
                bg-[#121212]
                px-5
                text-sm
                text-white
                outline-none
                transition-all
                placeholder:text-zinc-600
                focus:border-[#D6B36A]
                focus:bg-[#151515]
                focus:shadow-[0_0_25px_rgba(214,179,106,0.10)]
              "
            />

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

            <input
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) =>
                setPassword(
                  e.target.value
                )
              }
              className="
                w-full
                h-[56px]
                rounded-2xl
                border
                border-[#2A2A2A]
                bg-[#121212]
                px-5
                text-sm
                text-white
                outline-none
                transition-all
                placeholder:text-zinc-600
                focus:border-[#D6B36A]
                focus:bg-[#151515]
                focus:shadow-[0_0_25px_rgba(214,179,106,0.10)]
              "
            />

          </div>

        </div>

        {/* BUTTON */}
        <button
          type="submit"
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
          "
        >
          Login
        </button>

      </form>

    </div>
  )
}