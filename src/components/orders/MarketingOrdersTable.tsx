import React from "react"
import {
  LANGUAGES,
} from "../../constants/languages"
import StatusBadge from "../shared/StatusBadge"
import PaginationBar from "../shared/PaginationBar"

type Props = {
  orders: any[]
  currentUser: any
  page: number
  totalPages: number
  onPageChange: (page: number) => void
  onRowClick: (order: any) => void
  updateOrderStatus: (orderId: string, status: string) => void
  getDeadlineInfo: (deadlineDate: string) => { text: string; color: string }
  onAssignUsers: (orderId: string, userIds: string[]) => Promise<void>
  isLoading?: boolean
}

export default function MarketingOrdersTable({
  orders,
  page,
  totalPages,
  onPageChange,
  onRowClick,
  updateOrderStatus,
  currentUser,
  getDeadlineInfo,
  onAssignUsers,
  isLoading,
}: Props) {

const canUpdateStatus =
  currentUser?.role === "ADMIN" ||

  currentUser?.position ===
    "PRODUCER" ||

  currentUser?.position ===
    "POST_PRODUCTION_MANAGER" ||

  currentUser?.position ===
    "TRANSLATOR" ||
    
  currentUser?.position ===
    "EDITOR"
function getLanguageCode(
  languageName: string
) {
  return (
    LANGUAGES.find(
      (l) =>
        l.name ===
        languageName
    )?.code.toUpperCase() ||
    languageName
      .slice(0, 2)
      .toUpperCase()
  )
}

const [updatingOrderId, setUpdatingOrderId] =
  React.useState<string | null>(null)

// Assign modal state
const [assignOrderId, setAssignOrderId] = React.useState<string | null>(null)
const [assignSearch, setAssignSearch] = React.useState("")
const [assignSelectedIds, setAssignSelectedIds] = React.useState<string[]>([])
const [isSavingAssign, setIsSavingAssign] = React.useState(false)
const [searchResults, setSearchResults] = React.useState<any[]>([])
const [isSearching, setIsSearching] = React.useState(false)
const searchDebounceRef = React.useRef<ReturnType<typeof setTimeout> | null>(null)

// Debounced search — only fires after 300 ms of no typing, min 1 char
React.useEffect(() => {
  if (!assignOrderId) return
  if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current)
  if (!assignSearch.trim()) { setSearchResults([]); return }
  searchDebounceRef.current = setTimeout(async () => {
    setIsSearching(true)
    try {
      const res = await fetch(
        `${import.meta.env.VITE_API_URL}/auth/users/search?q=${encodeURIComponent(assignSearch.trim())}`,
        { credentials: "include" }
      )
      setSearchResults(res.ok ? await res.json() : [])
    } catch { setSearchResults([]) }
    finally { setIsSearching(false) }
  }, 300)
  return () => { if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current) }
}, [assignSearch, assignOrderId])

function openAssignModal(e: React.MouseEvent, order: any) {
  e.stopPropagation()
  const alreadyAssigned: any[] = order.marketing?.assignments?.map((a: any) => a.user).filter(Boolean) || []
  setAssignOrderId(order.id)
  setAssignSearch("")
  setSearchResults([])
  setAssignSelectedIds(alreadyAssigned.map((u) => u.id))
  setAssignedUserObjects(alreadyAssigned)
}

// keep a snapshot of the assigned users' full objects so chips render correctly
const [assignedUserObjects, setAssignedUserObjects] = React.useState<any[]>([])
React.useEffect(() => {
  if (!assignOrderId) return
  // merge newly found users into the snapshot so chips stay visible
  setAssignedUserObjects((prev) => {
    const merged = [...prev]
    searchResults.forEach((u) => {
      if (!merged.find((m) => m.id === u.id)) merged.push(u)
    })
    return merged
  })
}, [searchResults])

function closeAssignModal() {
  setAssignOrderId(null)
  setAssignSearch("")
  setSearchResults([])
  setAssignedUserObjects([])
  setAssignSelectedIds([])
}

