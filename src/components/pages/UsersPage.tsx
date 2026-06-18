import React from "react"
import ReactDOM from "react-dom"
import PaginationBar from "../shared/PaginationBar"
import { useWheelToHorizontalScroll } from "../../hooks/useWheelToHorizontalScroll"
import { gearWarp } from "../../lib/gearHover"

type Props = {
  users: any[]
  page: number
  totalPages: number
  onPageChange: (page: number) => void
  isLoading?: boolean

  deleteUser: (
    userId: string
  ) => void

  search: string

  setSearch: (
    value: string
  ) => void

  openCreateUserModal: () => void

  openEditUserModal: (
    user: any
  ) => void

  openAssignGamesModal: (
    user: any
  ) => void

  lockedUsers?: { email: string; remainingSeconds: number }[]
  clearLockout?: (email: string) => void
  isClearingLockout?: string | null
  resendInvite?: (email: string) => void
}

export default function UsersPage({
  users,
  page,
  totalPages,
  onPageChange,
  isLoading,
  search,
  setSearch,
  openCreateUserModal,
  openEditUserModal,
  deleteUser,
  openAssignGamesModal,
  lockedUsers = [],
  clearLockout,
  isClearingLockout,
  resendInvite,
}: Props) {

  function formatCountdown(seconds: number) {
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    return m > 0 ? `${m}m ${s}s` : `${s}s`
  }

  const [
    showDeleteModal,
    setShowDeleteModal,
  ] = React.useState(false)

  const [userToDelete, setUserToDelete] =
    React.useState<any>(null)

  const scrollRef = useWheelToHorizontalScroll<HTMLDivElement>()

  return (
    <>

    {/* LOCKED ACCOUNTS BANNER — admin only */}
    {lockedUsers.length > 0 && (
      <div className="mb-4 rounded-[24px] border border-red-500/20 bg-red-500/10 p-5">
        <div className="flex items-center gap-2 mb-3">
          <svg className="w-4 h-4 text-red-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 11c0-1.1.9-2 2-2s2 .9 2 2v1H10v-1c0-1.1.9-2 2-2zm-5 0V9a5 5 0 0110 0v2h1a2 2 0 012 2v6a2 2 0 01-2 2H7a2 2 0 01-2-2v-6a2 2 0 012-2h1z" />
          </svg>
          <p className="text-red-400 text-sm font-semibold">
            {lockedUsers.length === 1
              ? "1 account is temporarily locked"
              : `${lockedUsers.length} accounts are temporarily locked`}
          </p>
        </div>
        <div className="flex flex-col gap-2">
          {lockedUsers.map((u) => (
            <div
              key={u.email}
              className="flex items-center justify-between gap-4 rounded-xl bg-red-500/5 border border-red-500/10 px-4 py-2.5"
            >
              <div className="flex items-center gap-3 min-w-0">
                <span className="text-sm text-[#F5F1E8] font-medium truncate">
                  {u.email}
                </span>
                <span className="text-xs text-red-300/70 font-mono flex-shrink-0">
                  {formatCountdown(u.remainingSeconds)}
                </span>
              </div>
              <button
                onClick={() => clearLockout?.(u.email)}
                disabled={isClearingLockout === u.email}
                className="
                  h-8
                  px-4
                  rounded-lg
                  bg-red-500/20
                  border
                  border-red-500/30
                  text-red-300
                  hover:bg-red-500/30
                  hover:border-red-500/50
                  text-xs
                  font-semibold
                  transition-all
                  disabled:opacity-50
                  disabled:cursor-not-allowed
                  flex-shrink-0
                "
              >
                {isClearingLockout === u.email ? "Clearing…" : "Clear Lockout"}
              </button>
            </div>
          ))}
        </div>
      </div>
    )}

    <div
      className="
        bg-[radial-gradient(circle_at_top,rgba(214,179,106,0.06),transparent_55%)]
        bg-[#0E0E0E]
        border
        border-[#242424]
        rounded-[32px]
        overflow-hidden
        shadow-[0_0_50px_rgba(0,0,0,0.45)]
        backdrop-blur-xl
      "
    >

      {/* HEADER */}
      <div className="px-4 py-3 border-b border-[#242424] bg-[#111111] flex items-center gap-2 flex-wrap">


        {/* SEARCH */}
        <div className="relative flex-1 min-w-[140px]">
          <svg xmlns="http://www.w3.org/2000/svg" className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-600 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <circle cx="11" cy="11" r="8" /><path strokeLinecap="round" d="M21 21l-4.35-4.35" />
          </svg>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search users…"
            className="w-full h-[38px] pl-8 pr-3 bg-[#0E0E0E] border border-[#2A2A2A] rounded-xl text-sm text-white outline-none transition placeholder:text-zinc-600 focus:border-[#D6B36A] focus:bg-[#0A0A0A]"
          />
        </div>

        {/* USER COUNT */}
        <div className="h-[38px] px-3 flex items-center rounded-xl bg-[#0E0E0E] border border-[#2A2A2A] text-sm text-[#D6B36A] font-medium flex-shrink-0">
          {users.length} Users
        </div>

        {/* ADD USER */}
        <button
          onClick={openCreateUserModal}
          onMouseMove={gearWarp}
          className="btn-gear h-[38px] px-4 rounded-xl text-sm font-bold tracking-wide shadow-[0_0_14px_rgba(214,179,106,0.18)] flex-shrink-0"
        >
          + Add User
        </button>

      </div>

      {/* TABLE */}
      <div className="table-scroll" ref={scrollRef}>
      <table className="w-full border-separate border-spacing-0 text-sm">

        <thead
          className="
            bg-[#121212]
            border-b
            border-[#242424]
            text-[#7A7A7A]
            text-[11px]
            uppercase
            tracking-[0.18em]
          "
        >

          <tr>

            <th className="text-left px-6 py-3">
              Name
            </th>

            <th className="text-left px-6 py-3">
              Email
            </th>

            <th className="text-left px-6 py-3">
              Role
            </th>

            <th className="text-left px-6 py-3">
              Position
            </th>

            <th className="text-left px-6 py-3">
              Department
            </th>

            <th className="text-left px-6 py-3">
              Actions
            </th>

          </tr>

        </thead>

        <tbody>

          {isLoading ? (
            <tr>
              <td colSpan={6} className="py-20 text-center text-zinc-500">
                Loading users...
              </td>
            </tr>
          ) : users.length === 0 ? (
            <tr>
              <td colSpan={6} className="py-20 text-center text-zinc-500">
                No users found
              </td>
            </tr>
          ) : users.map(
            (user) => (
              <tr
                key={user.id}
                onClick={() =>
                  openEditUserModal(
                    user
                  )
                }
                className="
                  border-b
                  border-[#1F1F1F]
                  hover:bg-[rgba(214,179,106,0.03)]
                  cursor-pointer
                  transition-all
                  duration-300
                "
              >

                {/* NAME */}
                <td className="px-6 py-2.5">

                  <div>

                    <div className="flex items-center gap-2">

                      <p className="font-semibold text-[#F5F1E8]">
                        {`${user.firstName} ${user.lastName}`}
                      </p>

                      {user.isActive ? (
                        <div
                          title="Account Activated"
                          className="
                            w-2.5
                            h-2.5
                            rounded-full
                            bg-green-400
                            shadow-[0_0_10px_rgba(74,222,128,0.8)]
                          "
                        />
                      ) : (
                        <div
                          title="Pending Activation"
                          className="
                            w-2.5
                            h-2.5
                            rounded-full
                            bg-yellow-400
                            shadow-[0_0_10px_rgba(250,204,21,0.8)]
                          "
                        />
                      )}

                    </div>

                  </div>

                </td>

                {/* EMAIL */}
                <td className="px-6 py-2.5 text-zinc-300">
                  {user.email}
                </td>

                {/* ROLE */}
                <td className="px-6 py-2.5">

                  {user.role === "ADMIN" ? (
                    <span
                      className="
                        border
                        border-[#D6B36A]/30
                        bg-[#D6B36A]/10
                        px-3
                        py-1.5
                        rounded-xl
                        text-xs
                        font-semibold
                        tracking-wide
                        text-gear-gradient
                      "
                    >
                      Admin
                    </span>
                  ) : (
                    <span
                      className="
                        border
                        border-[#2B2B2B]
                        bg-[#171717]
                        px-3
                        py-1.5
                        rounded-xl
                        text-xs
                        font-semibold
                        tracking-wide
                        text-[#F5F1E8]
                      "
                    >
                      User
                    </span>
                  )}

                </td>

                {/* POSITION */}
                <td className="px-6 py-2.5 text-zinc-300">
                  {user.position?.replace(/_/g, " ") || "-"}
                </td>

                {/* DEPARTMENT */}
                <td className="px-6 py-2.5 text-zinc-300">
                  {user.department || "-"}
                </td>

                {/* ACTIONS */}
                <td className="px-6 py-2.5">
                  <div className="flex items-center gap-2">

                    {/* RESEND INVITE — admin only, inactive users only */}
                    {resendInvite && !user.isActive && (
                      <button
                        onClick={(e) => { e.stopPropagation(); resendInvite(user.email) }}
                        onMouseMove={gearWarp}
                        title="Resend invitation email"
                        className="btn-gear h-9 w-9 rounded-xl flex items-center justify-center flex-shrink-0"
                      >
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                          <polyline points="22,6 12,13 2,6"/>
                        </svg>
                      </button>
                    )}

                    {/* ASSIGN GAMES — broadcast producers/ppms only */}
                    {user.department === "BROADCAST" && (
                      user.position === "PRODUCER" ||
                      user.position === "POST_PRODUCTION_MANAGER"
                    ) && (
                      <button
                        onClick={(e) => { e.stopPropagation(); openAssignGamesModal(user) }}
                        onMouseMove={gearWarp}
                        title="Assign games"
                        className="btn-gear h-9 w-9 rounded-xl flex items-center justify-center flex-shrink-0"
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                          {/* Controller body */}
                          <path d="M6 9H3.5A1.5 1.5 0 002 10.5v1.8A4.7 4.7 0 006.7 17h10.6A4.7 4.7 0 0022 12.3v-1.8A1.5 1.5 0 0020.5 9H18" />
                          {/* Grips / top bar */}
                          <path d="M6 9V7a2 2 0 012-2h8a2 2 0 012 2v2" />
                          {/* D-pad left */}
                          <path d="M8.5 11.5h-2M7.5 10.5v2" />
                          {/* Face buttons right (ABXY style) */}
                          <circle cx="15" cy="11" r="0.6" fill="currentColor" stroke="none" />
                          <circle cx="16.5" cy="12.5" r="0.6" fill="currentColor" stroke="none" />
                          <circle cx="15" cy="14" r="0.6" fill="currentColor" stroke="none" />
                          <circle cx="13.5" cy="12.5" r="0.6" fill="currentColor" stroke="none" />
                        </svg>
                      </button>
                    )}

                    {/* DELETE */}
                    <button
                      onClick={(e) => { e.stopPropagation(); setUserToDelete(user); setShowDeleteModal(true) }}
                      title="Delete user"
                      className="h-9 w-9 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 hover:border-red-500/40 transition-all duration-200 flex items-center justify-center flex-shrink-0"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="3 6 5 6 21 6"/>
                        <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/>
                        <path d="M10 11v6M14 11v6"/>
                        <path d="M9 6V4h6v2"/>
                      </svg>
                    </button>

                  </div>
                </td>

              </tr>
            )
          )}

        </tbody>

      </table>
      </div>

      {/* PAGINATION */}
      <PaginationBar page={page} totalPages={totalPages} onPageChange={onPageChange} />

    </div>

    {/* DELETE MODAL — rendered via portal to escape overflow-hidden container */}
    {showDeleteModal && ReactDOM.createPortal(
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 px-4">

        <div
          className="
            w-[460px]
            rounded-[32px]
            border
            border-white/10
            bg-[#0C0C0C]/95
            backdrop-blur-2xl
            p-8
            shadow-[0_20px_80px_rgba(0,0,0,0.6)]
          "
        >

          <div className="text-center">

            <h2 className="text-2xl font-bold text-gear-gradient w-fit mb-3">
              Delete User
            </h2>

            <p className="text-zinc-400 leading-relaxed">
              Are you sure you want to delete{" "}

              <span className="text-white font-medium">
                {`${userToDelete?.firstName} ${userToDelete?.lastName}`}
              </span>

              ?
            </p>

            <p className="text-sm text-red-400 mt-3">
              This action cannot be undone.
            </p>

          </div>

          <div className="flex items-center gap-4 mt-8">

            <button
              onClick={() => {
                setShowDeleteModal(false)

                setUserToDelete(null)
              }}
              className="
                flex-1
                h-[52px]
                rounded-2xl
                border
                border-white/15
                bg-white/5
                text-zinc-300
                font-medium
                transition-all
                hover:text-white
                hover:bg-white/10
              "
            >
              Cancel
            </button>

            <button
              onClick={() => {
                deleteUser(
                  userToDelete.id
                )

                setShowDeleteModal(false)

                setUserToDelete(null)
              }}
              className="
                flex-1
                h-[52px]
                rounded-2xl
                bg-red-500
                text-white
                font-semibold
                transition-all
                hover:bg-red-400
              "
            >
              Delete
            </button>

          </div>

        </div>

      </div>,
      document.body
    )}

    </>
  )
}