import { useState, useCallback } from "react"
import {
  LANGUAGES,
  type Language,
} from "../../constants/languages"
import Select from "react-select"
import { motion, AnimatePresence } from "framer-motion"
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

  createOrder: () => void

  updateOrder: () => void
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
}: Props) {
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [languageSearch, setLanguageSearch] = useState("")

  const clearError = useCallback((field: string) => {
    setErrors((prev) => { const next = { ...prev }; delete next[field]; return next })
  }, [])

  function validate() {
    const e: Record<string, string> = {}
    if (!newOrder.title?.trim()) e.title = "Order title is required"
    if (newOrder.type === "BROADCAST") {
      if (!newOrder.game) e.game = "Game is required"
      if (!newOrder.estimatedMinutes || Number(newOrder.estimatedMinutes) <= 0) e.estimatedMinutes = "Estimated minutes is required"
      if (!newOrder.deliveryDate) e.deliveryDate = "Delivery date is required"
      if (!newOrder.deadline) e.deadline = "Deadline is required"
    }
    setErrors(e)
    return Object.keys(e).length === 0
  }

  function handleSubmit() {
    if (!validate()) return
    if (isEditing) updateOrder()
    else createOrder()
  }

  if (!showModal) {
    return null
  }
  function handleClose() {
  setShowModal(false)

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

  estimatedMinutes: "",

  deliveryDate: "",

  deliveries: [],
})
}

  const darkSelectStyles = {
  control: (base: any) => ({
    ...base,
    backgroundColor: "#000000",
    borderColor: "#3f3f46",
    minHeight: 52,
    borderRadius: 16,
    boxShadow: "none",

    ":hover": {
      borderColor: "#52525b",
    },
  }),

  menu: (base: any) => ({
    ...base,
    backgroundColor: "#09090b",
    border: "1px solid #27272a",
    borderRadius: 16,
    overflow: "hidden",
    zIndex: 9999,
  }),

  menuList: (base: any) => ({
    ...base,
    backgroundColor: "#09090b",
    padding: 8,
  }),

  option: (
    base: any,
    state: any
  ) => ({
    ...base,
    backgroundColor: state.isFocused
      ? "#18181b"
      : "#09090b",
    color: "white",
    borderRadius: 10,
    cursor: "pointer",
    fontSize: 14,
    marginBottom: 4,
  }),

  multiValue: (base: any) => ({
    ...base,
    backgroundColor: "#18181b",
    border: "1px solid #27272a",
    borderRadius: 10,
    paddingLeft: 4,
  }),

  multiValueLabel: (
    base: any
  ) => ({
    ...base,
    color: "white",
    fontSize: 12,
    fontWeight: 500,
  }),

  multiValueRemove: (
    base: any
  ) => ({
    ...base,
    color: "#a1a1aa",

    ":hover": {
      backgroundColor: "#27272a",
      color: "white",
    },
  }),

  input: (base: any) => ({
    ...base,
    color: "white",
  }),

  placeholder: (
    base: any
  ) => ({
    ...base,
    color: "#71717a",
  }),

  singleValue: (
    base: any
  ) => ({
    ...base,
    color: "white",
  }),
}

const today = new Date()

