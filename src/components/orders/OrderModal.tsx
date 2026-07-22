import { useState, useCallback, useEffect, useRef } from "react"
import {
  LANGUAGES,
  type Language,
} from "../../constants/languages"
import Select from "react-select"
import {
  BROADCAST_FORMAT_OPTIONS,
  MARKETING_FORMAT_OPTIONS,
  MARKETING_ASPECT_RATIOS,
  formatLabel,
} from "../../constants/deliveryFormats"
import { CONTENT_TITLES } from "../../constants/contentTitles"
import { CONTENT_CATEGORIES, autoDeadlineFromNow } from "../../constants/contentCategories"
import { NOTIFY_POSITION_OPTIONS } from "../../constants/positions"
import { buildTimeOptions } from "../../lib/deadline"
import { toast } from "react-toastify"
import { motion, AnimatePresence } from "framer-motion"
import { gearWarp } from "../../lib/gearHover"
import DatePicker from "react-datepicker"
import "react-datepicker/dist/react-datepicker.css"
import "../../../src/styling/datepicker-dark.css"

// Date <-> "YYYY-MM-DD" helpers that use LOCAL date parts. Using toISOString()
// (UTC) shifted the day by one for users ahead of UTC; parsing "YYYY-MM-DD" with
// new Date() also treats it as UTC midnight. These keep the picker in local time.
function toYMD(d: Date | null): string {
  if (!d) return ""
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
}
function fromYMD(s: string | null | undefined): Date | null {
  if (!s) return null
  const [y, m, d] = s.split("-").map(Number)
  if (!y || !m || !d) return null
  return new Date(y, m - 1, d) // local midnight
}

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

  createBigOrder?: (parentPayload: any, subItems: any[]) => void

  createSubOrders?: (parentId: string, items: any[]) => Promise<any> | void

  updateOrder: () => void

  onAssignUsers?: (orderId: string, userIds: string[]) => Promise<void>
  editingOrderId?: string
  canAssignUsers?: boolean
  setIsEditing: (value: boolean) => void
  setEditingOrderId: (id: string) => void
  /** Pre-seed the sub-order panel (used when duplicating a big order). */
  initialSubOrders?: { title: string; deadline: string }[]
  /** Video-editor mode: every field is disabled except the source file + delivery links. */
  restricted?: boolean
}

// Escape a string so it can be used literally inside a RegExp.
const escapeRegExp = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")

// ── Per-vendor delivery links ──────────────────────────────────────────────
// A delivery entry is { language, vendor, deliveryLink }. `vendor` is "" for the
// shared "General" set, or one of the three vendor roles. Each selected vendor
// gets its own link per language; the modal shows one vendor at a time via pills.
const VENDOR_VALUES = ["TRANSLATOR", "TRANSPERFECT", "TARJAMA"] as const
const VENDOR_LABELS: Record<string, string> = {
  "": "General",
  TRANSLATOR: "Translator",
  TRANSPERFECT: "TransPerfect",
  TARJAMA: "Tarjama",
}
const delVendor = (d: any) => (typeof d?.vendor === "string" ? d.vendor : "")
const uniq = (arr: string[]) => [...new Set(arr)]

/**
 * Which vendors get their own link set (and thus a pill).
 *
 * No vendors selected → just the shared "General" set (no pills). Vendors
 * selected → one set each; the General set is also shown, but only if it already
 * holds links (legacy orders), so it never appears empty on a fresh order.
 */
function deliveryVendorGroups(deliveries: any[], notifyPositions: string[]): string[] {
  const selected = (notifyPositions || []).filter((v) => (VENDOR_VALUES as readonly string[]).includes(v))
  if (selected.length === 0) return [""]
  const generalHasLinks = (deliveries || []).some((d) => delVendor(d) === "" && (d.deliveryLink || "").trim())
  return uniq([...(generalHasLinks ? [""] : []), ...selected])
}

/**
 * Ensure every (group vendor × target language) has an entry, drop entries for
 * untargeted languages, and preserve any existing links — including legacy
 * General links that aren't a current group.
 */
function reconcileDeliveries(existing: any[], languages: string[], groups: string[]): any[] {
  const langSet = new Set(languages)
  const groupSet = new Set(groups)
  const keep = (existing || []).filter(
    (d) =>
      langSet.has(d.language) &&
      // Keep entries for a current group, plus any (legacy) entry that already has
      // a link. Drop empty entries for vendors no longer in the group set.
      (groupSet.has(delVendor(d)) || (d.deliveryLink || "").trim())
  )
  const present = new Set(keep.map((d) => `${delVendor(d)}::${d.language}`))
  const out = [...keep]
  for (const vendor of groups) {
    for (const language of languages) {
      const key = `${vendor}::${language}`
      if (!present.has(key)) {
        out.push({ language, vendor, deliveryLink: "" })
        present.add(key)
      }
    }
  }
  return out
}

