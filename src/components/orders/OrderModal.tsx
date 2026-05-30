import { useState, useCallback, useEffect, useRef } from "react"
import {
  LANGUAGES,
  type Language,
} from "../../constants/languages"
import Select from "react-select"
import { motion, AnimatePresence } from "framer-motion"
import { gearWarp } from "../../lib/gearHover"
import DatePicker from "react-datepicker"
import "react-datepicker/dist/react-datepicker.css"
import "../../../src/styling/datepicker-dark.css"

type Props = {
  showModal: boolean

  setShowModal: (
    value: boolean
  ) => void

  isEditing: boolean

  isSavingOrder: boolean

  newOrder: any
  selectedEvent: string

  setNewOrder: (
    value: any
  ) => void

  toggleLanguage: (
    language: string
  ) => void

  selectedOrder: any
  setSelectedOrder: (
    order: any
  ) => void
  games: any[]
  fetchGames: () => void

  createOrder: (assignUserIds?: string[]) => void

  updateOrder: () => void

  onAssignUsers?: (orderId: string, userIds: string[]) => Promise<void>
  editingOrderId?: string
  canAssignUsers?: boolean
  setIsEditing: (value: boolean) => void
  setEditingOrderId: (id: string) => void
}


export default function OrderModal({
  showModal,
  setShowModal,
  isEditing,
  isSavingOrder,
  newOrder,
  setNewOrder,
  toggleLanguage,
  selectedOrder,
  setSelectedOrder,
  createOrder,
  games,
  fetchGames,
  updateOrder,
  selectedEvent,
  onAssignUsers,
  editingOrderId,
  canAssignUsers,
  setIsEditing,
  setEditingOrderId,
}: Props) {
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [languageSearch, setLanguageSearch] = useState("")
  const initialOrderRef = useRef(JSON.stringify(newOrder))
  const wasOpenRef = useRef(showModal)
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false)

  // Snapshot newOrder synchronously the moment showModal transitions false→true.
  // Doing this during render (not in an effect) guarantees the snapshot and the
  // current newOrder are from the exact same render, so isDirty starts as false.
  if (showModal && !wasOpenRef.current) {
    initialOrderRef.current = JSON.stringify(newOrder)
  }
  wasOpenRef.current = showModal

  // Assign users state
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([])
  const [allUsers, setAllUsers] = useState<any[]>([])
  const [isLoadingUsers, setIsLoadingUsers] = useState(false)

  const clearError = useCallback((field: string) => {
    setErrors((prev) => { const next = { ...prev }; delete next[field]; return next })
  }, [])

  // Seed selected users from existing assignments when editing
  useEffect(() => {
    if (isEditing && newOrder.type === "MARKETING" && selectedOrder?.marketing?.assignments) {
      setSelectedUserIds(selectedOrder.marketing.assignments.map((a: any) => a.user.id))
    } else if (!isEditing) {
      setSelectedUserIds([])
    }
  }, [isEditing, selectedOrder?.id, newOrder.type])

  // Load all users once when modal opens for MARKETING
  useEffect(() => {
    if (!showModal || newOrder.type !== "MARKETING") return
    setIsLoadingUsers(true)
    fetch(`${import.meta.env.VITE_API_URL}/auth/users/search`, { credentials: "include" })
      .then((r) => r.ok ? r.json() : [])
      .then((users) => setAllUsers(users))
      .catch(() => setAllUsers([]))
      .finally(() => setIsLoadingUsers(false))
  }, [showModal, newOrder.type])


  function validate() {
    const e: Record<string, string> = {}
    if (!newOrder.title?.trim()) e.title = "Order title is required"
    if (newOrder.type === "BROADCAST") {
      if (!newOrder.game) e.game = "Game is required"
      if (!newOrder.estimatedMinutes || Number(newOrder.estimatedMinutes) <= 0) e.estimatedMinutes = "Estimated minutes is required"
      if (!newOrder.deliveryDate) e.deliveryDate = "Delivery date is required"
      if (!newOrder.deadline) e.deadline = "Deadline is required"
    }
    if (newOrder.type === "MARKETING") {
      if (!newOrder.deadline) e.deadline = "Deadline is required"
    }
    setErrors(e)
    return Object.keys(e).length === 0
  }

  function handleSubmit() {
    if (!validate()) return
    if (isEditing) updateOrder()
    else createOrder(newOrder.type === "MARKETING" ? selectedUserIds : [])
  }

  const isDirty = JSON.stringify(newOrder) !== initialOrderRef.current

  function tryClose() {
    if (isDirty) {
      setShowDiscardConfirm(true)
    } else {
      handleClose()
    }
  }

  if (!showModal) {
    return null
  }
  function handleClose() {
  setShowModal(false)
  setIsEditing(false)
  setEditingOrderId("")
  setShowDiscardConfirm(false)

  setSelectedUserIds([])
  setAllUsers([])

setNewOrder({
  title: "",
  contentTitle: "",
  notes:"",

  game: "",

  type: "BROADCAST",
  event:selectedEvent,

  status: "PENDING",

  priority: "MEDIUM",

  sourceLanguage: [],

  targetLanguages: [],

  deliveryFormats: [],

  deadline: "",

  sourceFileLink: "",

  srtAvailableLink: "",

  estimatedMinutes: "",

  deliveryDate: "",

  deliveries: [],
})
}

  const darkSelectStyles = {
  control: (base: any) => ({
    ...base,
    backgroundColor: "rgba(255,255,255,0.10)",
    borderColor: "rgba(255,255,255,0.20)",
    minHeight: 48,
    borderRadius: 16,
    boxShadow: "none",
    ":hover": {
      borderColor: "#D6B36A",
    },
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

  multiValue: (base: any) => ({
    ...base,
    backgroundColor: "rgba(255,255,255,0.12)",
    border: "1px solid rgba(255,255,255,0.18)",
    borderRadius: 8,
    paddingLeft: 4,
  }),

  multiValueLabel: (base: any) => ({
    ...base,
    color: "#F5F1E8",
    fontSize: 12,
    fontWeight: 500,
  }),

  multiValueRemove: (base: any) => ({
    ...base,
    color: "#71717a",
    ":hover": {
      backgroundColor: "#2A2A2A",
      color: "white",
    },
  }),

  input: (base: any) => ({
    ...base,
    color: "#F5F1E8",
  }),

  placeholder: (base: any) => ({
    ...base,
    color: "#52525b",
  }),

  singleValue: (base: any) => ({
    ...base,
    color: "#F5F1E8",
  }),
}

const today = new Date()

today.setHours(0, 0, 0, 0)


  return (
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-0 sm:p-4"
        onClick={tryClose}
      >
<motion.div
  layout
  transition={{
  layout: {
    duration: 0.6,
    ease: [0.22, 1, 0.36, 1],
  },
}}
  onClick={(e) => e.stopPropagation()}
  className={`bg-white/5 border border-white/10 backdrop-blur-2xl rounded-t-3xl sm:rounded-3xl flex flex-col max-h-[95vh] sm:max-h-[90vh] shadow-[0_20px_80px_rgba(0,0,0,0.6)] w-full relative ${
    newOrder.deliveries?.length > 0
      ? "sm:max-w-[1200px]"
      : "sm:max-w-[700px]"
  }`}
>
      {/* HEADER */}
      <div className="flex items-center justify-between px-8 pt-7 pb-5 border-b border-white/10 bg-[radial-gradient(ellipse_80%_60%_at_top,rgba(214,179,106,0.08),transparent_70%)] rounded-t-3xl flex-shrink-0">
        <div>
          <p className="text-xs font-semibold tracking-[0.18em] uppercase text-[#D6B36A]/70 mb-1">
            {isEditing ? "Editing" : "New Order"}
          </p>
          <h2 className="text-xl font-bold text-gear-gradient w-fit">
            {isEditing ? "Edit Order" : "Create Order"}
          </h2>
        </div>
        <button
          onClick={tryClose}
          className="w-8 h-8 flex items-center justify-center rounded-full bg-white/10 border border-white/10 text-zinc-300 hover:text-white hover:bg-white/20 transition text-sm"
        >
          ✕
        </button>
      </div>
<div className="flex-1 overflow-auto p-4 sm:p-8 dark-scroll">
      {/* FORM */}
  {/* FORM */}
<div
  className={`grid gap-6 ${
    newOrder.deliveries?.length > 0
      ? "grid-cols-1 lg:grid-cols-[1fr_380px]"
      : "grid-cols-1"
  }`}
>

  {/* LEFT SIDE */}
  <div className="space-y-6">

    {/* GENERAL */}
    <div className="bg-[radial-gradient(circle_at_top,rgba(214,179,106,0.06),transparent_60%)] bg-white/[0.04] border border-white/10 rounded-[28px] p-6 shadow-[0_8px_40px_rgba(0,0,0,0.35)]">

      <h3 className="text-lg font-semibold mb-5 text-gear-gradient w-fit">
        General Information
      </h3>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

        {/* TITLE */}
        <div className="col-span-full">
          <label className="text-xs font-medium text-zinc-300 mb-2 block tracking-wide">
            Order Title <span className="text-red-400">*</span>
          </label>
          <input
            value={newOrder.title}
            onChange={(e) => { setNewOrder({ ...newOrder, title: e.target.value }); clearError("title") }}
            placeholder="Enter title"
            className={`w-full bg-white/10 border rounded-2xl px-4 py-3 text-white outline-none transition placeholder:text-white/30 focus:bg-white/15 ${errors.title ? "border-red-500/60 focus:border-red-500" : "border-white/20 focus:border-[#D6B36A]"}`}
          />
          {errors.title && <p className="text-red-400 text-xs mt-1.5">{errors.title}</p>}
        </div>

        {/* NOTES */}
<div className="col-span-full">
  <label className="text-xs font-medium text-zinc-300 mb-2 block tracking-wide">
    Notes
  </label>

  <textarea
    value={newOrder.notes || ""}
    onChange={(e) =>
      setNewOrder({
        ...newOrder,
        notes: e.target.value,
      })
    }
    placeholder="Add internal notes..."
    rows={5}
    className="
      w-full
      bg-white/10
      border
      border-white/20
      rounded-2xl
      px-4
      py-3
      text-white
      placeholder:text-white/30
      resize-y
      outline-none
      focus:border-[#D6B36A]
      focus:bg-white/15
      transition
    "
  />
</div>

        {/* TYPE */}
        <div>
          <label className="text-xs font-medium text-zinc-300 mb-2 block tracking-wide">
            Order Type
          </label>

          <select
            value={newOrder.type}
            onChange={(e) => {
              const type = e.target.value
              setNewOrder({
                ...newOrder,
                type,
                // broadcast-only — reset when switching away
                game: "",
                estimatedMinutes: "",
                deliveryDate: "",
                // marketing-only — reset when switching away
                contentTitle: "",
              })
              setSelectedUserIds([])
              setAllUsers([])
              setErrors({})
            }}
            className="w-full bg-white/10 border border-white/20 rounded-2xl px-4 py-3 text-white outline-none focus:border-[#D6B36A] focus:bg-white/15 transition placeholder:text-white/30"
          >
            <option value="BROADCAST">Broadcast</option>
            <option value="MARKETING">Marketing</option>
          </select>
        </div>

        {/* STATUS */}
        <div>
          <label className="text-xs font-medium text-zinc-300 mb-2 block tracking-wide">
            Status
          </label>

          <select
            value={
              newOrder.status ||
              "PENDING"
            }
            onChange={(e) =>
              setNewOrder({
                ...newOrder,
                status:
                  e.target.value,
              })
            }
            className="w-full bg-white/10 border border-white/20 rounded-2xl px-4 py-3 text-white outline-none focus:border-[#D6B36A] focus:bg-white/15 transition placeholder:text-white/30"
          >
            <option value="PENDING">
              Pending
            </option>

            <option value="IN_PROGRESS">
              In Progress
            </option>

            <option value="COMPLETED">
              Completed
            </option>
          </select>
        </div>

        <div>
  <label className="text-xs font-medium text-zinc-300 mb-2 block tracking-wide">
    Priority
  </label>

  <select
    value={newOrder.priority}
    onChange={(e) =>
      setNewOrder({
        ...newOrder,
        priority: e.target.value,
      })
    }
    className="w-full bg-white/10 border border-white/20 rounded-2xl px-4 py-3 text-white outline-none focus:border-[#D6B36A] focus:bg-white/15 transition placeholder:text-white/30"
  >
    <option value="LOW">
      Low
    </option>

    <option value="MEDIUM">
      Medium
    </option>

    <option value="HIGH">
      High
    </option>
  </select>
</div>

      </div>

    </div>

    {/* BROADCAST */}
    {newOrder.type ===
      "BROADCAST" && (
      <div className="bg-[radial-gradient(circle_at_top,rgba(214,179,106,0.06),transparent_60%)] bg-white/[0.04] border border-white/10 rounded-[28px] p-6 shadow-[0_8px_40px_rgba(0,0,0,0.35)]">

        <h3 className="text-lg font-semibold mb-5 text-gear-gradient w-fit">
          Broadcast Details
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

          {/* GAME */}
          <div>
            <label className="text-xs font-medium text-zinc-300 mb-2 block tracking-wide">
              Game <span className="text-red-400">*</span>
            </label>
            <Select
              options={games.map((game: any) => ({ value: game.id, label: game.name }))}
              value={games.map((game: any) => ({ value: game.id, label: game.name })).find((o: any) => o.value === newOrder.game) || null}
              onChange={(selected) => { setNewOrder({ ...newOrder, game: selected?.value || "" }); clearError("game") }}
              placeholder="Search game..."
              styles={{
                ...darkSelectStyles,
                control: (base: any) => ({
                  ...darkSelectStyles.control(base),
                  borderColor: errors.game ? "rgba(239,68,68,0.6)" : base.borderColor,
                }),
              }}
              className="text-sm"
            />
            {errors.game && <p className="text-red-400 text-xs mt-1.5">{errors.game}</p>}
          </div>

          {/* MINUTES */}
          <div>
            <label className="text-xs font-medium text-zinc-300 mb-2 block tracking-wide">
              Estimated Minutes <span className="text-red-400">*</span>
            </label>
            <input
              type="number"
              value={newOrder.estimatedMinutes}
              onChange={(e) => { setNewOrder({ ...newOrder, estimatedMinutes: e.target.value }); clearError("estimatedMinutes") }}
              className={`w-full bg-white/10 border rounded-2xl px-4 py-3 text-white outline-none transition placeholder:text-white/30 focus:bg-white/15 ${errors.estimatedMinutes ? "border-red-500/60 focus:border-red-500" : "border-white/20 focus:border-[#D6B36A]"}`}
            />
            {errors.estimatedMinutes && <p className="text-red-400 text-xs mt-1.5">{errors.estimatedMinutes}</p>}
          </div>

          {/* SOURCE LANGUAGES */}
          <div className="col-span-full">
            <label className="text-xs font-medium text-zinc-300 mb-2 block tracking-wide">
              Source Languages
            </label>

            <Select
              isMulti
              styles={darkSelectStyles}
              options={LANGUAGES.map(
                (
                  language: Language
                ) => ({
                  value:
                    language.name,
                  label:
                    language.name,
                })
              )}

              value={
                newOrder.sourceLanguage?.map(
                  (
                    language: string
                  ) => ({
                    value:
                      language,
                    label:
                      language,
                  })
                ) || []
              }

              onChange={(
                selected
              ) =>
                setNewOrder({
                  ...newOrder,

                  sourceLanguage:
                    (selected || []).map(
                      (
                        item: any
                      ) =>
                        item.value
                    ),
                })
              }

              placeholder="Search source languages..."
              className="text-sm"
            />
          </div>

          {/* TARGET LANGUAGES */}
          <div className="col-span-full">
            <label className="text-xs font-medium text-zinc-300 mb-2 block tracking-wide">
              Translate To
            </label>

            <Select
              isMulti
              styles={darkSelectStyles}
              options={LANGUAGES.map(
                (
                  language: Language
                ) => ({
                  value:
                    language.name,
                  label:
                    language.name,
                })
              )}

              value={
                newOrder.targetLanguages?.map(
                  (
                    language: string
                  ) => ({
                    value:
                      language,
                    label:
                      language,
                  })
                ) || []
              }

            onChange={(selected) => {
  const selectedLanguages =
    (selected || []).map(
      (item: any) => item.value
    )

  const existingDeliveries =
    newOrder.deliveries || []

  const updatedDeliveries =
    selectedLanguages.map(
      (language: string) => {
        const existing =
          existingDeliveries.find(
            (d: any) =>
              d.language === language
          )

        return existing
          ? existing
          : {
              language,
              deliveryLink: "",
            }
      }
    )

  setNewOrder({
    ...newOrder,

    targetLanguages:
      selectedLanguages,

    deliveries:
      updatedDeliveries,
  })
}}

              placeholder="Search target languages..."
              className="text-sm"
            />
          </div>

        {/* FORMAT */}
<div>
  <label className="text-xs font-medium text-zinc-300 mb-2 block tracking-wide">
    Delivery Format
  </label>

<Select
  isMulti
  styles={darkSelectStyles}
  options={[
    {
      value: "SRT",
      label: "SRT",
    },
    {
      value: "BURNED_IN",
      label: "BURNED IN",
    },
    {
      value: "TEXT",
      label: "TEXT",
    },
  ]}
  value={
    newOrder.deliveryFormats?.map(
      (item: any) => ({
        value: item.format,
        label: item.format,
      })
    ) || []
  }
  onChange={(selected) => {
    const existing =
      newOrder.deliveryFormats || []

    const updated =
     (selected || []).map((item: any) => {
        const found =
          existing.find(
            (f: any) =>
              f.format === item.value
          )

        return found || {
          format: item.value,
          deliveryLink: "",
        }
      })

    setNewOrder({
      ...newOrder,
      deliveryFormats: updated,
    })
  }}
/>
</div>

          {/* SOURCE FILE */}
          <div>
            <label className="text-xs font-medium text-zinc-300 mb-2 block tracking-wide">
              Source File
            </label>

            <input
            type="url"
              value={
                newOrder.sourceFileLink
              }
              onChange={(e) =>
                setNewOrder({
                  ...newOrder,
                  sourceFileLink:
                    e.target.value,
                })
              }
              className="w-full bg-white/10 border border-white/20 rounded-2xl px-4 py-3 text-white outline-none focus:border-[#D6B36A] focus:bg-white/15 transition placeholder:text-white/30"
            />
          </div>

          {/* SRT AVAILABLE LINK */}
          <div>
            <label className="text-xs font-medium text-zinc-300 mb-2 block tracking-wide">
              SRT Available Link
              <span className="text-zinc-600 text-xs ml-1">(optional)</span>
            </label>
            <input
              type="url"
              value={newOrder.srtAvailableLink || ""}
              onChange={(e) =>
                setNewOrder({
                  ...newOrder,
                  srtAvailableLink: e.target.value,
                })
              }
              placeholder="Paste SRT link..."
              className="w-full bg-white/10 border border-white/20 rounded-2xl px-4 py-3 text-white outline-none focus:border-[#D6B36A] focus:bg-white/15 transition placeholder:text-white/30"
            />
          </div>

          {/* DELIVERY DATE */}
          <div>
            <label className="text-xs font-medium text-zinc-300 mb-2 block tracking-wide">
              Delivery Date <span className="text-red-400">*</span>
            </label>
            <DatePicker
              selected={newOrder.deliveryDate ? new Date(newOrder.deliveryDate) : null}
              onChange={(date: Date | null) => { setNewOrder({ ...newOrder, deliveryDate: date?.toISOString().split("T")[0] || "" }); clearError("deliveryDate") }}
              minDate={today}
              dateFormat="yyyy-MM-dd"
              placeholderText="Select delivery date"
              wrapperClassName="w-full"
              className={`w-full bg-white/10 border rounded-2xl px-4 py-3 text-white outline-none focus:border-[#D6B36A] focus:bg-white/15 transition placeholder:text-white/30 ${errors.deliveryDate ? "border-red-500/60" : "border-white/20"}`}
            />
            {errors.deliveryDate && <p className="text-red-400 text-xs mt-1.5">{errors.deliveryDate}</p>}
          </div>

          {/* DEADLINE */}
          <div>
            <label className="text-xs font-medium text-zinc-300 mb-2 block tracking-wide">
              Deadline <span className="text-red-400">*</span>
            </label>
            <DatePicker
              selected={newOrder.deadline ? new Date(newOrder.deadline) : null}
              onChange={(date: Date | null) => { setNewOrder({ ...newOrder, deadline: date?.toISOString().split("T")[0] || "" }); clearError("deadline") }}
              minDate={today}
              dateFormat="yyyy-MM-dd"
              placeholderText="Select deadline"
              wrapperClassName="w-full"
              className={`w-full bg-white/10 border rounded-2xl px-4 py-3 text-white outline-none focus:border-[#D6B36A] focus:bg-white/15 transition placeholder:text-white/30 ${errors.deadline ? "border-red-500/60" : "border-white/20"}`}
            />
            {errors.deadline && <p className="text-red-400 text-xs mt-1.5">{errors.deadline}</p>}
          </div>

        </div>

      </div>
    )}

{/* MARKETING */}
{newOrder.type ===
  "MARKETING" && (
  <div className="bg-[radial-gradient(circle_at_top,rgba(214,179,106,0.06),transparent_60%)] bg-white/[0.04] border border-white/10 rounded-[28px] p-6 shadow-[0_8px_40px_rgba(0,0,0,0.35)]">

    <h3 className="text-lg font-semibold mb-5 text-gear-gradient w-fit">
      Marketing Details
    </h3>

    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

      {/* CONTENT TITLE */}
<div className="col-span-full">

  <label className="text-xs font-medium text-zinc-300 mb-2 block tracking-wide">
    Content Title
  </label>

  <select
    value={
      newOrder.contentTitle || ""
    }

    onChange={(e) =>
      setNewOrder({
        ...newOrder,

        contentTitle:
          e.target.value,
      })
    }

    className="
      w-full
      bg-white/10
      border
      border-white/20
      rounded-2xl
      px-4
      py-3
      text-white
      outline-none
      focus:border-[#D6B36A]
      focus:bg-white/15
      transition
    "
  >

    <option value="">
      Select content
    </option>

    <option value="Content 1">
      Content 1
    </option>

    <option value="Content 2">
      Content 2
    </option>

    <option value="Content 3">
      Content 3
    </option>

    <option value="Others">
      Others
    </option>

  </select>

</div>

      {/* FORMAT */}
      <div>
        <label className="text-xs font-medium text-zinc-300 mb-2 block tracking-wide">
          Delivery Format
        </label>

      <Select
  isMulti
  styles={darkSelectStyles}
  options={[
    {
      value: "SRT",
      label: "SRT",
    },
    {
      value: "BURNED_IN",
      label: "BURNED IN",
    },
    {
      value: "TEXT",
      label: "TEXT",
    },
  ]}
  value={
    newOrder.deliveryFormats?.map(
      (item: any) => ({
        value: item.format,
        label: item.format,
      })
    ) || []
  }
  onChange={(selected) => {
    const existing =
      newOrder.deliveryFormats || []

    const updated =
      (selected || []).map((item: any) => {
        const found =
          existing.find(
            (f: any) =>
              f.format === item.value
          )

        return found || {
          format: item.value,
          deliveryLink: "",
        }
      })

    setNewOrder({
      ...newOrder,
      deliveryFormats: updated,
    })
  }}
/>
      </div>
      {/* SOURCE LANGUAGES */}
<div className="col-span-full">

  <label className="text-xs font-medium text-zinc-300 mb-2 block tracking-wide">
    Source Languages
  </label>

  <Select
    isMulti
    styles={darkSelectStyles}

    options={LANGUAGES.map(
      (language: Language) => ({
        value: language.name,
        label: language.name,
      })
    )}

    value={
      newOrder.sourceLanguage?.map(
        (language: string) => ({
          value: language,
          label: language,
        })
      ) || []
    }

    onChange={(selected) =>
      setNewOrder({
        ...newOrder,

        sourceLanguage:
          (selected || []).map(
            (item: any) =>
              item.value
          ),
      })
    }

    placeholder="Search source languages..."

    className="text-sm"
  />

</div>

{/* TARGET LANGUAGES */}
<div className="col-span-full">

  <label className="text-xs font-medium text-zinc-300 mb-2 block tracking-wide">
    Translate To
  </label>

  <Select
    isMulti

    styles={darkSelectStyles}

    options={LANGUAGES.map(
      (language: Language) => ({
        value: language.name,
        label: language.name,
      })
    )}

    value={
      newOrder.targetLanguages?.map(
        (language: string) => ({
          value: language,
          label: language,
        })
      ) || []
    }

    onChange={(selected) => {

      const selectedLanguages =
        (selected || []).map(
          (item: any) =>
            item.value
        )

      const existingDeliveries =
        newOrder.deliveries || []

      const updatedDeliveries =
        selectedLanguages.map(
          (language: string) => {

            const existing =
              existingDeliveries.find(
                (d: any) =>
                  d.language ===
                  language
              )

            return existing
              ? existing
              : {
                  language,
                  deliveryLink: "",
                }
          }
        )

      setNewOrder({
        ...newOrder,

        targetLanguages:
          selectedLanguages,

        deliveries:
          updatedDeliveries,
      })
    }}

    placeholder="Search target languages..."

    className="text-sm"
  />

</div>

      {/* SOURCE FILE */}
      <div>
        <label className="text-xs font-medium text-zinc-300 mb-2 block tracking-wide">
          Source File
        </label>

        <input
        type="url"
          value={
            newOrder.sourceFileLink
          }
          onChange={(e) =>
            setNewOrder({
              ...newOrder,
              sourceFileLink:
                e.target.value,
            })
          }
          placeholder="Paste source link..."
          className="w-full bg-white/10 border border-white/20 rounded-2xl px-4 py-3 text-white outline-none focus:border-[#D6B36A] focus:bg-white/15 transition placeholder:text-white/30"
        />
      </div>

      {/* SRT AVAILABLE LINK */}
      <div>
        <label className="text-xs font-medium text-zinc-300 mb-2 block tracking-wide">
          SRT Available Link
          <span className="text-zinc-600 text-xs ml-1">(optional)</span>
        </label>
        <input
          type="url"
          value={newOrder.srtAvailableLink || ""}
          onChange={(e) =>
            setNewOrder({
              ...newOrder,
              srtAvailableLink: e.target.value,
            })
          }
          placeholder="Paste SRT link..."
          className="w-full bg-white/10 border border-white/20 rounded-2xl px-4 py-3 text-white outline-none focus:border-[#D6B36A] focus:bg-white/15 transition placeholder:text-white/30"
        />
      </div>

       {/* DEADLINE */}
          <div>
            <label className="text-xs font-medium text-zinc-300 mb-2 block tracking-wide">
              Deadline <span className="text-red-400">*</span>
            </label>
            <DatePicker
              selected={newOrder.deadline ? new Date(newOrder.deadline) : null}
              onChange={(date: Date | null) => { setNewOrder({ ...newOrder, deadline: date?.toISOString().split("T")[0] || "" }); clearError("deadline") }}
              minDate={today}
              dateFormat="yyyy-MM-dd"
              placeholderText="Select deadline"
              wrapperClassName="w-full"
              className={`w-full bg-white/10 border rounded-2xl px-4 py-3 text-white outline-none focus:border-[#D6B36A] focus:bg-white/15 transition placeholder:text-white/30 ${errors.deadline ? "border-red-500/60" : "border-white/20"}`}
            />
            {errors.deadline && <p className="text-red-400 text-xs mt-1.5">{errors.deadline}</p>}
          </div>

      {/* DELIVERED LINK
      <div className="col-span-full">
        <label className="text-xs font-medium text-zinc-300 mb-2 block tracking-wide">
          Delivered Link
        </label>

        <input
          value={
            newOrder.deliveredLink ||
            ""
          }
          onChange={(e) =>
            setNewOrder({
              ...newOrder,
              deliveredLink:
                e.target.value,
            })
          }
          placeholder="Paste delivered file link..."
          className="w-full bg-white/10 border border-white/20 rounded-2xl px-4 py-3 text-white outline-none focus:border-[#D6B36A] focus:bg-white/15 transition placeholder:text-white/30"
        />
      </div> */}

    </div>

  </div>
)}

{/* ASSIGN USERS — marketing only */}
{newOrder.type === "MARKETING" && canAssignUsers && (
  <div className="bg-[radial-gradient(circle_at_top,rgba(214,179,106,0.06),transparent_60%)] bg-white/[0.04] border border-white/10 rounded-[28px] p-6 shadow-[0_8px_40px_rgba(0,0,0,0.35)]">

    <div className="mb-5">
      <h3 className="text-lg font-semibold text-gear-gradient w-fit">Assign Users</h3>
      <p className="text-sm text-zinc-500 mt-0.5">
        {selectedUserIds.length > 0
          ? `${selectedUserIds.length} user${selectedUserIds.length > 1 ? "s" : ""} selected`
          : "No users assigned"}
      </p>
    </div>

        <Select
          isMulti
          isLoading={isLoadingUsers}
          styles={darkSelectStyles}
          options={allUsers.map((u: any) => ({
            value: u.id,
            label: `${u.firstName} ${u.lastName}${u.position ? ` — ${u.position.replace(/_/g, " ")}` : ""}`,
          }))}
          value={allUsers
            .filter((u: any) => selectedUserIds.includes(u.id))
            .map((u: any) => ({
              value: u.id,
              label: `${u.firstName} ${u.lastName}${u.position ? ` — ${u.position.replace(/_/g, " ")}` : ""}`,
            }))}
          onChange={(selected) => {
            const ids = (selected || []).map((s: any) => s.value)
            setSelectedUserIds(ids)
            if (isEditing && editingOrderId && onAssignUsers) {
              onAssignUsers(editingOrderId, ids)
            }
          }}
          placeholder="Search and select users..."
          className="text-sm"
        />

  </div>
)}
  </div>

{/* RIGHT SIDE */}
<AnimatePresence>
{(
  newOrder.deliveries?.length > 0 ||
  newOrder.deliveryFormats?.length > 0
) && (
<motion.div
 initial={{
  opacity: 0,
  x: 16,
}}

animate={{
  opacity: 1,
  x: 0,
}}

exit={{
  opacity: 0,
  x: 16,
}}

transition={{
  duration: 0.45,
  ease: [0.22, 1, 0.36, 1],
}}

  className="bg-[radial-gradient(circle_at_top,rgba(214,179,106,0.06),transparent_60%)] bg-white/[0.04] border border-white/10 rounded-[28px] p-6 flex flex-col h-fit sticky top-0 shadow-[0_8px_40px_rgba(0,0,0,0.35)]"
>

    <div className="mb-5">
      <h3 className="text-lg font-semibold text-gear-gradient w-fit">
        Delivery Assets
      </h3>

      <p className="text-sm text-zinc-500 mt-1">
        Manage language and format links
      </p>
    </div>

    <div className="space-y-4 max-h-[650px] overflow-auto pr-1 dark-scroll">

      {newOrder.deliveries.map(
        (
          delivery: any,
          index: number
        ) => (
          <div
            key={
              delivery.language
            }
            className="bg-white/[0.03] border border-white/10 rounded-2xl p-4"
          >

            <p className="text-sm font-medium mb-3">
              {
                delivery.language
              }
            </p>

            <input
            type="url"
              value={
                delivery.deliveryLink || ""
              }
              onChange={(e) => {
                const updated =
                  [
                    ...newOrder.deliveries,
                  ]

                updated[index] = {
                  ...updated[index],

                  deliveryLink:
                    e.target.value,
                }

                setNewOrder({
                  ...newOrder,

                  deliveries:
                    updated,
                })
              }}

              placeholder="Paste delivery link..."

              className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white outline-none focus:border-[#D6B36A] focus:bg-white/15 transition placeholder:text-white/30"
            />

          </div>
        )
      )}

      {/* FORMAT DELIVERY LINKS — commented out, kept for future use
{newOrder.deliveryFormats
  ?.length > 0 && (
  <div className="mt-8">
    <div className="mb-5">
      <h3 className="text-lg font-semibold">Format Links</h3>
      <p className="text-sm text-zinc-500 mt-1">Add links for each format</p>
    </div>
    <div className="space-y-4">
      {newOrder.deliveryFormats.map((formatItem: any, index: number) => (
        <div key={formatItem.format} className="bg-white/[0.03] border border-white/10 rounded-2xl p-4">
          <p className="text-sm font-medium mb-3">{formatItem.format}</p>
          <input
            type="url"
            value={formatItem.deliveryLink || ""}
            onChange={(e) => {
              const updated = [...newOrder.deliveryFormats]
              updated[index] = { ...updated[index], deliveryLink: e.target.value }
              setNewOrder({ ...newOrder, deliveryFormats: updated })
            }}
            placeholder={`Paste ${formatItem.format} link...`}
            className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white outline-none focus:border-[#D6B36A] focus:bg-white/15 transition placeholder:text-white/30"
          />
        </div>
      ))}
    </div>
  </div>
)}
*/}

    </div>

  </motion.div>
)}
</AnimatePresence>
</div>
</div>
{/* BUTTONS */}
<div className="border-t border-white/10 bg-white/[0.02] p-6 rounded-b-3xl flex-shrink-0">

  <button
    disabled={isSavingOrder || (isEditing && !isDirty)}
    onClick={handleSubmit}
    onMouseMove={gearWarp}
    className={`w-full py-3.5 rounded-2xl font-semibold transition ${
      isSavingOrder || (isEditing && !isDirty)
        ? "bg-[#1A1A1A] text-zinc-600 cursor-not-allowed border border-[#2A2A2A]"
        : "btn-gear"
    }`}
  >
    {isSavingOrder
      ? isEditing
        ? "Saving Changes..."
        : "Creating Order..."
      : isEditing
      ? "Save Changes"
      : "Create Order"}
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
                  onClick={handleClose}
                  className="flex-1 py-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm hover:bg-red-500/20 transition"
                >
                  Discard
                </button>
              </div>
            </div>
          </div>
        )}

    </motion.div>
  </div>
  )
}