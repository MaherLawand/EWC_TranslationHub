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

  const inputBase = "w-full bg-[#0A0A0A] border rounded-xl px-4 py-3 text-[#F5F1E8] outline-none transition"
  const inputNormal = `${inputBase} border-[#2A2A2A] focus:border-[#D6B36A]`
  const inputError = `${inputBase} border-red-500/60 focus:border-red-500`

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
      <div className="bg-[#0A0A0A] border border-[#1E1E1E] rounded-3xl w-[600px] shadow-[0_0_80px_rgba(0,0,0,0.8)] flex flex-col max-h-[90vh]">

        {/* HEADER */}
        <div className="flex items-center justify-between px-8 pt-7 pb-5 border-b border-[#1E1E1E] bg-[radial-gradient(ellipse_80%_60%_at_top,rgba(214,179,106,0.06),transparent_70%)] rounded-t-3xl flex-shrink-0">
          <div>
            <p className="text-xs font-semibold tracking-[0.18em] uppercase text-[#D6B36A]/70 mb-1">
              {isEditingUser ? "Editing" : "New User"}
            </p>
            <h2 className="text-xl font-bold text-[#F5F1E8]">
              {isEditingUser ? "Edit User" : "Create User"}
            </h2>
          </div>
          <button
            onClick={() => setShowUserModal(false)}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-[#1A1A1A] border border-[#2A2A2A] text-zinc-500 hover:text-white hover:border-[#3A3A3A] transition text-sm"
          >
            ✕
          </button>
        </div>

        {/* FORM */}
        <div className={`flex-1 overflow-auto dark-scroll p-8 space-y-5 ${isSavingUser ? "pointer-events-none opacity-60" : ""}`}>

          {/* NAME ROW */}
          <div className="bg-[radial-gradient(circle_at_top,rgba(214,179,106,0.05),transparent_60%)] bg-[#111111] border border-[#242424] rounded-[28px] p-6 shadow-[0_0_40px_rgba(0,0,0,0.4)]">
            <h3 className="text-sm font-semibold text-[#F5F1E8] mb-4">Identity</h3>
            <div className="grid grid-cols-2 gap-4">

              {/* FIRST NAME */}
              <div>
                <label className="text-xs font-medium text-zinc-500 mb-2 block tracking-wide">
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
                <label className="text-xs font-medium text-zinc-500 mb-2 block tracking-wide">
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

              {/* EMAIL */}
              <div className="col-span-2">
                <label className="text-xs font-medium text-zinc-500 mb-2 block tracking-wide">
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
                      ? "w-full bg-[#111111] border border-[#2A2A2A] rounded-xl px-4 py-3 outline-none text-zinc-600 cursor-not-allowed"
                      : errors.email ? inputError : inputNormal
                  }
                />
                {errors.email && !(isEditingUser && userForm.isActive) && (
                  <p className="text-red-400 text-xs mt-1.5">{errors.email}</p>
                )}
                {!isEditingUser && !errors.email && (
                  <p className="text-xs text-zinc-600 mt-2">
                    User will receive an email to set their password.
                  </p>
                )}
              </div>

            </div>
          </div>

          {/* ROLE / DEPT / POSITION */}
          <div className="bg-[radial-gradient(circle_at_top,rgba(214,179,106,0.05),transparent_60%)] bg-[#111111] border border-[#242424] rounded-[28px] p-6 shadow-[0_0_40px_rgba(0,0,0,0.4)]">
            <h3 className="text-sm font-semibold text-[#F5F1E8] mb-4">
              Role & Access
              <span className="text-zinc-600 text-xs font-normal ml-2">(optional)</span>
            </h3>
            <div className="space-y-4">

              {/* ROLE */}
              <div>
                <label className="text-xs font-medium text-zinc-500 mb-2 block tracking-wide">
                  Role
                </label>
                <select
                  value={userForm.role}
                  onChange={(e) => setUserForm({ ...userForm, role: e.target.value })}
                  className={inputNormal}
                >
                  <option value="">Select Role</option>
                  <option value="ADMIN">Admin</option>
                  <option value="EDITOR">Editor</option>
                  <option value="VIEWER">Viewer</option>
                </select>
              </div>

              {/* DEPARTMENT */}
              <div>
                <label className="text-xs font-medium text-zinc-500 mb-2 block tracking-wide">
                  Department
                </label>
                <select
                  value={userForm.department}
                  onChange={(e) => setUserForm({ ...userForm, department: e.target.value })}
                  className={inputNormal}
                >
                  <option value="">Select Department</option>
                  <option value="BROADCAST">Broadcast</option>
                  <option value="MARKETING">Marketing</option>
                </select>
              </div>

              {/* POSITION */}
              <div>
                <label className="text-xs font-medium text-zinc-500 mb-2 block tracking-wide">
                  Position
                </label>
                <select
                  value={userForm.position}
                  onChange={(e) => setUserForm({ ...userForm, position: e.target.value })}
                  className={inputNormal}
                >
                  <option value="">Select Position</option>
                  <option value="PRODUCER">Producer</option>
                  <option value="POST_PRODUCTION_MANAGER">Post Production Manager</option>
                  <option value="TRANSLATOR">Translator</option>
                  <option value="EDITOR">Editor</option>
                  <option value="VIEWER">Viewer</option>
                </select>
              </div>

            </div>
          </div>

        </div>

        {/* FOOTER */}
        <div className="border-t border-[#1E1E1E] bg-[#0A0A0A] p-6 rounded-b-3xl flex-shrink-0">
          <button
            disabled={isSavingUser}
            onClick={handleSubmit}
            className={`
              w-full py-3.5 rounded-2xl font-semibold transition
              flex items-center justify-center gap-3
              ${isSavingUser
                ? "bg-[#1A1A1A] text-zinc-600 cursor-not-allowed border border-[#2A2A2A]"
                : "bg-[#D6B36A] text-black hover:bg-[#E4C27C]"
              }
            `}
          >
            {isSavingUser && (
              <div className="w-4 h-4 border-2 border-zinc-600 border-t-transparent rounded-full animate-spin" />
            )}
            {isSavingUser
              ? isEditingUser ? "Saving Changes..." : "Sending Invite..."
              : isEditingUser ? "Save Changes" : "Send Invite"
            }
          </button>
        </div>

      </div>
    </div>
  )
}