today.setHours(0, 0, 0, 0)


  return (
      <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
<motion.div
  layout
  transition={{
  layout: {
    duration: 0.6,
    ease: [0.22, 1, 0.36, 1],
  },
}}
  className={`bg-[#0E0E0E] border border-zinc-800 rounded-3xl flex flex-col max-h-[90vh] ${
    newOrder.deliveries?.length > 0 ||
    newOrder.deliveryFormats?.length > 0
      ? "w-[1200px]"
      : "w-[700px]"
  }`}
>
      {/* HEADER */}
      <div className="flex items-center justify-between px-8 pt-8 pb-5 border-b border-zinc-800">
        <h2 className="text-2xl font-bold">
  {isEditing
    ? "Edit Order"
    : "Create Order"}
</h2>

        <button
          onClick={handleClose}
          className="text-zinc-500 hover:text-white transition"
        >
          ✕
        </button>
      </div>
<div className="flex-1 overflow-auto p-8">
      {/* FORM */}
  {/* FORM */}
<div
  className={`grid gap-6 ${
    newOrder.deliveries?.length > 0 ||
    newOrder.deliveryFormats?.length > 0
      ? "grid-cols-[1fr_380px]"
      : "grid-cols-1"
  }`}
>

  {/* LEFT SIDE */}
  <div className="space-y-6">

    {/* GENERAL */}
    <div className="bg-zinc-900/50 border border-zinc-800 rounded-3xl p-6">

      <h3 className="text-lg font-semibold mb-5">
        General Information
      </h3>

      <div className="grid grid-cols-2 gap-4">

        {/* TITLE */}
        <div className="col-span-2">
          <label className="text-sm text-zinc-400 mb-2 block">
            Order Title <span className="text-red-400">*</span>
          </label>
          <input
            value={newOrder.title}
            onChange={(e) => { setNewOrder({ ...newOrder, title: e.target.value }); clearError("title") }}
            placeholder="Enter title"
            className={`w-full bg-black border rounded-2xl px-4 py-3 outline-none transition ${errors.title ? "border-red-500/60 focus:border-red-500" : "border-zinc-700 focus:border-[#D6B36A]"}`}
          />
          {errors.title && <p className="text-red-400 text-xs mt-1.5">{errors.title}</p>}
        </div>

        {/* NOTES */}
<div className="col-span-2">
  <label className="text-sm text-zinc-400 mb-2 block">
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
      bg-black
      border
      border-zinc-700
      rounded-2xl
      px-4
      py-3
      resize-none
      outline-none
      focus:border-[#D6B36A]
      transition
    "
  />
</div>

        {/* TYPE */}
        <div>
          <label className="text-sm text-zinc-400 mb-2 block">
            Order Type
          </label>

          <select
            value={newOrder.type}
            onChange={(e) => {
              const type = e.target.value
              setNewOrder({
                ...newOrder,
                type,
                sourceLanguage: [],
                targetLanguages: [],
                deliveries: [],
                deliveryFormats: [],
                game: "",
                estimatedMinutes: "",
                deadline: "",
                deliveryDate: "",
                contentTitle: "",
              })
              setErrors({})
            }}
            className="w-full bg-black border border-zinc-700 rounded-2xl px-4 py-3"
          >
            <option value="BROADCAST">Broadcast</option>
            <option value="MARKETING">Marketing</option>
          </select>
        </div>

        {/* STATUS */}
        <div>
          <label className="text-sm text-zinc-400 mb-2 block">
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
            className="w-full bg-black border border-zinc-700 rounded-2xl px-4 py-3"
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
  <label className="text-sm text-zinc-400 mb-2 block">
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
    className="w-full bg-black border border-zinc-700 rounded-2xl px-4 py-3"
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
      <div className="bg-zinc-900/50 border border-zinc-800 rounded-3xl p-6">

        <h3 className="text-lg font-semibold mb-5">
          Broadcast Details
        </h3>

        <div className="grid grid-cols-2 gap-4">

          {/* GAME */}
          <div>
            <label className="text-sm text-zinc-400 mb-2 block">
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
            <label className="text-sm text-zinc-400 mb-2 block">
              Estimated Minutes <span className="text-red-400">*</span>
            </label>
            <input
              type="number"
              value={newOrder.estimatedMinutes}
              onChange={(e) => { setNewOrder({ ...newOrder, estimatedMinutes: e.target.value }); clearError("estimatedMinutes") }}
              className={`w-full bg-black border rounded-2xl px-4 py-3 outline-none transition ${errors.estimatedMinutes ? "border-red-500/60 focus:border-red-500" : "border-zinc-700 focus:border-[#D6B36A]"}`}
            />
            {errors.estimatedMinutes && <p className="text-red-400 text-xs mt-1.5">{errors.estimatedMinutes}</p>}
          </div>

          {/* SOURCE LANGUAGES */}
          <div className="col-span-2">
            <label className="text-sm text-zinc-400 mb-2 block">
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
          <div className="col-span-2">
            <label className="text-sm text-zinc-400 mb-2 block">
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
  <label className="text-sm text-zinc-400 mb-2 block">
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
            <label className="text-sm text-zinc-400 mb-2 block">
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
              className="w-full bg-black border border-zinc-700 rounded-2xl px-4 py-3"
            />
          </div>

          {/* DELIVERY DATE */}
          <div>
            <label className="text-sm text-zinc-400 mb-2 block">
              Delivery Date <span className="text-red-400">*</span>
            </label>
            <DatePicker
              selected={newOrder.deliveryDate ? new Date(newOrder.deliveryDate) : null}
              onChange={(date: Date | null) => { setNewOrder({ ...newOrder, deliveryDate: date?.toISOString().split("T")[0] || "" }); clearError("deliveryDate") }}
              minDate={today}
              dateFormat="yyyy-MM-dd"
              placeholderText="Select delivery date"
              className={`w-full bg-black border rounded-2xl px-4 py-3 outline-none text-white ${errors.deliveryDate ? "border-red-500/60" : "border-zinc-700"}`}
            />
            {errors.deliveryDate && <p className="text-red-400 text-xs mt-1.5">{errors.deliveryDate}</p>}
          </div>

          {/* DEADLINE */}
          <div>
            <label className="text-sm text-zinc-400 mb-2 block">
              Deadline <span className="text-red-400">*</span>
            </label>
            <DatePicker
              selected={newOrder.deadline ? new Date(newOrder.deadline) : null}
              onChange={(date: Date | null) => { setNewOrder({ ...newOrder, deadline: date?.toISOString().split("T")[0] || "" }); clearError("deadline") }}
              minDate={today}
              dateFormat="yyyy-MM-dd"
              placeholderText="Select deadline"
              className={`w-full bg-black border rounded-2xl px-4 py-3 outline-none text-white ${errors.deadline ? "border-red-500/60" : "border-zinc-700"}`}
            />
            {errors.deadline && <p className="text-red-400 text-xs mt-1.5">{errors.deadline}</p>}
          </div>

        </div>

      </div>
    )}

