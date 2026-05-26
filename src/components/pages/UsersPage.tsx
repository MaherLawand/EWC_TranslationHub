import React from "react"
import ReactDOM from "react-dom"
import PaginationBar from "../shared/PaginationBar"
import { useWheelToHorizontalScroll } from "../../hooks/useWheelToHorizontalScroll"

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
}: Props) {

  const [
    showDeleteModal,
    setShowDeleteModal,
  ] = React.useState(false)

  const [userToDelete, setUserToDelete] =
    React.useState<any>(null)

  const scrollRef = useWheelToHorizontalScroll<HTMLDivElement>()

  return (
    <>
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
          className="h-[38px] px-4 rounded-xl bg-[#D6B36A] text-black text-sm font-bold tracking-wide shadow-[0_0_14px_rgba(214,179,106,0.18)] transition hover:bg-[#E4C27C] flex-shrink-0"
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
                        text-[#D6B36A]
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

                  <div className="flex items-center gap-3">

                    {user.department ===
  "BROADCAST" &&

(
  user.position ===
    "PRODUCER" ||

  user.position ===
    "POST_PRODUCTION_MANAGER"
) && (

  <button
    onClick={(e) => {
      e.stopPropagation()

      openAssignGamesModal(
        user
      )
    }}
    className="
      h-10
      px-4
      rounded-xl
      bg-[#D6B36A]/10
      border
      border-[#D6B36A]/20
      text-[#D6B36A]
      hover:bg-[#D6B36A]/15
      hover:border-[#D6B36A]/40
      transition-all
      duration-200
      text-sm
      font-medium
    "
  >
    Assign Games
  </button>

)}

                    <button
                      onClick={(e) => {
                        e.stopPropagation()

                        setUserToDelete(user)

                        setShowDeleteModal(true)
                      }}
                      className="
                        h-10
                        w-10
                        rounded-xl
                        bg-red-500/10
                        border
                        border-red-500/20
                        text-red-400
                        hover:bg-red-500/20
                        hover:border-red-500/40
                        transition-all
                        duration-200
                        flex
                        items-center
                        justify-center
                      "
                    >
                      ✕
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
      <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">

        <div
          className="
            w-[460px]
            rounded-[32px]
            border
            border-[#242424]
            bg-[linear-gradient(180deg,#111111_0%,#0B0B0B_100%)]
            p-8
            shadow-[0_20px_60px_rgba(0,0,0,0.55)]
          "
        >

          <div
            className="
              w-16
              h-16
              rounded-2xl
              bg-red-500/10
              border
              border-red-500/20
              flex
              items-center
              justify-center
              mx-auto
              mb-6
            "
          >

            <span className="text-3xl">
              🗑️
            </span>

          </div>

          <div className="text-center">

            <h2 className="text-2xl font-bold text-[#F5F1E8] mb-3">
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
                border-[#2A2A2A]
                bg-[#151515]
                text-[#F5F1E8]
                font-medium
                transition-all
                hover:bg-[#1B1B1B]
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