function toggleUser(user: any) {
  setAssignedUserObjects((prev) =>
    prev.find((u) => u.id === user.id) ? prev : [...prev, user]
  )
  setAssignSelectedIds((prev) =>
    prev.includes(user.id) ? prev.filter((id) => id !== user.id) : [...prev, user.id]
  )
}

async function saveAssign() {
  if (!assignOrderId || isSavingAssign) return
  setIsSavingAssign(true)
  try {
    await onAssignUsers(assignOrderId, assignSelectedIds)
    closeAssignModal()
  } finally {
    setIsSavingAssign(false)
  }
}

  async function handleUpdateStatus(
  orderId: string,
  status: string
) {
  try {
    setUpdatingOrderId(orderId)

    await updateOrderStatus(
      orderId,
      status
    )
  } finally {
    setUpdatingOrderId(null)
  }
}


  return (
    <>
    <div
      className="
        bg-[radial-gradient(ellipse_90%_70%_at_top,rgba(214,179,106,0.05),transparent_80%),linear-gradient(to_bottom,#111111,#090909)]
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

          <h3 className="text-lg font-semibold">
            Marketing
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
          {orders.length} Orders
        </div>

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

  <th className="text-left px-6 py-3">
    Order
  </th>

  <th className="text-left px-6 py-3">
    Content
  </th>

  <th className="text-left px-6 py-3">
    Languages
  </th>

  <th className="text-left px-6 py-3">
    Format
  </th>

  <th className="text-left px-6 py-3">
    Deadline
  </th>

  <th className="text-left px-6 py-3">
    Status
  </th>

  <th className="text-left px-6 py-3">
    Priority
  </th>

  <th className="text-left px-6 py-3">
    Assign
  </th>

</tr>

        </thead>

        <tbody>

  {isLoading ? (

    <tr>
      <td
        colSpan={8}
        className="py-20 text-center text-zinc-500"
      >
        Loading orders...
      </td>
    </tr>

  ) : orders.length === 0 ? (

    <tr>
      <td
        colSpan={8}
        className="py-20 text-center text-zinc-500"
      >
        No orders found
      </td>
    </tr>

  ) : (

    orders.map((order) => {

            const marketing =
              order.marketing

const isUpdating =
  updatingOrderId === order.id

            return (
             <tr
  key={order.id}
  onClick={() => onRowClick(order)}
  className="
    border-b
    border-[#1F1F1F]
    hover:bg-[rgba(214,179,106,0.03)]
    hover:shadow-[inset_0_0_0_1px_rgba(214,179,106,0.04)]
    cursor-pointer
    transition-all
    duration-300
  "
>

  {/* ORDER */}
  <td className="px-6 py-2.5 align-center">

    <div>

      <p className="font-semibold text-[#F5F1E8]">
        {order.title}
      </p>


    </div>

  </td>

  {/* CONTENT TITLE */}
  <td className="px-6 py-2.5 align-center">

    <div>

      <p className="text-[#F5F1E8] font-medium">
        {marketing?.contentTitle
          ? marketing.contentTitle
          : <span className="text-zinc-600">—</span>}
      </p>

    </div>

  </td>

  {/* LANGUAGES */}
  <td className="px-6 py-2.5 align-center">

    <div className="flex flex-wrap items-center gap-2">

      {/* SOURCE */}
      {marketing?.sourceLanguage?.length ? (
        <div className="flex flex-wrap gap-1">
          {marketing.sourceLanguage.map((lang: string) => (
            <span
              key={lang}
              className="min-w-[34px] h-[22px] inline-flex items-center justify-center rounded-full border border-[#2D2D2D] bg-[#1A1A1A] text-[#EAEAEA] text-[10px] font-bold tracking-[0.12em] px-2"
            >
              {getLanguageCode(lang)}
            </span>
          ))}
        </div>
      ) : (
        <span className="text-zinc-600">—</span>
      )}

      <span className="text-zinc-500">→</span>

      {/* TARGET */}
      {marketing?.targetLanguages?.length ? (
        <div className="flex flex-wrap gap-1">
          {marketing.targetLanguages.map((lang: string) => (
            <span
              key={lang}
              className="min-w-[34px] h-[22px] inline-flex items-center justify-center rounded-full bg-[#F5F1E8] text-black text-[10px] font-bold tracking-[0.12em] px-2 shadow-[0_0_15px_rgba(245,241,232,0.08)]"
            >
              {getLanguageCode(lang)}
            </span>
          ))}
        </div>
      ) : (
        <span className="text-zinc-600">—</span>
      )}

    </div>

  </td>

  {/* FORMAT */}
<td className="px-6 py-2.5 align-center">

  {!marketing?.deliveryFormats?.length ? (
    <span className="text-zinc-600">—</span>
  ) : (
  <div className="flex flex-wrap gap-2">

    {marketing?.deliveryFormats?.map(
      (formatItem: any) => (
        <span
          key={formatItem.id}
          className="
            border
            border-[#2B2B2B]
            bg-[#171717]
            px-3
            py-0.5
            rounded-xl
            text-xs
            font-semibold
            tracking-wide
            text-[#F5F1E8]
          "
        >
          {formatItem.format}
        </span>
      )
    )}

  </div>
  )}

</td>

{/* DEADLINE */}
<td className="px-6 py-2.5 text-zinc-300 align-center">
  {marketing?.deadlineDate ? (
    <div className="flex items-center gap-2 whitespace-nowrap">
      <span>{new Date(marketing.deadlineDate).toLocaleDateString()}</span>
      {(() => {
        const info = getDeadlineInfo(marketing.deadlineDate)
        return <span className={`text-xs ${info.color}`}>{info.text}</span>
      })()}
    </div>
  ) : (
    <span className="text-zinc-600">—</span>
  )}
</td>

{/* STATUS */}
<td className="px-6 py-2.5 align-center whitespace-nowrap">

  {!canUpdateStatus ? (

    <div className="whitespace-nowrap">
      <StatusBadge
        status={order.status}
      />
    </div>

  ) : (

    <div className="relative group/status inline-flex flex-shrink-0">

      <button
  onClick={(e) =>
    e.stopPropagation()
  }
  disabled={isUpdating}
  className="
    rounded-xl
    transition
    hover:scale-[1.02]
    disabled:opacity-60
    disabled:cursor-not-allowed
  "
>
  <div className="whitespace-nowrap">

    {isUpdating ? (

      <div
        className="
          min-w-[110px]
          h-[36px]
          inline-flex
          items-center
          justify-center
          rounded-xl
          border
          border-[#2A2A2A]
          bg-[#171717]
          text-[#D6B36A]
          text-xs
          font-semibold
          animate-pulse
          disabled:opacity-50
disabled:cursor-not-allowed
        "
      >
        Updating...
      </div>

    ) : (

      <StatusBadge
        status={order.status}
      />

    )}

  </div>
</button>

      {/* DROPDOWN */}
      <div
        className="
          absolute
          bottom-full
          left-0
          mb-3
          w-48
          flex
          flex-col
          bg-[#101010]/95
          backdrop-blur-xl
          border
          border-[#242424]
          rounded-2xl
          p-2
          opacity-0
          invisible
          translate-y-2
          group-hover/status:translate-y-0
          group-hover/status:opacity-100
          group-hover/status:visible
          transition-all
          duration-200
          z-[9999]
          shadow-[0_0_40px_rgba(0,0,0,0.55)]
        "
      >

        {order.status ===
          "PENDING" && (
          <>
            <button
            disabled={isUpdating}
              onClick={(e) => {
                e.stopPropagation()

                handleUpdateStatus(
                  order.id,
                  "IN_PROGRESS"
                )
              }}
              className="
                w-full
                text-left
                px-3
                py-2
                rounded-xl
                hover:bg-zinc-800
                text-sm
                transition
                disabled:opacity-50
disabled:cursor-not-allowed
              "
            >
              Start Progress
            </button>

            <button
            disabled={isUpdating}
              onClick={(e) => {
                e.stopPropagation()

                handleUpdateStatus(
                  order.id,
                  "COMPLETED"
                )
              }}
              className="
                w-full
                text-left
                px-3
                py-2
                rounded-xl
                hover:bg-zinc-800
                text-sm
                text-green-400
                transition
                disabled:opacity-50
disabled:cursor-not-allowed
              "
            >
              Mark Completed
            </button>
          </>
        )}

        {order.status ===
          "IN_PROGRESS" && (
          <button
          disabled={isUpdating}
            onClick={(e) => {
              e.stopPropagation()

              handleUpdateStatus(
                order.id,
                "COMPLETED"
              )
            }}
            className="
              w-full
              text-left
              px-3
              py-2
              rounded-xl
              hover:bg-zinc-800
              text-sm
              text-green-400
              transition
              disabled:opacity-50
disabled:cursor-not-allowed
            "
          >
            Mark Completed
          </button>
        )}

        {order.status ===
          "COMPLETED" && (
          <div className="px-3 py-2 text-xs text-zinc-500">
            No actions available
          </div>
        )}

      </div>

    </div>

  )}

</td>

  {/* PRIORITY */}
  <td className="px-6 py-2.5 align-center">

    <span
      className={`px-3 py-1 rounded-lg text-xs font-semibold border ${
        order.priority === "HIGH"
          ? "bg-red-500/10 text-red-400 border-red-500/20"
          : order.priority === "MEDIUM"
          ? "bg-yellow-500/10 text-yellow-400 border-yellow-500/20"
          : "bg-green-500/10 text-green-400 border-green-500/20"
      }`}
    >
      {order.priority}
    </span>

  </td>

  {/* ASSIGN */}
  <td className="px-6 py-2.5 align-center" onClick={(e) => e.stopPropagation()}>
    <button
      onClick={(e) => openAssignModal(e, order)}
      className="cursor-pointer inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#1A1A1A] border border-[#2A2A2A] text-xs font-semibold text-zinc-300 hover:border-[#D6B36A] hover:text-[#D6B36A] transition whitespace-nowrap"
    >
      <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
      </svg>
      {marketing?.assignments?.length
        ? `${marketing.assignments.length} assigned`
        : "Assign"}
    </button>
  </td>

</tr>
            )
          })
        )}

        </tbody>

      </table>
      </div>

      {/* PAGINATION */}
      <PaginationBar page={page} totalPages={totalPages} onPageChange={onPageChange} />

    </div>

    {/* ASSIGN MODAL */}
    {assignOrderId && (
      <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50" onClick={closeAssignModal}>
        <div
          className="bg-[#0A0A0A] border border-[#1E1E1E] rounded-3xl w-[480px] shadow-[0_0_80px_rgba(0,0,0,0.8)] flex flex-col max-h-[80vh]"
          onClick={(e) => e.stopPropagation()}
        >

          {/* HEADER */}
          <div className="flex items-center justify-between px-7 pt-6 pb-5 border-b border-[#1E1E1E] bg-[radial-gradient(ellipse_80%_60%_at_top,rgba(214,179,106,0.06),transparent_70%)] rounded-t-3xl flex-shrink-0">
            <div>
              <p className="text-xs font-semibold tracking-[0.18em] uppercase text-[#D6B36A]/70 mb-1">Marketing Order</p>
              <h2 className="text-lg font-bold text-[#F5F1E8]">Assign Users</h2>
            </div>
            <button
              onClick={closeAssignModal}
              className="w-8 h-8 flex items-center justify-center rounded-full bg-[#1A1A1A] border border-[#2A2A2A] text-zinc-500 hover:text-white hover:border-[#3A3A3A] transition text-sm"
            >
              ✕
            </button>
          </div>

          {/* BODY */}
          <div className="flex-1 overflow-auto dark-scroll p-6 space-y-4">

            {/* SELECTED CHIPS */}
            {assignSelectedIds.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {assignedUserObjects
                  .filter((u) => assignSelectedIds.includes(u.id))
                  .map((u) => (
                    <span
                      key={u.id}
                      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#1A1A1A] border border-[#D6B36A]/30 text-[#D6B36A] text-xs font-semibold"
                    >
                      {u.firstName} {u.lastName}
                      <button
                        onClick={() => toggleUser(u)}
                        className="text-[#D6B36A]/60 hover:text-white transition leading-none"
                      >
                        ✕
                      </button>
                    </span>
                  ))}
              </div>
            )}

            {/* SEARCH */}
            <input
              autoFocus
              value={assignSearch}
              onChange={(e) => setAssignSearch(e.target.value)}
              placeholder="Search users..."
              className="w-full bg-[#111111] border border-[#2A2A2A] rounded-xl px-4 py-2.5 text-sm text-[#F5F1E8] placeholder:text-zinc-600 outline-none focus:border-[#D6B36A] transition"
            />

            {/* USER LIST */}
            <div className="space-y-1">
              {isSearching ? (
                <div className="flex items-center justify-center py-8">
                  <div className="w-5 h-5 border-2 border-[#D6B36A]/40 border-t-[#D6B36A] rounded-full animate-spin" />
                </div>
              ) : (
                (() => {
                  const listUsers = assignSearch.trim()
                    ? searchResults
                    : assignedUserObjects.filter((u) => assignSelectedIds.includes(u.id))

                  if (listUsers.length === 0) {
                    return (
                      <p className="text-center text-zinc-600 text-sm py-6">
                        {assignSearch.trim() ? "No users found" : "Type to search users…"}
                      </p>
                    )
                  }

                  return listUsers.map((u) => {
                    const selected = assignSelectedIds.includes(u.id)
                    return (
                      <button
                        key={u.id}
                        onClick={() => toggleUser(u)}
                        className={`cursor-pointer w-full flex items-center justify-between px-4 py-3 rounded-2xl border transition text-left ${
                          selected
                            ? "bg-[#1A1A1A] border-[#D6B36A]/30"
                            : "bg-[#111111] border-[#1E1E1E] hover:border-[#2A2A2A]"
                        }`}
                      >
                        <div>
                          <p className={`text-sm font-semibold ${selected ? "text-[#F5F1E8]" : "text-zinc-300"}`}>
                            {u.firstName} {u.lastName}
                          </p>
                          {u.position && (
                            <p className="text-xs text-zinc-600 mt-0.5">{u.position.replace(/_/g, " ")}</p>
                          )}
                        </div>
                        <div className={`w-5 h-5 rounded-full border flex items-center justify-center flex-shrink-0 transition ${
                          selected ? "bg-[#D6B36A] border-[#D6B36A]" : "border-[#2A2A2A]"
                        }`}>
                          {selected && (
                            <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                              <path d="M2 5L4 7L8 3" stroke="black" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                          )}
                        </div>
                      </button>
                    )
                  })
                })()
              )}
            </div>

          </div>

          {/* FOOTER */}
          <div className="border-t border-[#1E1E1E] p-5 rounded-b-3xl flex-shrink-0">
            <button
              onClick={saveAssign}
              disabled={isSavingAssign}
              className={`w-full py-3 rounded-2xl font-semibold transition flex items-center justify-center gap-2 ${
                isSavingAssign
                  ? "bg-[#1A1A1A] text-zinc-600 cursor-not-allowed border border-[#2A2A2A]"
                  : "bg-[#D6B36A] text-black hover:bg-[#E4C27C]"
              }`}
            >
              {isSavingAssign && <div className="w-4 h-4 border-2 border-zinc-600 border-t-transparent rounded-full animate-spin" />}
              {isSavingAssign ? "Saving..." : `Save Assignments${assignSelectedIds.length ? ` (${assignSelectedIds.length})` : ""}`}
            </button>
          </div>

        </div>
      </div>
    )}
    </>
  )
}