type Props = {
  showUserModal: boolean

  setShowUserModal: (
    value: boolean
  ) => void

  isEditingUser: boolean
  isSavingUser: boolean
  userForm: any

  setUserForm: (
    value: any
  ) => void

  createUser: () => void

  updateUser: () => void
}

export default function UserModal({
  showUserModal,
  setShowUserModal,
  isEditingUser,
  isSavingUser,
  userForm,
  setUserForm,
  createUser,
  updateUser,
}: Props) {
  if (!showUserModal) {
    return null
  }

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">

      <div className="bg-[#0E0E0E] border border-zinc-800 rounded-3xl p-8 w-[600px]">

        {/* HEADER */}
{/* HEADER */}
<div className="flex items-center justify-between mb-8">

  <h2 className="text-2xl font-bold">
    {isEditingUser
      ? "Edit User"
      : "Create User"}
  </h2>

  <button
    onClick={() =>
      setShowUserModal(false)
    }
    className="
      text-zinc-500
      hover:text-white
      transition
      text-xl
    "
  >
    ✕
  </button>

</div>

{/* FORM */}
<div
  className={`space-y-5 ${
    isSavingUser
      ? "pointer-events-none opacity-60"
      : ""
  }`}
>

  {/* FIRST + LAST NAME */}
  <div className="grid grid-cols-2 gap-4">

    {/* FIRST NAME */}
    <div>

      <label className="text-sm text-zinc-400 mb-2 block">
        First Name
      </label>

      <input
        value={userForm.firstName}
        onChange={(e) =>
          setUserForm({
            ...userForm,
            firstName: e.target.value,
          })
        }
        placeholder="John"
        className="
          w-full
          bg-zinc-900
          border
          border-zinc-700
          rounded-xl
          px-4
          py-3
          outline-none
        "
      />

    </div>

    {/* LAST NAME */}
    <div>

      <label className="text-sm text-zinc-400 mb-2 block">
        Last Name
      </label>

      <input
        value={userForm.lastName}
        onChange={(e) =>
          setUserForm({
            ...userForm,
            lastName: e.target.value,
          })
        }
        placeholder="Doe"
        className="
          w-full
          bg-zinc-900
          border
          border-zinc-700
          rounded-xl
          px-4
          py-3
          outline-none
        "
      />

    </div>

  </div>

  {/* EMAIL */}
  <div>

    <label className="text-sm text-zinc-400 mb-2 block">
      Email
    </label>

    <input
      type="email"
      value={userForm.email}
      disabled={
        isEditingUser &&
        userForm.isActive
      }
      onChange={(e) =>
        setUserForm({
          ...userForm,
          email: e.target.value,
        })
      }
      placeholder="user@ewc.com"
      className={`w-full border rounded-xl px-4 py-3 outline-none ${
        isEditingUser &&
        userForm.isActive
          ? "bg-zinc-800 border-zinc-700 text-zinc-500 cursor-not-allowed"
          : "bg-zinc-900 border-zinc-700"
      }`}
    />

    {!isEditingUser && (
      <p className="text-xs text-zinc-500 mt-2">
        User will receive an email to set their password.
      </p>
    )}

  </div>

  {/* ROLE */}
  <div>

    <label className="text-sm text-zinc-400 mb-2 block">
      Role
    </label>

    <select
      value={userForm.role}
      onChange={(e) =>
        setUserForm({
          ...userForm,
          role: e.target.value,
        })
      }
      className="
        w-full
        bg-zinc-900
        border
        border-zinc-700
        rounded-xl
        px-4
        py-3
      "
    >

      <option value="">
        Select Role
      </option>

      <option value="ADMIN">
        ADMIN
      </option>

      <option value="EDITOR">
        EDITOR
      </option>

      <option value="VIEWER">
        VIEWER
      </option>

    </select>

  </div>

  {/* DEPARTMENT */}
  <div>

    <label className="text-sm text-zinc-400 mb-2 block">
      Department
    </label>

    <select
      value={userForm.department}
      onChange={(e) =>
        setUserForm({
          ...userForm,
          department: e.target.value,
        })
      }
      className="
        w-full
        bg-zinc-900
        border
        border-zinc-700
        rounded-xl
        px-4
        py-3
      "
    >

      <option value="">
        Select Department
      </option>

      <option value="BROADCAST">
        BROADCAST
      </option>

      <option value="MARKETING">
        MARKETING
      </option>

    </select>

  </div>

  {/* POSITION */}
  <div>

    <label className="text-sm text-zinc-400 mb-2 block">
      Position
    </label>

    <select
      value={userForm.position}
      onChange={(e) =>
        setUserForm({
          ...userForm,
          position: e.target.value,
        })
      }
      className="
        w-full
        bg-zinc-900
        border
        border-zinc-700
        rounded-xl
        px-4
        py-3
      "
    >

      <option value="">
        Select Position
      </option>

      <option value="PRODUCER">
        PRODUCER
      </option>

      <option value="POST_PRODUCTION_MANAGER">
        POST_PRODUCTION_MANAGER
      </option>

      <option value="TRANSLATOR">
        TRANSLATOR
      </option>

      <option value="EDITOR">
        EDITOR
      </option>

      <option value="VIEWER">
        VIEWER
      </option>

    </select>

  </div>

</div>

<button
  disabled={isSavingUser}
  onClick={
    isEditingUser
      ? updateUser
      : createUser
  }
  className={`
    w-full
    py-4
    rounded-xl
    font-semibold
    mt-8
    transition
    flex
    items-center
    justify-center
    gap-3

    ${
      isSavingUser
        ? `
          bg-zinc-700
          text-zinc-400
          cursor-not-allowed
        `
        : `
          bg-white
          text-black
          hover:opacity-90
        `
    }
  `}
>

  {isSavingUser && (
    <div
      className="
        w-4
        h-4
        border-2
        border-zinc-400
        border-t-transparent
        rounded-full
        animate-spin
      "
    />
  )}

  {isSavingUser
    ? isEditingUser
      ? "Saving Changes..."
      : "Sending Invite..."
    : isEditingUser
    ? "Save Changes"
    : "Send Invite"}

</button>

      </div>

    </div>
  )
}