/** Structural equality so the reconcile effect doesn't loop. */
function sameDeliveries(a: any[], b: any[]): boolean {
  if (a.length !== b.length) return false
  const key = (d: any) => `${delVendor(d)}::${d.language}::${d.deliveryLink || ""}::${d.id || ""}`
  const sa = a.map(key).sort()
  const sb = b.map(key).sort()
  return sa.every((v, i) => v === sb[i])
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
  createBigOrder,
  createSubOrders,
  games,
  fetchGames,
  updateOrder,
  selectedEvent,
  onAssignUsers,
  editingOrderId,
  canAssignUsers,
  setIsEditing,
  setEditingOrderId,
  initialSubOrders,
  restricted = false,
}: Props) {
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [languageSearch, setLanguageSearch] = useState("")
  // "Apply to all" delivery link — pasting here fills every language's link.
  const [globalDeliveryLink, setGlobalDeliveryLink] = useState("")
  // Which vendor's link set the delivery panel is currently showing.
  const [activeVendor, setActiveVendor] = useState<string>("")

  const vendorGroups = deliveryVendorGroups(
    newOrder.deliveries || [],
    newOrder.notifyPositions || []
  )

  // Keep each (vendor × language) link entry in sync as languages or vendors
  // change, without wiping links the user already typed. Centralised here so the
  // language/vendor pickers only set their own field.
  useEffect(() => {
    const languages = newOrder.targetLanguages || []
    if (languages.length === 0) return
    const groups = deliveryVendorGroups(newOrder.deliveries || [], newOrder.notifyPositions || [])
    const next = reconcileDeliveries(newOrder.deliveries || [], languages, groups)
    if (!sameDeliveries(next, newOrder.deliveries || [])) {
      setNewOrder((o: any) => ({ ...o, deliveries: next }))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    JSON.stringify(newOrder.targetLanguages || []),
    JSON.stringify(newOrder.notifyPositions || []),
  ])

  // Keep the active pill valid as the group set changes.
  useEffect(() => {
    if (!vendorGroups.includes(activeVendor)) setActiveVendor(vendorGroups[0] ?? "")
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vendorGroups.join("|")])
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

  // Clear the "apply to all" delivery link field whenever the modal closes so it
  // never carries a stale value into the next order.
  useEffect(() => {
    if (!showModal) setGlobalDeliveryLink("")
  }, [showModal])

  // Assign users state
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([])
  const [allUsers, setAllUsers] = useState<any[]>([])
  const [isLoadingUsers, setIsLoadingUsers] = useState(false)

  // ── Sub-orders create flow ────────────────────────────────────────────────
  // No tabs/modes: the form is always a normal order. If the user adds one or
  // more sub-orders, it is created as a "big order" (parent + sub-orders);
  // otherwise it is created as a standalone single order.
  // Each sub-order inherits all of the parent's form data; only its title differs.
  // Each sub-order carries its own title + deadline; everything else is
  // inherited from the parent form (newOrder).
  type SubOrderItem = { title: string; deadline: string }
  const [subOrderItems, setSubOrderItems] = useState<SubOrderItem[]>([])

  // Manually re-notify translators that the source file changed. Used when the
  // file behind the same link was swapped, so the link string is unchanged and
  // the automatic "source updated" email never fires.
  const [resendingSource, setResendingSource] = useState(false)
  async function handleResendSourceNotification() {
    if (!editingOrderId || resendingSource) return
    setResendingSource(true)
    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/orders/${editingOrderId}/resend-source-notification`,
        {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ notifyPositions: newOrder.notifyPositions || [] }),
        }
      )
      if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        throw new Error(data?.message || "Failed to resend")
      }
      toast.success("Translators notified that the source file changed")
    } catch (error: any) {
      console.error(error)
      toast.error(error?.message || "Failed to notify translators")
    } finally {
      setResendingSource(false)
    }
  }
  // The order title as it was when the title field gained focus — used to detect
  // a rename so sub-orders auto-named after the old title can follow the new one.
  const titleBeforeEditRef = useRef<string>("")

  // Rename sub-orders that were named "<oldTitle> <n>" to "<newTitle> <n>",
  // leaving custom-named sub-orders untouched.
  function remapSubOrdersForTitle(oldTitle: string, newTitle: string) {
    if (!oldTitle.trim() || oldTitle === newTitle) return
    const re = new RegExp(`^${escapeRegExp(oldTitle)}\\s+(\\d+)$`)
    setSubOrderItems((prev) =>
      prev.map((item) => {
        const m = item.title.match(re)
        return m ? { ...item, title: `${newTitle} ${m[1]}` } : item
      })
    )
  }
  // True once the user actually has sub-orders → create as a big order.
  const hasSubOrders = subOrderItems.some((s) => s.title.trim())

  // Reset the sub-orders flow whenever the modal (re)opens. When duplicating a
  // big order, seed the panel with the copied sub-orders instead of empty.
  useEffect(() => {
    if (showModal) {
      setSubOrderItems(initialSubOrders && initialSubOrders.length ? initialSubOrders : [])
    }
  }, [showModal, isEditing, editingOrderId])

  // While editing, the sub-orders panel is only offered for standalone orders
  // (not already-parent, not themselves a sub-order). Adding sub-orders here
  // promotes the standalone order into a big order.
  const canAddSubOrdersWhileEditing =
    isEditing && !selectedOrder?.isParent && !selectedOrder?.parentId

  // Re-sequence sub-order titles so the trailing number matches the 1-based
  // position, preserving each item's text prefix. Keeps numbering contiguous:
  // add 5 → 1,2,3,4,5; delete the 3rd → 1,2,3,4 (not 1,2,4,5).
  function renumberSubOrders(items: SubOrderItem[]): SubOrderItem[] {
    return items.map((item, i) => {
      const n = i + 1
      const match = item.title.match(/^(.*?)(\d+)\s*$/)
      let prefix = (match ? match[1] : item.title).trim()
      if (!prefix) prefix = (newOrder.title || "").trim() || "Sub-order"
      return { ...item, title: `${prefix} ${n}` }
    })
  }

  function addSubOrder() {
    setSubOrderItems((prev) =>
      renumberSubOrders([
        ...prev,
        // New sub-orders default their deadline to the parent's deadline.
        { title: (newOrder.title || "").trim() || "Sub-order", deadline: newOrder.deadline || "" },
      ])
    )
  }

  function updateSubOrderTitle(index: number, value: string) {
    setSubOrderItems((prev) => prev.map((s, i) => (i === index ? { ...s, title: value } : s)))
  }

  function updateSubOrderDeadline(index: number, value: string) {
    setSubOrderItems((prev) => prev.map((s, i) => (i === index ? { ...s, deadline: value } : s)))
  }

  function removeSubOrder(index: number) {
    setSubOrderItems((prev) => renumberSubOrders(prev.filter((_, i) => i !== index)))
  }

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
      if (!newOrder.contentCategory) e.contentCategory = "Content category is required"
      if (!newOrder.estimatedMinutes || Number(newOrder.estimatedMinutes) <= 0) e.estimatedMinutes = "Estimated minutes is required"
      if (!newOrder.deliveryType) e.deliveryType = "Delivery type is required"
      if (!newOrder.deliveryDate) e.deliveryDate = "Delivery date is required"
      if (!newOrder.deadline) e.deadline = "Deadline is required"
    }
    if (newOrder.type === "MARKETING") {
      if (!newOrder.deadline) e.deadline = "Deadline is required"
    }
    // Delivery format is required for both broadcast and marketing.
    if (!newOrder.deliveryFormats || newOrder.deliveryFormats.length === 0) {
      e.deliveryFormats = "At least one delivery format is required"
    }
    // When a source file is present, at least one notify role must be chosen so
    // the source-ready email has recipients.
    if ((newOrder.sourceFileLink || "").trim() && (!newOrder.notifyPositions || newOrder.notifyPositions.length === 0)) {
      e.notifyPositions = "Select at least one role to notify"
    }
    // A source file needs at least one target language, otherwise translators
    // can't be matched/assigned and no email would be sent.
    if ((newOrder.sourceFileLink || "").trim() && (!newOrder.targetLanguages || newOrder.targetLanguages.length === 0)) {
      e.targetLanguages = "At least one target language is required when a source file is added"
    }
    setErrors(e)
    return Object.keys(e).length === 0
  }

  function buildSubItems() {
    // Sub-orders inherit all shared fields from the parent (newOrder);
    // their title + deadline can differ. Filter out blank titles.
    return subOrderItems
      .filter((s) => s.title.trim())
      .map((s) => ({
        ...newOrder,
        title: s.title.trim(),
        deadline: s.deadline || newOrder.deadline,
      }))
  }

  function handleSubmit() {
    if (!validate()) return
    if (isEditing) {
      // Editing a standalone order and adding sub-orders promotes it into a
      // big order: save the parent's edits first, then create the sub-orders.
      if (canAddSubOrdersWhileEditing && hasSubOrders && createSubOrders && editingOrderId) {
        const subItems = buildSubItems()
        const result = createSubOrders(editingOrderId, subItems)
        if (result && typeof (result as any).then === "function") {
          ;(result as Promise<any>).then(() => updateOrder())
        } else {
          updateOrder()
        }
        return
      }
      updateOrder()
      return
    }
    if (hasSubOrders && createBigOrder) {
      createBigOrder(newOrder, buildSubItems())
      return
    }
    createOrder(newOrder.type === "MARKETING" ? selectedUserIds : [])
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

  notifyPositions: [],
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
    color: "#8b8b93",
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
  className={`bg-[#0C0C0C]/95 border border-white/10 backdrop-blur-2xl rounded-t-3xl sm:rounded-3xl flex flex-col max-h-[95vh] sm:max-h-[90vh] shadow-[0_20px_80px_rgba(0,0,0,0.6)] w-full relative ${
    newOrder.deliveries?.length > 0
      ? "sm:max-w-[1200px]"
      : "sm:max-w-[700px]"
  }`}
>
      {/* HEADER */}
      <div className="flex items-center justify-between px-4 sm:px-8 pt-5 sm:pt-7 pb-4 sm:pb-5 border-b border-white/10 bg-[radial-gradient(ellipse_80%_60%_at_top,rgba(214,179,106,0.08),transparent_70%)] rounded-t-3xl flex-shrink-0">
        <div>
          <p className="text-xs font-semibold tracking-[0.18em] uppercase text-[#D6B36A]/70 mb-1">
            {isEditing ? "Editing" : hasSubOrders ? "New Big Order" : "New Order"}
          </p>
          <h2 className="text-xl font-bold text-gear-gradient w-fit">
            {isEditing ? "Edit Order" : hasSubOrders ? "Create Big Order" : "Create Order"}
          </h2>
        </div>
        <button
          onClick={tryClose}
          className="w-8 h-8 flex items-center justify-center rounded-full bg-white/10 border border-white/10 text-zinc-300 hover:text-white hover:bg-white/20 transition text-sm"
        >
          ✕
        </button>
      </div>
<div className={`flex-1 overflow-auto p-4 sm:p-8 dark-scroll ${restricted ? "[&_input:not([data-ve])]:opacity-50 [&_input:not([data-ve])]:pointer-events-none [&_textarea]:opacity-50 [&_textarea]:pointer-events-none [&_[class*='-control']]:opacity-50 [&_[class*='-control']]:pointer-events-none [&_[class*='-control']]:cursor-not-allowed" : ""}`}>

      {/* {restricted && (
        <div className="mb-5 rounded-2xl border border-cyan-500/30 bg-cyan-500/10 px-4 py-3 text-sm text-cyan-200">
          As a Video Editor you can only edit the <strong>Source File</strong> and <strong>Delivery Links</strong>. All other fields are read-only.
        </div>
      )} */}

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
            onFocus={() => { titleBeforeEditRef.current = newOrder.title }}
            onChange={(e) => { setNewOrder({ ...newOrder, title: e.target.value }); clearError("title") }}
            onBlur={() => remapSubOrdersForTitle(titleBeforeEditRef.current, newOrder.title)}
            placeholder="Enter title"
            className={`w-full bg-white/10 border rounded-2xl px-4 py-3 text-white outline-none transition placeholder:text-white/50 focus:bg-white/15 ${errors.title ? "border-red-500/60 focus:border-red-500" : "border-white/20 focus:border-[#D6B36A]"}`}
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
      placeholder:text-white/50
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

          <Select
            styles={darkSelectStyles}
            isSearchable={false}
            options={[
              { value: "BROADCAST", label: "Broadcast" },
              { value: "MARKETING", label: "Marketing" },
            ]}
            value={{ value: newOrder.type, label: newOrder.type === "BROADCAST" ? "Broadcast" : "Marketing" }}
            onChange={(selected) => {
              const type = selected?.value || "BROADCAST"
              setNewOrder({
                ...newOrder,
                type,
                game: "",
                estimatedMinutes: "",
                deliveryDate: "",
                contentTitle: "",
                // No default delivery format for either type — user must choose.
                deliveryFormats: [],
              })
              setSelectedUserIds([])
              setAllUsers([])
              setErrors({})
            }}
          />
        </div>

        {/* STATUS */}
        <div>
          <label className="text-xs font-medium text-zinc-300 mb-2 block tracking-wide">
            Status
          </label>

          <Select
            styles={darkSelectStyles}
            isSearchable={false}
            options={[
              { value: "PENDING", label: "Pending" },
              { value: "READY_FOR_TRANSLATION", label: "Ready for Translation" },
              { value: "IN_PROGRESS", label: "In Progress" },
              { value: "COMPLETED", label: "Completed" },
            ]}
            value={(() => {
              const s = newOrder.status || "PENDING"
              const label = s === "PENDING" ? "Pending" : s === "READY_FOR_TRANSLATION" ? "Ready for Translation" : s === "IN_PROGRESS" ? "In Progress" : "Completed"
              return { value: s, label }
            })()}
            onChange={(selected) => setNewOrder({ ...newOrder, status: selected?.value || "PENDING" })}
          />
        </div>

        <div>
  <label className="text-xs font-medium text-zinc-300 mb-2 block tracking-wide">
    Priority
  </label>

  <Select
    styles={darkSelectStyles}
    isSearchable={false}
    options={[
      { value: "LOW", label: "Low" },
      { value: "MEDIUM", label: "Medium" },
      { value: "HIGH", label: "High" },
    ]}
    value={(() => {
      const p = newOrder.priority || "MEDIUM"
      return { value: p, label: p === "LOW" ? "Low" : p === "MEDIUM" ? "Medium" : "High" }
    })()}
    onChange={(selected) => setNewOrder({ ...newOrder, priority: selected?.value || "MEDIUM" })}
  />
</div>

{/* CONTENT CATEGORY (broadcast only) — the target turnaround per type. */}
{newOrder.type === "BROADCAST" && (
  <div>
    <label className="text-xs font-medium text-zinc-300 mb-2 block tracking-wide">
      Content Category <span className="text-red-400">*</span>
    </label>
    <Select
      styles={
        errors.contentCategory
          ? { ...darkSelectStyles, control: (b: any) => ({ ...darkSelectStyles.control(b), borderColor: "rgba(239,68,68,0.6)" }) }
          : darkSelectStyles
      }
      isSearchable={false}
      placeholder="Select category"
      options={CONTENT_CATEGORIES.map((c) => ({ value: c.value, label: `${c.label} · ${c.hours}` }))}
      value={(() => {
        const c = CONTENT_CATEGORIES.find((x) => x.value === newOrder.contentCategory)
        return c ? { value: c.value, label: `${c.label} · ${c.hours}` } : null
      })()}
      onChange={(selected: any) => {
        const cat = selected?.value || ""
        const next: any = { ...newOrder, contentCategory: cat }
        // If a source file is already in, choosing the category computes the
        // deadline as now + the category's hours (nearest 5 min). Apply BOTH the
        // date and the time: the computed instant can roll past midnight (e.g.
        // 20:00 + Long Form 8h = 04:00 the NEXT day), so keeping the old date
        // would land the deadline a day early.
        if (cat && (newOrder.sourceFileLink || "").trim()) {
          const auto = autoDeadlineFromNow(cat)
          if (auto) {
            next.deadline = auto.date
            next.deadlineTime = auto.time
          }
        }
        setNewOrder(next)
        clearError("contentCategory")
      }}
    />
    {errors.contentCategory && <p className="text-red-400 text-xs mt-1.5">{errors.contentCategory}</p>}
  </div>
)}

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
                  borderColor: errors.game ? "rgba(239,68,68,0.6)" : "rgba(255,255,255,0.20)",
                }),
              }}
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
              className={`w-full bg-white/10 border rounded-2xl px-4 py-3 text-white outline-none transition placeholder:text-white/50 focus:bg-white/15 ${errors.estimatedMinutes ? "border-red-500/60 focus:border-red-500" : "border-white/20 focus:border-[#D6B36A]"}`}
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
  // Only set the languages — the reconcile effect adds/removes the per-vendor
  // delivery entries and preserves any links already typed.
  setNewOrder({
    ...newOrder,
    targetLanguages: selectedLanguages,
  })
  clearError("targetLanguages")
}}

              placeholder="Search target languages..."
              className="text-sm"
            />
            {errors.targetLanguages && <p className="text-red-400 text-xs mt-1.5">{errors.targetLanguages}</p>}
          </div>

        {/* DELIVERY TYPE (broadcast only) — gates the delivery format below.
            Finished → SRT or Burned In; Raw → locked to SRT. */}
<div>
  <label className="text-xs font-medium text-zinc-300 mb-2 block tracking-wide">
    Delivery Type <span className="text-red-400">*</span>
  </label>
  <Select
    styles={darkSelectStyles}
    options={[{ value: "RAW", label: "Raw" }, { value: "FINISHED", label: "Finished" }]}
    value={newOrder.deliveryType ? { value: newOrder.deliveryType, label: newOrder.deliveryType === "RAW" ? "Raw" : "Finished" } : null}
    placeholder="Select delivery type"
    onChange={(opt: any) => {
      const dt = opt?.value || ""
      if (dt === "RAW") {
        // Raw → SRT only; the format field is locked below.
        const srtLink = newOrder.deliveryFormats?.find((f: any) => f.format === "SRT")?.deliveryLink || ""
        setNewOrder({ ...newOrder, deliveryType: dt, deliveryFormats: [{ format: "SRT", deliveryLink: srtLink }] })
      } else {
        setNewOrder({ ...newOrder, deliveryType: dt, deliveryFormats: [{format:"SRT", deliveryLink: "srtLink"},{format:"BURNED_IN"}] })
      }
      clearError("deliveryType")
      clearError("deliveryFormats")
    }}
  />
  {errors.deliveryType && <p className="text-red-400 text-xs mt-1.5">{errors.deliveryType}</p>}
</div>

        {/* FORMAT */}
<div>
  <label className="text-xs font-medium text-zinc-300 mb-2 block tracking-wide">
    Delivery Format <span className="text-red-400">*</span>
  </label>

<div className={(!newOrder.deliveryType || (newOrder.deliveryType === "RAW" || newOrder.deliveryType === "FINISHED")) ? "opacity-50 cursor-not-allowed" : ""}>
<Select
  isMulti
  isDisabled={!newOrder.deliveryType || (newOrder.deliveryType === "RAW" || newOrder.deliveryType === "FINISHED")}
  styles={darkSelectStyles}
  options={BROADCAST_FORMAT_OPTIONS}
  value={
    newOrder.deliveryFormats?.map(
      (item: any) => ({
        value: item.format,
        label: formatLabel(item.format),
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
    clearError("deliveryFormats")
  }}
/>
</div>
{errors.deliveryFormats && <p className="text-red-400 text-xs mt-1.5">{errors.deliveryFormats}</p>}
</div>

          {/* SOURCE FILE */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-medium text-zinc-300 block tracking-wide">
                Source File
              </label>
              {/* Resend email when the file behind an unchanged link was swapped. */}
              {isEditing && editingOrderId && (newOrder.sourceFileLink || "").trim() && (
                <button
                  type="button"
                  onClick={handleResendSourceNotification}
                  disabled={resendingSource}
                  title="Email translators that the source file has changed (use when the link is the same but the file was replaced)"
                  className="text-xs font-medium text-[#D6B36A] hover:text-[#e8c987] disabled:opacity-50 disabled:cursor-not-allowed transition inline-flex items-center gap-1.5"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  {resendingSource ? "Sending…" : "Resend email"}
                </button>
              )}
            </div>

            <input
            data-ve
            type="url"
              value={
                newOrder.sourceFileLink
              }
              onChange={(e) => {
                const val = e.target.value
                const next: any = { ...newOrder, sourceFileLink: val }
                // Adding a source file (empty → set) auto-computes the deadline
                // TIME from now + the content category's hours (nearest 5 min).
                // The chosen deadline DATE is kept (filled with the computed date
                // only if none was picked yet).
                const becameSet = !(newOrder.sourceFileLink || "").trim() && val.trim() !== ""
                if (becameSet && newOrder.contentCategory) {
                  const auto = autoDeadlineFromNow(newOrder.contentCategory)
                  if (auto) {
                    // Both date and time — the window can cross midnight.
                    next.deadline = auto.date
                    next.deadlineTime = auto.time
                  }
                }
                setNewOrder(next)
              }}
              className="w-full bg-white/10 border border-white/20 rounded-2xl px-4 py-3 text-white outline-none focus:border-[#D6B36A] focus:bg-white/15 transition placeholder:text-white/50"
            />

            {/* NOTIFY ROLES — appears once a source file is set. Chooses which
                roles receive the "source ready/updated" email. Required (≥1). */}
            {(newOrder.sourceFileLink || "").trim() && (
              <div className="mt-3">
                <label className="text-xs font-medium text-zinc-300 mb-2 block tracking-wide">
                  Notify <span className="text-red-400">*</span>
                  <span className="text-zinc-600 ml-1">(who gets the source-file email)</span>
                </label>
                <div className="flex gap-2">
                  {NOTIFY_POSITION_OPTIONS.map((opt) => {
                    const selected = (newOrder.notifyPositions || []).includes(opt.value)
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => {
                          const current: string[] = newOrder.notifyPositions || []
                          const nextPositions = selected
                            ? current.filter((p) => p !== opt.value)
                            : [...current, opt.value]
                          setNewOrder({ ...newOrder, notifyPositions: nextPositions })
                          clearError("notifyPositions")
                        }}
                        className={`flex-1 text-center px-3 py-1.5 rounded-full text-sm font-medium border transition whitespace-nowrap ${
                          selected
                            ? "gear-fill border-transparent"
                            : "bg-white/5 border-white/20 text-zinc-300 hover:border-[#D6B36A]/50 hover:text-white"
                        }`}
                      >
                        {opt.label}
                      </button>
                    )
                  })}
                </div>
                {errors.notifyPositions && <p className="text-red-400 text-xs mt-1.5">{errors.notifyPositions}</p>}
              </div>
            )}
          </div>

          {/* SRT AVAILABLE LINK */}
          <div>
            <label className="text-xs font-medium text-zinc-300 mb-2 block tracking-wide">
              SRT Available Link
              <span className="text-zinc-600 text-xs ml-1">(optional)</span>
            </label>
            <input
              data-ve
              type="url"
              value={newOrder.srtAvailableLink || ""}
              onChange={(e) =>
                setNewOrder({
                  ...newOrder,
                  srtAvailableLink: e.target.value,
                })
              }
              placeholder="Paste SRT link..."
              className="w-full bg-white/10 border border-white/20 rounded-2xl px-4 py-3 text-white outline-none focus:border-[#D6B36A] focus:bg-white/15 transition placeholder:text-white/50"
            />
          </div>

          {/* DELIVERY DATE */}
          <div>
            <label className="text-xs font-medium text-zinc-300 mb-2 block tracking-wide">
              Delivery Date (Shoot Date)<span className="text-red-400">*</span>
            </label>
            <DatePicker
              selected={fromYMD(newOrder.deliveryDate)}
              onChange={(date: Date | null) => { setNewOrder({ ...newOrder, deliveryDate: toYMD(date) }); clearError("deliveryDate") }}
              minDate={today}
              dateFormat="yyyy-MM-dd"
              placeholderText="Select delivery date"
              wrapperClassName="w-full"
              className={`w-full bg-white/10 border rounded-2xl px-4 py-3 text-white outline-none focus:border-[#D6B36A] focus:bg-white/15 transition placeholder:text-white/50 ${errors.deliveryDate ? "border-red-500/60" : "border-white/20"}`}
            />
            {errors.deliveryDate && <p className="text-red-400 text-xs mt-1.5">{errors.deliveryDate}</p>}
          </div>

          {/* DEADLINE — supports an optional time-of-day */}
          <div>
            <label className="text-xs font-medium text-zinc-300 mb-2 block tracking-wide">
              Deadline <span className="text-red-400">*</span>
              {/*<span className="text-zinc-600 ml-1">(time optional — shown in each viewer's timezone)</span>*/}
            </label>
            <div className="flex gap-2">
              <DatePicker
                selected={fromYMD(newOrder.deadline)}
                onChange={(date: Date | null) => {
                  const newDeadline = toYMD(date)
                  // When both a source file and a content category are set, changing
                  // the deadline date recalculates the time (now + category hours).
                  const bothSet = !!(newOrder.sourceFileLink || "").trim() && !!newOrder.contentCategory
                  let deadlineTime: string
                  if (bothSet) {
                    deadlineTime = autoDeadlineFromNow(newOrder.contentCategory)?.time || newOrder.deadlineTime
                  } else {
                    const timeStillValid =
                      !!newOrder.deadlineTime &&
                      buildTimeOptions(newDeadline).some((o) => o.value === newOrder.deadlineTime)
                    deadlineTime = timeStillValid ? newOrder.deadlineTime : ""
                  }
                  setNewOrder({ ...newOrder, deadline: newDeadline, deadlineTime })
                  clearError("deadline")
                }}
                minDate={today}
                dateFormat="yyyy-MM-dd"
                placeholderText="Select date"
                wrapperClassName="flex-1"
                className={`w-full bg-white/10 border rounded-2xl px-4 py-3 text-white outline-none focus:border-[#D6B36A] focus:bg-white/15 transition placeholder:text-white/50 ${errors.deadline ? "border-red-500/60" : "border-white/20"}`}
              />
              <div className="w-[140px] flex-shrink-0">
                <Select
                  value={newOrder.deadlineTime ? { value: newOrder.deadlineTime, label: newOrder.deadlineTime } : null}
                  onChange={(opt: any) => setNewOrder({ ...newOrder, deadlineTime: opt?.value || "" })}
                  options={buildTimeOptions(newOrder.deadline)}
                  styles={darkSelectStyles}
                  isClearable
                  menuPlacement="auto"
                  placeholder="Time"
                  className="text-sm"
                />
              </div>
            </div>
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

  <Select
    styles={darkSelectStyles}
    isSearchable
    placeholder="Select content"
    options={CONTENT_TITLES.map((t) => ({ value: t, label: t }))}
    value={newOrder.contentTitle ? { value: newOrder.contentTitle, label: newOrder.contentTitle } : null}
    onChange={(selected) => setNewOrder({ ...newOrder, contentTitle: selected?.value || "" })}
  />

</div>

      {/* SIZE / RATIO */}
      <div className="col-span-full">
        <label className="text-xs font-medium text-zinc-300 mb-2 block tracking-wide">
          Size / Ratio
        </label>
        <div className="flex flex-wrap gap-2">
          {MARKETING_ASPECT_RATIOS.map((r) => {
            const active = (newOrder.aspectRatios || []).includes(r)
            return (
              <button
                key={r}
                type="button"
                onClick={() =>
                  setNewOrder({
                    ...newOrder,
                    aspectRatios: active
                      ? (newOrder.aspectRatios || []).filter((x: string) => x !== r)
                      : [...(newOrder.aspectRatios || []), r],
                  })
                }
                className={`px-4 py-2 rounded-xl border text-sm font-semibold transition ${
                  active
                    ? "gear-fill border-transparent text-black"
                    : "bg-white/10 border-white/20 text-zinc-300 hover:border-[#D6B36A]/60 hover:text-white"
                }`}
              >
                {r}
              </button>
            )
          })}
        </div>
      </div>

      {/* FORMAT */}
      <div>
        <label className="text-xs font-medium text-zinc-300 mb-2 block tracking-wide">
          Delivery Format <span className="text-red-400">*</span>
        </label>

      <Select
  isMulti
  styles={darkSelectStyles}
  options={MARKETING_FORMAT_OPTIONS}
  value={
    newOrder.deliveryFormats?.map(
      (item: any) => ({
        value: item.format,
        label: formatLabel(item.format),
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
    clearError("deliveryFormats")
  }}
/>
{errors.deliveryFormats && <p className="text-red-400 text-xs mt-1.5">{errors.deliveryFormats}</p>}
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
      // Reconcile effect handles the per-vendor delivery entries.
      setNewOrder({
        ...newOrder,
        targetLanguages: selectedLanguages,
      })
      clearError("targetLanguages")
    }}

    placeholder="Search target languages..."

    className="text-sm"
  />
  {errors.targetLanguages && <p className="text-red-400 text-xs mt-1.5">{errors.targetLanguages}</p>}

</div>

      {/* SOURCE FILE */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-xs font-medium text-zinc-300 block tracking-wide">
            Source File
          </label>
          {/* Resend email when the file behind an unchanged link was swapped. */}
          {isEditing && editingOrderId && (newOrder.sourceFileLink || "").trim() && (
            <button
              type="button"
              onClick={handleResendSourceNotification}
              disabled={resendingSource}
              title="Email translators that the source file has changed (use when the link is the same but the file was replaced)"
              className="text-xs font-medium text-[#D6B36A] hover:text-[#e8c987] disabled:opacity-50 disabled:cursor-not-allowed transition inline-flex items-center gap-1.5"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              {resendingSource ? "Sending…" : "Resend email"}
            </button>
          )}
        </div>

        <input
        data-ve
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
          className="w-full bg-white/10 border border-white/20 rounded-2xl px-4 py-3 text-white outline-none focus:border-[#D6B36A] focus:bg-white/15 transition placeholder:text-white/50"
        />

        {/* NOTIFY ROLES — required (≥1) once a source file is set. */}
        {(newOrder.sourceFileLink || "").trim() && (
          <div className="mt-3">
            <label className="text-xs font-medium text-zinc-300 mb-2 block tracking-wide">
              Notify <span className="text-red-400">*</span>
              <span className="text-zinc-600 ml-1">(who gets the source-file email)</span>
            </label>
            <div className="flex gap-2">
              {NOTIFY_POSITION_OPTIONS.map((opt) => {
                const selected = (newOrder.notifyPositions || []).includes(opt.value)
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => {
                      const current: string[] = newOrder.notifyPositions || []
                      const nextPositions = selected
                        ? current.filter((p) => p !== opt.value)
                        : [...current, opt.value]
                      setNewOrder({ ...newOrder, notifyPositions: nextPositions })
                      clearError("notifyPositions")
                    }}
                    className={`px-4 py-2 rounded-full text-sm font-medium border transition ${
                      selected
                        ? "bg-[#D6B36A] border-[#D6B36A] text-black"
                        : "bg-white/5 border-white/20 text-zinc-300 hover:border-[#D6B36A]/50 hover:text-white"
                    }`}
                  >
                    {opt.label}
                  </button>
                )
              })}
            </div>
            {errors.notifyPositions && <p className="text-red-400 text-xs mt-1.5">{errors.notifyPositions}</p>}
          </div>
        )}
      </div>

      {/* SRT AVAILABLE LINK */}
      <div>
        <label className="text-xs font-medium text-zinc-300 mb-2 block tracking-wide">
          SRT Available Link
          <span className="text-zinc-600 text-xs ml-1">(optional)</span>
        </label>
        <input
          data-ve
          type="url"
          value={newOrder.srtAvailableLink || ""}
          onChange={(e) =>
            setNewOrder({
              ...newOrder,
              srtAvailableLink: e.target.value,
            })
          }
          placeholder="Paste SRT link..."
          className="w-full bg-white/10 border border-white/20 rounded-2xl px-4 py-3 text-white outline-none focus:border-[#D6B36A] focus:bg-white/15 transition placeholder:text-white/50"
        />
      </div>

       {/* DEADLINE — marketing supports an optional time-of-day */}
          <div>
            <label className="text-xs font-medium text-zinc-300 mb-2 block tracking-wide">
              Deadline <span className="text-red-400">*</span>
              <span className="text-zinc-600 ml-1">(time optional — shown in each viewer's timezone)</span>
            </label>
            <div className="flex gap-2">
              <DatePicker
                selected={fromYMD(newOrder.deadline)}
                onChange={(date: Date | null) => {
                  const newDeadline = toYMD(date)
                  // If the chosen time is no longer valid for the new date (e.g.
                  // switching to today where it's already passed), reset it.
                  const timeStillValid =
                    !!newOrder.deadlineTime &&
                    buildTimeOptions(newDeadline).some((o) => o.value === newOrder.deadlineTime)
                  setNewOrder({ ...newOrder, deadline: newDeadline, deadlineTime: timeStillValid ? newOrder.deadlineTime : "" })
                  clearError("deadline")
                }}
                minDate={today}
                dateFormat="yyyy-MM-dd"
                placeholderText="Select date"
                wrapperClassName="flex-1"
                className={`w-full bg-white/10 border rounded-2xl px-4 py-3 text-white outline-none focus:border-[#D6B36A] focus:bg-white/15 transition placeholder:text-white/50 ${errors.deadline ? "border-red-500/60" : "border-white/20"}`}
              />
              <div className="w-[140px] flex-shrink-0">
                <Select
                  value={newOrder.deadlineTime ? { value: newOrder.deadlineTime, label: newOrder.deadlineTime } : null}
                  onChange={(opt: any) => setNewOrder({ ...newOrder, deadlineTime: opt?.value || "" })}
                  options={buildTimeOptions(newOrder.deadline)}
                  styles={darkSelectStyles}
                  isClearable
                  menuPlacement="auto"
                  placeholder="Time"
                  className="text-sm"
                />
              </div>
            </div>
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
          className="w-full bg-white/10 border border-white/20 rounded-2xl px-4 py-3 text-white outline-none focus:border-[#D6B36A] focus:bg-white/15 transition placeholder:text-white/50"
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
        {vendorGroups.length > 1
          ? "Each vendor has its own links — switch with the pills below"
          : "Manage language and format links"}
      </p>

      {/* VENDOR PILLS — one per vendor with its own delivery links. Only shown
          when more than one group exists (i.e. vendors were selected). */}
      {vendorGroups.length > 1 && (
        <div className="flex flex-wrap gap-2 mt-4">
          {vendorGroups.map((v) => (
            <button
              key={v || "general"}
              type="button"
              data-ve
              onClick={() => setActiveVendor(v)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition ${
                activeVendor === v
                  ? "gear-fill border-transparent"
                  : "border-white/15 text-zinc-300 hover:border-[#D6B36A]/50 hover:text-white"
              }`}
            >
              {VENDOR_LABELS[v] ?? v}
            </button>
          ))}
        </div>
      )}

      {/* APPLY-TO-ALL — fills every language's link FOR THE ACTIVE VENDOR. */}
      {newOrder.deliveries?.some((d: any) => delVendor(d) === activeVendor) && (
        <div className="mt-4">
          <label className="block text-xs text-zinc-400 mb-1.5">
            Apply one link to all languages
            {vendorGroups.length > 1 ? ` (${VENDOR_LABELS[activeVendor] ?? activeVendor})` : ""}
          </label>
          <div className="flex items-center gap-2">
            <input
              data-ve
              type="url"
              value={globalDeliveryLink}
              onChange={(e) => {
                const link = e.target.value
                setGlobalDeliveryLink(link)
                setNewOrder({
                  ...newOrder,
                  deliveries: newOrder.deliveries.map((d: any) =>
                    delVendor(d) === activeVendor ? { ...d, deliveryLink: link } : d
                  ),
                })
              }}
              placeholder="Paste a link to fill every language..."
              className="flex-1 min-w-0 bg-white/10 border border-white/20 rounded-xl px-4 py-2.5 text-white text-sm outline-none focus:border-[#D6B36A] focus:bg-white/15 transition placeholder:text-white/50"
            />
            <button
              type="button"
              data-ve
              onClick={() => {
                setGlobalDeliveryLink("")
                setNewOrder({
                  ...newOrder,
                  deliveries: newOrder.deliveries.map((d: any) =>
                    delVendor(d) === activeVendor ? { ...d, deliveryLink: "" } : d
                  ),
                })
              }}
              title="Clear these delivery links"
              className="flex-shrink-0 w-9 h-9 inline-flex items-center justify-center rounded-lg border border-white/10 text-zinc-400 hover:text-red-400 hover:border-red-400/40 hover:bg-red-400/10 transition"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </div>

    <div className="space-y-4 max-h-[650px] overflow-auto pr-1 dark-scroll">

      {newOrder.deliveries
        .filter((d: any) => delVendor(d) === activeVendor)
        .map(
        (
          delivery: any
        ) => (
          <div
            key={
              (delivery.vendor || "") + "::" + delivery.language
            }
            className="bg-white/[0.03] border border-white/10 rounded-2xl p-4"
          >

            <p className="text-sm font-medium mb-3">
              {
                delivery.language
              }
            </p>

            <input
            data-ve
            type="url"
              value={
                delivery.deliveryLink || ""
              }
              onChange={(e) => {
                const link = e.target.value
                // Update the matching entry by vendor+language (indices shift
                // once the list is filtered to the active vendor).
                setNewOrder({
                  ...newOrder,
                  deliveries: newOrder.deliveries.map((d: any) =>
                    delVendor(d) === delVendor(delivery) && d.language === delivery.language
                      ? { ...d, deliveryLink: link }
                      : d
                  ),
                })
              }}

              placeholder="Paste delivery link..."

              className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white outline-none focus:border-[#D6B36A] focus:bg-white/15 transition placeholder:text-white/50"
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
            className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white outline-none focus:border-[#D6B36A] focus:bg-white/15 transition placeholder:text-white/50"
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

{/* SUB ORDERS PANEL — shown when creating, or when editing a standalone order
    (adding sub-orders here promotes it into a big order). */}
{!restricted && (!isEditing || canAddSubOrdersWhileEditing) && (
  <div className="mt-6 bg-[radial-gradient(circle_at_top,rgba(214,179,106,0.06),transparent_60%)] bg-white/[0.04] border border-white/10 rounded-[28px] p-6 shadow-[0_8px_40px_rgba(0,0,0,0.35)]">
    <div className="flex items-center justify-between mb-2">
      <div>
        <h3 className="text-lg font-semibold text-gear-gradient w-fit">Sub Orders</h3>
        <span className="text-xs text-zinc-500">optional</span>
      </div>
      <span className="text-xs text-zinc-500">{subOrderItems.length} sub-order{subOrderItems.length === 1 ? "" : "s"}</span>
    </div>
    <p className="text-xs text-zinc-500 mb-5">
      {canAddSubOrdersWhileEditing
        ? "Add sub-orders to turn this into a big order. Each copies the fields above — just set its title and deadline."
        : "Add sub-orders to create a big order. Each copies the fields above — just set its title and deadline."}
    </p>

    <div className="space-y-3">
      {subOrderItems.map((item, index) => (
        <div key={index} className="flex items-end gap-3">
          <span className="text-xs text-zinc-500 w-6 flex-shrink-0 pb-2.5">{index + 1}.</span>
          <div className="flex-1 min-w-0">
            <label className="block text-[11px] font-medium text-zinc-400 mb-1">Sub-order title</label>
            <input
              value={item.title}
              onChange={(e) => updateSubOrderTitle(index, e.target.value)}
              placeholder="Sub-order title"
              className="w-full min-w-0 bg-white/10 border border-white/20 rounded-xl px-4 py-2.5 text-white outline-none focus:border-[#D6B36A] focus:bg-white/15 transition placeholder:text-white/50"
            />
          </div>
          <div className="flex-shrink-0 w-[150px]">
            <label className="block text-[11px] font-medium text-zinc-400 mb-1">Deadline date</label>
            <DatePicker
              selected={fromYMD(item.deadline)}
              onChange={(date: Date | null) => updateSubOrderDeadline(index, toYMD(date))}
              minDate={today}
              dateFormat="yyyy-MM-dd"
              placeholderText="Deadline"
              wrapperClassName="w-[150px]"
              className="w-[150px] bg-white/10 border border-white/20 rounded-xl px-3 py-2.5 text-white text-sm outline-none focus:border-[#D6B36A] focus:bg-white/15 transition placeholder:text-white/50"
            />
          </div>
          <button
            type="button"
            onClick={() => removeSubOrder(index)}
            className="w-9 h-9 flex items-center justify-center rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 transition flex-shrink-0"
            title="Remove sub-order"
          >
            ✕
          </button>
        </div>
      ))}
    </div>

    <button
      type="button"
      onClick={addSubOrder}
      className="mt-4 w-full py-2.5 rounded-xl border border-dashed border-[#D6B36A]/40 text-[#D6B36A] text-sm font-medium hover:bg-[#D6B36A]/10 transition"
    >
      + Add sub-order
    </button>

    {subOrderItems.length === 0 && (
      <p className="text-xs text-zinc-500 mt-3 text-center">
        {canAddSubOrdersWhileEditing
          ? "No sub-orders — this will stay a normal single order."
          : "No sub-orders — this will be created as a normal single order."}
      </p>
    )}
  </div>
)}

</div>
{/* BUTTONS */}
<div className="border-t border-white/10 bg-white/[0.02] p-6 rounded-b-3xl flex-shrink-0">

  {(() => {
    // While editing, allow submit when the form is dirty OR when sub-orders are
    // being added (promoting a standalone order into a big order).
    const editSubmitBlocked = isEditing && !isDirty && !(canAddSubOrdersWhileEditing && hasSubOrders)
    const submitDisabled = isSavingOrder || editSubmitBlocked
    return (
  <button
    disabled={submitDisabled}
    onClick={handleSubmit}
    onMouseMove={gearWarp}
    className={`w-full py-3.5 rounded-2xl font-semibold transition ${
      submitDisabled
        ? "bg-[#1A1A1A] text-zinc-600 cursor-not-allowed border border-[#2A2A2A]"
        : "btn-gear"
    }`}
  >
    {isSavingOrder
      ? isEditing
        ? canAddSubOrdersWhileEditing && hasSubOrders
          ? "Saving..."
          : "Saving Changes..."
        : hasSubOrders
        ? "Creating Big Order..."
        : "Creating Order..."
      : isEditing
      ? canAddSubOrdersWhileEditing && hasSubOrders
        ? "Save & Add Sub-Orders"
        : "Save Changes"
      : hasSubOrders
      ? "Create Big Order"
      : "Create Order"}
  </button>
    )
  })()}

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