{/* MARKETING */}
{newOrder.type ===
  "MARKETING" && (
  <div className="bg-zinc-900/50 border border-zinc-800 rounded-3xl p-6">

    <h3 className="text-lg font-semibold mb-5">
      Marketing Details
    </h3>

    <div className="grid grid-cols-2 gap-4">

      {/* CONTENT TITLE */}
<div className="col-span-2">

  <label className="text-sm text-zinc-400 mb-2 block">
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
      bg-black
      border
      border-zinc-700
      rounded-2xl
      px-4
      py-3
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
        <label className="text-sm text-zinc-400 mb-2 block">
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
<div className="col-span-2">

  <label className="text-sm text-zinc-400 mb-2 block">
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
<div className="col-span-2">

  <label className="text-sm text-zinc-400 mb-2 block">
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
        <label className="text-sm text-zinc-400 mb-2 block">
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
          className="w-full bg-black border border-zinc-700 rounded-2xl px-4 py-3"
        />
      </div>

       {/* DEADLINE */}
          <div>
            <label className="text-sm text-zinc-400 mb-2 block">
              Deadline <span className="text-red-400">*</span>
            </label>
            <DatePicker
              selected={newOrder.deadline ? new Date(newOrder.deadline) : null}
              onChange={(date: Date | null) => { setNewOrder({ ...newOrder, deadline: date?.toISOString().split("T")[0] || "" }); clearError("deadline") }}
              minDate={today}
              dateFormat="yyyy-MM-dd"
              placeholderText="Select deadline"
              className={`w-full bg-black border rounded-2xl px-4 py-3 outline-none text-white ${errors.deadline ? "border-red-500/60" : "border-zinc-700"}`}
            />
            {errors.deadline && <p className="text-red-400 text-xs mt-1.5">{errors.deadline}</p>}
          </div>

      {/* DELIVERED LINK
      <div className="col-span-2">
        <label className="text-sm text-zinc-400 mb-2 block">
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
          className="w-full bg-black border border-zinc-700 rounded-2xl px-4 py-3"
        />
      </div> */}

    </div>

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

  className="bg-zinc-900/50 border border-zinc-800 rounded-3xl p-6 flex flex-col h-fit sticky top-0"
>

    <div className="mb-5">
      <h3 className="text-lg font-semibold">
        Delivery Assets
      </h3>

      <p className="text-sm text-zinc-500 mt-1">
        Manage language and format links
      </p>
    </div>

    <div className="space-y-4 max-h-[650px] overflow-auto pr-1">

      {newOrder.deliveries.map(
        (
          delivery: any,
          index: number
        ) => (
          <div
            key={
              delivery.language
            }
            className="bg-zinc-950 border border-zinc-800 rounded-2xl p-4"
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

              className="w-full bg-black border border-zinc-700 rounded-xl px-4 py-3 outline-none"
            />

          </div>
        )
      )}

      {/* FORMAT DELIVERY LINKS */}
{newOrder.deliveryFormats
  ?.length > 0 && (
  <div className="mt-8">

    <div className="mb-5">

      <h3 className="text-lg font-semibold">
        Format Links
      </h3>

      <p className="text-sm text-zinc-500 mt-1">
        Add links for each format
      </p>

    </div>

    <div className="space-y-4">

      {newOrder.deliveryFormats.map(
        (
          formatItem: any,
          index: number
        ) => (
          <div
            key={formatItem.format}
            className="
              bg-zinc-950
              border
              border-zinc-800
              rounded-2xl
              p-4
            "
          >

            <p className="text-sm font-medium mb-3">
              {formatItem.format}
            </p>

            <input
              type="url"
              value={
                formatItem.deliveryLink || ""
              }
              onChange={(e) => {

                const updated = [
                  ...newOrder.deliveryFormats,
                ]

                updated[index] = {
                  ...updated[index],

                  deliveryLink:
                    e.target.value,
                }

                setNewOrder({
                  ...newOrder,

                  deliveryFormats:
                    updated,
                })
              }}

              placeholder={`Paste ${formatItem.format} link...`}

              className="
                w-full
                bg-black
                border
                border-zinc-700
                rounded-xl
                px-4
                py-3
                outline-none
              "
            />

          </div>
        )
      )}

    </div>

  </div>
)}

    </div>

  </motion.div>
)}
</AnimatePresence>
</div>
</div>
{/* BUTTONS */}
<div className="border-t border-zinc-800 bg-[#0E0E0E] p-6 rounded-b-3xl sticky bottom-0 z-20">

  <button
    disabled={isSavingOrder}
    onClick={handleSubmit}
    className={`w-full py-4 rounded-2xl font-semibold transition ${
      isSavingOrder
        ? "bg-zinc-700 text-zinc-400 cursor-not-allowed"
        : "bg-white text-black hover:opacity-90"
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

    </motion.div>
  </div>
  )
}