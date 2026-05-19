import { useState } from "react"

type Props = {
  showUserModal: boolean
  setShowUserModal: (value: boolean) => void
  isEditingUser: boolean
  isSavingUser: boolean
  userForm: any
  setUserForm: (value: any) => void
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
  const [errors, setErrors] = useState<Record<string, string>>({})

  if (!showUserModal) return null

  function clearError(field: string) {
    if (errors[field]) setErrors((prev) => { const next = { ...prev }; delete next[field]; return next })
  }

  function validate() {
    const e: Record<string, string> = {}
    if (!userForm.firstName?.trim()) e.firstName = "First name is required"
    if (!userForm.lastName?.trim()) e.lastName = "Last name is required"
    const email = userForm.email?.trim() || ""
    if (!email) {
      e.email = "Email is required"
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      e.email = "Enter a valid email address"
    }
    setErrors(e)
    return Object.keys(e).length === 0
  }

  function handleSubmit() {
    if (!validate()) return
    if (isEditingUser) updateUser()
    else createUser()
  }

  const inputBase = "w-full bg-zinc-900 border rounded-xl px-4 py-3 outline-none transition"
  const inputNormal = `${inputBase} border-zinc-700 focus:border-[#D6B36A]`
  const inputError = `${inputBase} border-red-500/60 focus:border-red-500`

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
      <div className="bg-[#0E0E0E] border border-zinc-800 rounded-3xl p-8 w-[600px]">

        {/* HEADER */}
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-2xl font-bold">
            {isEditingUser ? "Edit User" : "Create User"}
          </h2>
          <button
            onClick={() => setShowUserModal(false)}
            className="text-zinc-500 hover:text-white transition text-xl"
          >
            ✕
          </button>
        </div>

        {/* FORM */}
        <div className={`space-y-5 ${isSavingUser ? "pointer-events-none opacity-60" : ""}`}>

          {/* FIRST + LAST NAME */}
          <div className="grid grid-cols-2 gap-4">

            {/* FIRST NAME */}
            <div>
              <label className="text-sm text-zinc-400 mb-2 block">
                First Name <span className="text-red-400">*</span>
              </label>
              <input
                value={userForm.firstName}
                onChange={(e) => { setUserForm({ ...userForm, firstName: e.target.value }); clearError("firstName") }}
                placeholder="John"
                className={errors.firstName ? inputError : inputNormal}
              />
              {errors.firstName && <p className="text-red-400 text-xs mt-1.5">{errors.firstName}</p>}
            </div>

            {/* LAST NAME */}
            <div>
              <label className="text-sm text-zinc-400 mb-2 block">
                Last Name <span className="text-red-400">*</span>
              </label>
              <input
                value={userForm.lastName}
                onChange={(e) => { setUserForm({ ...userForm, lastName: e.target.value }); clearError("lastName") }}
                placeholder="Doe"
                className={errors.lastName ? inputError : inputNormal}
              />
              {errors.lastName && <p className="text-red-400 text-xs mt-1.5">{errors.lastName}</p>}
            </div>

          </div>

          {/* EMAIL */}
          <div>
            <label className="text-sm text-zinc-400 mb-2 block">
              Email <span className="text-red-400">*</span>
            </label>
            <input
              type="email"
              value={userForm.email}
              disabled={isEditingUser && userForm.isActive}
              onChange={(e) => { setUserForm({ ...userForm, email: e.target.value }); clearError("email") }}
              placeholder="user@ewc.com"
              className={
                isEditingUser && userForm.isActive
                  ? "w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 outline-none text-zinc-500 cursor-not-allowed"
                  : errors.email ? inputError : inputNormal
              }
            />
            {errors.email && !(isEditingUser && userForm.isActive) && (
              <p className="text-red-400 text-xs mt-1.5">{errors.email}</p>
            )}
            {!isEditingUser && !errors.email && (
              <p className="text-xs text-zinc-500 mt-2">
                User will receive an email to set their password.
              </p>
            )}
          </div>

          {/* ROLE */}
          <div>
            <label className="text-sm text-zinc-400 mb-2 block">
              Role <span className="text-zinc-600 text-xs font-normal">(optional)</span>
            </label>
            <select
              value={userForm.role}
              onChange={(e) => setUserForm({ ...userForm, role: e.target.value })}
              className={inputNormal}
            >
              <option value="">Select Role</option>
              <option value="ADMIN">ADMIN</option>
              <option value="EDITOR">EDITOR</option>
              <option value="VIEWER">VIEWER</option>
            </select>
          </div>

          {/* DEPARTMENT */}
          <div>
            <label className="text-sm text-zinc-400 mb-2 block">
              Department <span className="text-zinc-600 text-xs font-normal">(optional)</span>
            </label>
            <select
              value={userForm.department}
              onChange={(e) => setUserForm({ ...userForm, department: e.target.value })}
              className={inputNormal}
            >
              <option value="">Select Department</option>
              <option value="BROADCAST">BROADCAST</option>
              <option value="MARKETING">MARKETING</option>
            </select>
          </div>

          {/* POSITION */}
          <div>
            <label className="text-sm text-zinc-400 mb-2 block">
              Position <span className="text-zinc-600 text-xs font-normal">(optional)</span>
            </label>
            <select
              value={userForm.position}
              onChange={(e) => setUserForm({ ...userForm, position: e.target.value })}
              className={inputNormal}
            >
              <option value="">Select Position</option>
              <option value="PRODUCER">PRODUCER</option>
              <option value="POST_PRODUCTION_MANAGER">POST_PRODUCTION_MANAGER</option>
              <option value="TRANSLATOR">TRANSLATOR</option>
              <option value="EDITOR">EDITOR</option>
              <option value="VIEWER">VIEWER</option>
            </select>
          </div>

        </div>

        {/* SUBMIT */}
        <button
          disabled={isSavingUser}
          onClick={handleSubmit}
          className={`
            w-full py-4 rounded-xl font-semibold mt-8 transition
            flex items-center justify-center gap-3
            ${isSavingUser
              ? "bg-zinc-700 text-zinc-400 cursor-not-allowed"
              : "bg-white text-black hover:opacity-90"
            }
          `}
        >
          {isSavingUser && (
            <div className="w-4 h-4 border-2 border-zinc-400 border-t-transparent rounded-full animate-spin" />
          )}
          {isSavingUser
            ? isEditingUser ? "Saving Changes..." : "Sending Invite..."
            : isEditingUser ? "Save Changes" : "Send Invite"
          }
        </button>

      </div>
    </div>
  )
}
