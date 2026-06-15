import { useState, useEffect } from "react"
import Select from "react-select"
import { gearWarp } from "../../lib/gearHover"

const darkSelectStyles = {
  control: (base: any, state: any) => ({
    ...base,
    backgroundColor: "#242424",
    borderColor: state.isFocused ? "#D6B36A" : "rgba(255,255,255,0.20)",
    minHeight: 48,
    borderRadius: 12,
    boxShadow: "none",
    ":hover": { borderColor: "#D6B36A" },
  }),
  menu: (base: any) => ({
    ...base,
    backgroundColor: "#111111",
    border: "1px solid #242424",
    borderRadius: 16,
    overflow: "hidden",
    zIndex: 9999,
    boxShadow: "0 0 40px rgba(0,0,0,0.6)",
  }),
  menuList: (base: any) => ({
    ...base,
    backgroundColor: "#111111",
    padding: 8,
  }),
  option: (base: any, state: any) => ({
    ...base,
    backgroundColor: state.isFocused ? "#1A1A1A" : "transparent",
    color: state.isFocused ? "#F5F1E8" : "#A1A1AA",
    borderRadius: 10,
    cursor: "pointer",
    fontSize: 14,
    marginBottom: 2,
  }),
  input: (base: any) => ({ ...base, color: "#F5F1E8" }),
  placeholder: (base: any) => ({ ...base, color: "#8b8b93" }),
  singleValue: (base: any) => ({ ...base, color: "#F5F1E8" }),
  // Render the menu in a body-level portal so the modal's scroll container
  // can't clip it; keep it above the modal.
  menuPortal: (base: any) => ({ ...base, zIndex: 99999 }),
}

