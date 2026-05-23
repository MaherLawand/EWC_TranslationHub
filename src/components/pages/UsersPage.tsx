import React from "react"
import PaginationBar from "../shared/PaginationBar"

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

  return (
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
      <div
        className="
          px-8
          py-6
          border-b
          border-[#242424]
          flex
          items-center
          justify-between
          bg-[#111111]/80
          backdrop-blur-xl
        "
      >

        <div>

          <h3 className="text-lg font-semibold text-[#F5F1E8]">
            Users
          </h3>

        </div>

        <div
          className="
            bg-[#151515]
            border
            border-[#2A2A2A]
            px-4
            py-2
            rounded-2xl
            text-sm
            text-[#D6B36A]
            font-medium
            shadow-[0_0_20px_rgba(214,179,106,0.08)]
          "
        >
          {users.length} Users
        </div>

      </div>

      {/* TOOLBAR */}
      <div
        className="
          px-8
          py-6
          border-b
          border-[#242424]
          flex
          items-center
          gap-4
        "
      >

        {/* SEARCH */}
        <input
          value={search}
          onChange={(e) =>
            setSearch(e.target.value)
          }
          placeholder="Search users..."
          className="
            flex-1
            h-[54px]
            bg-[#121212]
            border
            border-[#2A2A2A]
            rounded-2xl
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

        {/* ADD USER */}
        <button
          onClick={
            openCreateUserModal
          }
          className="
            h-[54px]
            px-6
            rounded-2xl
            bg-[#D6B36A]
            text-black
            font-semibold
            transition-all
            hover:bg-[#E7C989]
            hover:shadow-[0_0_25px_rgba(214,179,106,0.18)]
          "
        >
          + Add User
        </button>

      </div>

      {/* TABLE */}
      <div className="table-scroll">
      <table className="w-full border-separate border-spacing-0">

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

            <th className="text-left px-6 py-5">
              Name
            </th>

            <th className="text-left px-6 py-5">
              Email
            </th>

            <th className="text-left px-6 py-5">
              Role
            </th>

            <th className="text-left px-6 py-5">
              Position
            </th>

            <th className="text-left px-6 py-5">
              Actions
            </th>

          </tr>

        </thead>

        <tbody>

          {isLoading ? (
            <tr>
              <td colSpan={5} className="py-20 text-center text-zinc-500">
                Loading users...
              </td>
            </tr>
          ) : users.length === 0 ? (
            <tr>
              <td colSpan={5} className="py-20 text-center text-zinc-500">
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
                <td className="px-6 py-6">

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
                <td className="px-6 py-6 text-zinc-300">
                  {user.email}
                </td>

                {/* ROLE */}
                <td className="px-6 py-6">

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
                    {user.role}
                  </span>

                </td>

                {/* POSITION */}
                <td className="px-6 py-6 text-zinc-300">
                  {user.position || "-"}
                </td>

                {/* ACTIONS */}
                <td className="px-6 py-6">

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
                        text-lg
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

      {/* DELETE MODAL */}
      {showDeleteModal && (
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
                  {userToDelete?.name}
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

        </div>
      )}

    </div>
  )
}