// Props shared by every Select so the dropdown flips up when there's no room
// below (e.g. Position, the last field) and is never clipped by the modal.
const selectMenuProps = {
  menuPlacement: "auto" as const,
  menuPosition: "fixed" as const,
  menuPortalTarget: typeof document !== "undefined" ? document.body : undefined,
  menuShouldScrollIntoView: true,
}

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
  const [initialForm, setInitialForm] = useState(() => JSON.stringify(userForm))
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false)

  // Re-snapshot the form every time the modal opens so isDirty starts false
  useEffect(() => {
    if (showUserModal) {
      setInitialForm(JSON.stringify(userForm))
      setErrors({})
      setShowDiscardConfirm(false)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showUserModal])

  if (!showUserModal) return null

  const isDirty = JSON.stringify(userForm) !== initialForm

  function tryClose() {
    if (isDirty) {
      setShowDiscardConfirm(true)
    } else {
      setShowUserModal(false)
    }
  }

  function forceClose() {
    setShowDiscardConfirm(false)
    setShowUserModal(false)
  }

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
    if (!userForm.role) e.role = "Please select a role"
    if (!userForm.department) e.department = "Please select a department"
    if (!userForm.position) e.position = "Please select a position"
    setErrors(e)
    return Object.keys(e).length === 0
  }

  function handleSubmit() {
    if (!validate()) return
    if (isEditingUser) updateUser()
    else createUser()
  }

  const inputBase = "w-full bg-white/10 border rounded-xl px-4 py-3 text-white outline-none transition placeholder:text-white/50 focus:bg-white/15 focus:shadow-[0_0_25px_rgba(214,179,106,0.15)]"
  const inputNormal = `${inputBase} border-white/20 focus:border-[#D6B36A]`
  const inputError = `${inputBase} border-red-500/60 focus:border-red-500`

  return (
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-0 sm:p-4"
      onClick={tryClose}
    >
      <div
        className="bg-[#0C0C0C]/95 border border-white/10 backdrop-blur-2xl rounded-t-3xl sm:rounded-3xl w-full sm:max-w-[600px] shadow-[0_20px_80px_rgba(0,0,0,0.6)] flex flex-col max-h-[95vh] sm:max-h-[90vh] relative"
        onClick={(e) => e.stopPropagation()}
      >

        {/* HEADER */}
        <div className="flex items-center justify-between px-8 pt-7 pb-5 border-b border-white/10 bg-[radial-gradient(ellipse_80%_60%_at_top,rgba(214,179,106,0.08),transparent_70%)] rounded-t-3xl flex-shrink-0">
          <div>
            <p className="text-xs font-semibold tracking-[0.18em] uppercase text-[#D6B36A]/70 mb-1">
              {isEditingUser ? "Editing" : "New User"}
            </p>
            <h2 className="text-xl font-bold text-gear-gradient w-fit">
              {isEditingUser ? "Edit User" : "Create User"}
            </h2>
          </div>
          <button
            onClick={tryClose}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-white/10 border border-white/10 text-zinc-300 hover:text-white hover:bg-white/20 transition text-sm"
          >
            ✕
          </button>
        </div>

        {/* FORM */}
        <div className={`flex-1 overflow-auto dark-scroll p-8 space-y-5 ${isSavingUser ? "pointer-events-none opacity-60" : ""}`}>

          {/* NAME ROW */}
          <div className="bg-[radial-gradient(circle_at_top,rgba(214,179,106,0.06),transparent_60%)] bg-white/[0.04] border border-white/10 rounded-[28px] p-6 shadow-[0_8px_40px_rgba(0,0,0,0.35)]">
            <h3 className="text-sm font-semibold text-[#F5F1E8] mb-4">Identity</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

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
                      ? "w-full bg-white/[0.04] border border-white/10 rounded-xl px-4 py-3 outline-none text-zinc-500 cursor-not-allowed"
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
          <div className="bg-[radial-gradient(circle_at_top,rgba(214,179,106,0.06),transparent_60%)] bg-white/[0.04] border border-white/10 rounded-[28px] p-6 shadow-[0_8px_40px_rgba(0,0,0,0.35)]">
            <h3 className="text-sm font-semibold text-[#F5F1E8] mb-4">
              Role & Access
            </h3>
            <div className="space-y-4">

              {/* ROLE */}
              <div>
                <label className="text-xs font-medium text-zinc-500 mb-2 block tracking-wide">
                  Role <span className="text-red-400">*</span>
                </label>
                <Select
                  styles={{
                    ...darkSelectStyles,
                    control: (base: any, state: any) => ({
                      ...darkSelectStyles.control(base, state),
                      borderColor: errors.role ? "rgba(239,68,68,0.6)" : state.isFocused ? "#D6B36A" : "rgba(255,255,255,0.20)",
                    }),
                  }}
                  {...selectMenuProps}
                  isSearchable={false}
                  placeholder="Select Role"
                  options={[
                    { value: "ADMIN", label: "Admin" },
                    { value: "USER", label: "User" },
                  ]}
                  value={userForm.role ? { value: userForm.role, label: userForm.role === "ADMIN" ? "Admin" : "User" } : null}
                  onChange={(selected) => { setUserForm({ ...userForm, role: selected?.value || "" }); clearError("role") }}
                />
                {errors.role && <p className="text-red-400 text-xs mt-1.5">{errors.role}</p>}
              </div>

              {/* DEPARTMENT */}
              <div>
                <label className="text-xs font-medium text-zinc-500 mb-2 block tracking-wide">
                  Department <span className="text-red-400">*</span>
                </label>
                <Select
                  styles={{
                    ...darkSelectStyles,
                    control: (base: any, state: any) => ({
                      ...darkSelectStyles.control(base, state),
                      borderColor: errors.department ? "rgba(239,68,68,0.6)" : state.isFocused ? "#D6B36A" : "rgba(255,255,255,0.20)",
                    }),
                  }}
                  {...selectMenuProps}
                  isSearchable={false}
                  placeholder="Select Department"
                  options={[
                    { value: "BROADCAST", label: "Broadcast" },
                    { value: "MARKETING", label: "Marketing" },
                  ]}
                  value={userForm.department ? { value: userForm.department, label: userForm.department === "BROADCAST" ? "Broadcast" : "Marketing" } : null}
                  onChange={(selected) => { setUserForm({ ...userForm, department: selected?.value || "" }); clearError("department") }}
                />
                {errors.department && <p className="text-red-400 text-xs mt-1.5">{errors.department}</p>}
              </div>

              {/* POSITION */}
              <div>
                <label className="text-xs font-medium text-zinc-500 mb-2 block tracking-wide">
                  Position <span className="text-red-400">*</span>
                </label>
                <Select
                  styles={{
                    ...darkSelectStyles,
                    control: (base: any, state: any) => ({
                      ...darkSelectStyles.control(base, state),
                      borderColor: errors.position ? "rgba(239,68,68,0.6)" : state.isFocused ? "#D6B36A" : "rgba(255,255,255,0.20)",
                    }),
                  }}
                  {...selectMenuProps}
                  isSearchable={false}
                  placeholder="Select Position"
                  options={[
                    { value: "PRODUCER", label: "Producer" },
                    { value: "POST_PRODUCTION_MANAGER", label: "Post Production Manager" },
                    { value: "TRANSLATOR", label: "Translator" },
                    { value: "EDITOR", label: "Editor" },
                    { value: "VIEWER", label: "Viewer" },
                  ]}
                  value={userForm.position ? {
                    value: userForm.position,
                    label: { PRODUCER: "Producer", POST_PRODUCTION_MANAGER: "Post Production Manager", TRANSLATOR: "Translator", EDITOR: "Editor", VIEWER: "Viewer" }[userForm.position as string] || userForm.position,
                  } : null}
                  onChange={(selected) => { setUserForm({ ...userForm, position: selected?.value || "" }); clearError("position") }}
                />
                {errors.position && <p className="text-red-400 text-xs mt-1.5">{errors.position}</p>}
              </div>

            </div>
          </div>

        </div>

        {/* FOOTER */}
        <div className="border-t border-white/10 bg-white/[0.02] p-6 rounded-b-3xl flex-shrink-0">
          <button
            disabled={isSavingUser || (isEditingUser && !isDirty)}
            onClick={handleSubmit}
            onMouseMove={gearWarp}
            className={`
              w-full py-3.5 rounded-2xl font-semibold transition
              flex items-center justify-center gap-3
              ${isSavingUser || (isEditingUser && !isDirty)
                ? "bg-[#1A1A1A] text-zinc-600 cursor-not-allowed border border-[#2A2A2A]"
                : "btn-gear"
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

        {/* DISCARD CONFIRM OVERLAY */}
        {showDiscardConfirm && (
          <div className="absolute inset-0 bg-black/75 backdrop-blur-md flex items-center justify-center rounded-t-3xl sm:rounded-3xl z-10 px-6">
            <div className="bg-[#0C0C0C]/95 border border-white/10 backdrop-blur-2xl rounded-2xl p-6 w-full max-w-xs shadow-[0_20px_60px_rgba(0,0,0,0.6)]">
              <p className="text-[#F5F1E8] font-semibold text-sm mb-1">Discard changes?</p>
              <p className="text-zinc-500 text-xs mb-5">You have unsaved changes that will be lost if you close.</p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowDiscardConfirm(false)}
                  className="flex-1 py-2.5 rounded-xl border border-white/15 bg-white/5 text-zinc-300 text-sm hover:text-white hover:bg-white/10 transition"
                >
                  Keep Editing
                </button>
                <button
                  onClick={forceClose}
                  className="flex-1 py-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm hover:bg-red-500/20 transition"
                >
                  Discard
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
