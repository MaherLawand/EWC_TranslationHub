import React from "react"
import ReactDOM from "react-dom"
import { LANGUAGES } from "../../constants/languages"
import StatusBadge from "../shared/StatusBadge"
import PaginationBar from "../shared/PaginationBar"
import { useWheelToHorizontalScroll } from "../../hooks/useWheelToHorizontalScroll"
import { gearWarp } from "../../lib/gearHover"

// Pre-built O(1) lookup — avoids a linear .find() scan on every render per pill
const LANG_CODE_MAP = new Map(
  LANGUAGES.map((l) => [l.name, l.code.toUpperCase()])
)
function getLanguageCode(name: string) {
  return LANG_CODE_MAP.get(name) ?? name.slice(0, 2).toUpperCase()
}

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
  deadlineSort: string
  setDeadlineSort: (v: string) => void
  onResetFilters: () => void
  isLoading?: boolean
  search: string
  setSearch: (v: string) => void
  priorityFilter: string
  setPriorityFilter: (v: string) => void
  formatFilter: string[]
  setFormatFilter: (v: string[]) => void
  selectedEvent: string
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
  deadlineSort,
  setDeadlineSort,
  onResetFilters,
  isLoading,
  search,
  setSearch,
  priorityFilter,
  setPriorityFilter,
  formatFilter,
  setFormatFilter,
  selectedEvent,
}: Props) {

const canUpdateStatus =
  currentUser?.role === "ADMIN" ||
  currentUser?.position === "PRODUCER" ||
  currentUser?.position === "POST_PRODUCTION_MANAGER" ||
  currentUser?.position === "TRANSLATOR" ||
  currentUser?.position === "EDITOR"

const canAssignUsers =
  currentUser?.role === "ADMIN" ||
  (currentUser?.department === "MARKETING" &&
    (currentUser?.position === "PRODUCER" ||
      currentUser?.position === "POST_PRODUCTION_MANAGER"))

const [updatingOrderId, setUpdatingOrderId] =
  React.useState<string | null>(null)

const [copiedId, setCopiedId] =
  React.useState<string | null>(null)

function copyOrderLink(e: React.MouseEvent, orderId: string) {
  e.stopPropagation()
  const url = `${window.location.origin}${window.location.pathname}?page=marketing&orderId=${orderId}&event=${selectedEvent}`
  navigator.clipboard.writeText(url)
  setCopiedId(orderId)
  setTimeout(() => setCopiedId(null), 2000)
}

// Portal dropdown for status
const [statusPortal, setStatusPortal] = React.useState<{
  orderId: string
  status: string
  top: number
  right: number
} | null>(null)
const statusPortalTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null)

function openStatusPortal(e: React.MouseEvent, orderId: string, status: string) {
  if (statusPortalTimer.current) clearTimeout(statusPortalTimer.current)
  const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
  setStatusPortal({ orderId, status, top: rect.bottom + 6, right: window.innerWidth - rect.right })
}
function closeStatusPortal() {
  statusPortalTimer.current = setTimeout(() => setStatusPortal(null), 120)
}
function keepStatusPortal() {
  if (statusPortalTimer.current) clearTimeout(statusPortalTimer.current)
}

// Portal tooltip for assign hover
const [assignPortal, setAssignPortal] = React.useState<{
  assignments: any[]
  top: number
  right: number
} | null>(null)
const assignPortalTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null)

function openAssignPortal(e: React.MouseEvent, assignments: any[]) {
  if (assignPortalTimer.current) clearTimeout(assignPortalTimer.current)
  const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
  setAssignPortal({ assignments, top: rect.bottom + 6, right: window.innerWidth - rect.right })
}
function closeAssignPortal() {
  assignPortalTimer.current = setTimeout(() => setAssignPortal(null), 120)
}
function keepAssignPortal() {
  if (assignPortalTimer.current) clearTimeout(assignPortalTimer.current)
}

// Assign modal state
const [assignOrderId, setAssignOrderId] = React.useState<string | null>(null)
const [assignSearch, setAssignSearch] = React.useState("")
const [assignSelectedIds, setAssignSelectedIds] = React.useState<string[]>([])
const [isSavingAssign, setIsSavingAssign] = React.useState(false)
const [searchResults, setSearchResults] = React.useState<any[]>([])
const [isSearching, setIsSearching] = React.useState(false)
const [showAssignDiscardConfirm, setShowAssignDiscardConfirm] = React.useState(false)
const initialAssignIdsRef = React.useRef<string[]>([])
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
  if (!canAssignUsers) return
  const alreadyAssigned: any[] = order.marketing?.assignments?.map((a: any) => a.user).filter(Boolean) || []
  const initialIds = alreadyAssigned.map((u) => u.id)
  initialAssignIdsRef.current = initialIds
  setAssignOrderId(order.id)
  setAssignSearch("")
  setSearchResults([])
  setAssignSelectedIds(initialIds)
  setAssignedUserObjects(alreadyAssigned)
  setShowAssignDiscardConfirm(false)
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
  setShowAssignDiscardConfirm(false)
}

const isAssignDirty =
  JSON.stringify([...assignSelectedIds].sort()) !==
  JSON.stringify([...initialAssignIdsRef.current].sort())

function tryCloseAssignModal() {
  if (isAssignDirty) {
    setShowAssignDiscardConfirm(true)
  } else {
    closeAssignModal()
  }
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

const scrollRef = useWheelToHorizontalScroll<HTMLDivElement>()

  return (
    <>
    <div
      className="
        border
        border-[#242424]
        rounded-[32px]
        overflow-hidden
        shadow-[0_0_50px_rgba(0,0,0,0.45)]
        bg-[#0E0E0E]
      "
    >

      {/* HEADER — filter controls replace the old title/count row */}
      <div className="px-4 py-3 border-b border-[#242424] bg-[#111111] flex items-center gap-2 flex-wrap">

        {/* SEARCH */}
        <div className="relative flex-1 min-w-[140px]">
          <svg xmlns="http://www.w3.org/2000/svg" className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-600 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <circle cx="11" cy="11" r="8" /><path strokeLinecap="round" d="M21 21l-4.35-4.35" />
          </svg>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search orders…"
            className="w-full h-[38px] pl-8 pr-3 bg-[#0E0E0E] border border-[#2A2A2A] rounded-xl text-sm text-white outline-none transition placeholder:text-zinc-600 focus:border-[#D6B36A] focus:bg-[#0A0A0A]"
          />
        </div>

        {/* PRIORITY */}
        <div className="relative">
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="h-[38px] min-w-[124px] appearance-none bg-[#0E0E0E] border border-[#2A2A2A] rounded-xl px-3 pr-7 text-sm font-medium text-[#F5F1E8] outline-none transition hover:border-[#3A3A3A] focus:border-[#D6B36A] cursor-pointer"
          >
            <option>All Priorities</option>
            <option>HIGH</option>
            <option>MEDIUM</option>
            <option>LOW</option>
          </select>
          <div className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-zinc-500 text-[9px]">▼</div>
        </div>

        {/* FORMAT */}
        <div className="relative">
          <select
            value={formatFilter[0] || ""}
            onChange={(e) => setFormatFilter(e.target.value ? [e.target.value] : [])}
            className="h-[38px] min-w-[124px] appearance-none bg-[#0E0E0E] border border-[#2A2A2A] rounded-xl px-3 pr-7 text-sm font-medium text-[#F5F1E8] outline-none transition hover:border-[#3A3A3A] focus:border-[#D6B36A] cursor-pointer"
          >
            <option value="">All Formats</option>
            <option value="SRT">SRT</option>
            <option value="BURNED_IN">BURNED IN</option>
            <option value="TEXT">TEXT</option>
          </select>
          <div className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-zinc-500 text-[9px]">▼</div>
        </div>

        {/* ORDER COUNT */}
        <div className="h-[38px] px-3 flex items-center rounded-xl bg-[#0E0E0E] border border-[#2A2A2A] text-sm text-gear-gradient font-medium flex-shrink-0">
          {orders.length} Orders
        </div>

        {/* RESET */}
        <button
          onClick={onResetFilters}
          onMouseMove={gearWarp}
          className="btn-gear h-[38px] px-4 rounded-xl text-sm font-bold tracking-wide shadow-[0_0_14px_rgba(214,179,106,0.18)] flex-shrink-0"
        >
          Reset
        </button>

      </div>

      {/* TABLE */}
      <div className="table-scroll" ref={scrollRef}>
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

  <th className="px-6 py-3">
    <button
      onClick={() => setDeadlineSort(deadlineSort === "ASC" ? "DESC" : deadlineSort === "DESC" ? "" : "ASC")}
      className={`flex items-center gap-1.5 text-left cursor-pointer transition-colors ${deadlineSort ? "text-[#D6B36A]" : "hover:text-white"}`}
    >
      Deadline
      <span className={`text-[10px] ${deadlineSort ? "opacity-100" : "opacity-60"}`}>
        {deadlineSort === "ASC" ? "↑" : deadlineSort === "DESC" ? "↓" : "↕"}
      </span>
    </button>
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
    group/row
    border-b
    border-[#1F1F1F]
    hover:bg-[rgba(214,179,106,0.03)]
    cursor-pointer
    transition-colors
    duration-150
  "
>

  {/* ORDER */}
  <td className="px-6 py-2.5 align-center">

    <div className="flex items-center gap-2">

      <p className="font-normal text-[#F5F1E8]">
        {order.title}
      </p>

      <button
        onClick={(e) => copyOrderLink(e, order.id)}
        title="Copy link"
        className="opacity-0 group-hover/row:opacity-100 flex-shrink-0 p-1 rounded-md transition-all text-zinc-500 hover:text-[#D6B36A] hover:bg-[#1A1A1A]"
      >
        {copiedId === order.id ? (
          <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-green-400">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        ) : (
          <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="9" y="2" width="6" height="4" rx="1" />
            <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
          </svg>
        )}
      </button>

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
            <div key={lang} className="group/pill relative">
              <div className="gear-hover-text min-w-[34px] h-[22px] inline-flex items-center justify-center rounded-full border border-[#2D2D2D] bg-[#1A1A1A] text-[#EAEAEA] text-[10px] font-bold tracking-[0.12em] px-2 transition cursor-default">
                {getLanguageCode(lang)}
              </div>
              <div className="pointer-events-none absolute left-1/2 top-0 z-50 -translate-x-1/2 -translate-y-[115%] opacity-0 group-hover/pill:opacity-100 transition-opacity">
                <div className="whitespace-nowrap rounded-lg border border-[#2D2D2D] bg-[#121212] px-2.5 py-1 text-[10px] text-[#F5F1E8]">
                  {lang}
                </div>
              </div>
            </div>
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
            <div key={lang} className="group/pill relative">
              <div className="gear-hover-fill min-w-[34px] h-[22px] inline-flex items-center justify-center rounded-full bg-[#F5F1E8] text-black text-[10px] font-bold tracking-[0.12em] px-2 shadow-[0_0_15px_rgba(245,241,232,0.08)] transition cursor-default">
                {getLanguageCode(lang)}
              </div>
              <div className="pointer-events-none absolute left-1/2 top-0 z-50 -translate-x-1/2 -translate-y-[115%] opacity-0 group-hover/pill:opacity-100 transition-opacity">
                <div className="whitespace-nowrap rounded-lg border border-[#2D2D2D] bg-[#121212] px-2.5 py-1 text-[10px] text-[#F5F1E8]">
                  {lang}
                </div>
              </div>
            </div>
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
        return <span className={`text-sm ${info.color}`}>{info.text}</span>
      })()}
    </div>
  ) : (
    <span className="text-zinc-600">—</span>
  )}
</td>

{/* STATUS */}
<td className="px-6 py-2.5 align-center whitespace-nowrap">

  <div
    className="inline-flex flex-shrink-0"
    onMouseEnter={(e) => canUpdateStatus && openStatusPortal(e, order.id, order.status)}
    onMouseLeave={canUpdateStatus ? closeStatusPortal : undefined}
  >
    {canUpdateStatus ? (
      <button
        onClick={(e) => e.stopPropagation()}
        disabled={isUpdating}
        className="rounded-xl transition hover:scale-[1.02] disabled:opacity-60 disabled:cursor-not-allowed"
      >
        <div className="whitespace-nowrap">
          {isUpdating ? (
            <div className="min-w-[110px] h-[36px] inline-flex items-center justify-center rounded-xl border border-[#2A2A2A] bg-[#171717] text-[#D6B36A] text-xs font-semibold animate-pulse">
              Updating...
            </div>
          ) : (
            <StatusBadge status={order.status} />
          )}
        </div>
      </button>
    ) : (
      <div className="whitespace-nowrap">
        <StatusBadge status={order.status} />
      </div>
    )}
  </div>

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
    {(() => {
      const validAssignments = marketing?.assignments?.filter((a: any) => a.user) || []
      return (
        <div
          className="inline-flex"
          onMouseEnter={validAssignments.length > 0 ? (e) => openAssignPortal(e, validAssignments) : undefined}
          onMouseLeave={validAssignments.length > 0 ? closeAssignPortal : undefined}
        >
          {canAssignUsers ? (
            <button
              onClick={(e) => openAssignModal(e, order)}
              title={validAssignments.length ? `${validAssignments.length} assigned` : "Assign users"}
              className={`group cursor-pointer relative overflow-hidden inline-flex items-center justify-center h-8 w-8 rounded-full border transition-colors ${
                validAssignments.length
                  ? "bg-[#1A1A1A] border-[#D6B36A] text-[#D6B36A]"
                  : "bg-[#1A1A1A] border-[#2A2A2A] text-zinc-400 hover:border-[#D6B36A] hover:text-[#D6B36A]"
              }`}
            >
              <span className="absolute inset-0 rounded-full bg-[#D6B36A]/10 scale-0 origin-top-right group-hover:scale-100 transition-transform duration-300 ease-out" />
              <svg xmlns="http://www.w3.org/2000/svg" className="relative w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </button>
          ) : validAssignments.length > 0 ? (
            <div
              title={`${validAssignments.length} assigned`}
              className="inline-flex items-center justify-center h-8 w-8 rounded-full bg-[#1A1A1A] border border-[#D6B36A] text-[#D6B36A] cursor-default select-none"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
          ) : (
            <span className="text-zinc-600 text-xs">—</span>
          )}
        </div>
      )
    })()}
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

    {/* STATUS PORTAL */}
    {statusPortal && ReactDOM.createPortal(
      <div
        style={{ position: "fixed", top: statusPortal.top, right: statusPortal.right, zIndex: 9999, transformOrigin: "top right" }}
        onMouseEnter={keepStatusPortal}
        onMouseLeave={closeStatusPortal}
        className="w-48 flex flex-col bg-[#101010]/95 backdrop-blur-xl border border-[#242424] rounded-2xl p-2 shadow-[0_0_40px_rgba(0,0,0,0.55)] animate-[scaleIn_0.15s_ease-out_forwards]"
      >
        {canUpdateStatus && statusPortal.status === "PENDING" && (
          <>
            <button
              disabled={updatingOrderId === statusPortal.orderId}
              onClick={(e) => { e.stopPropagation(); handleUpdateStatus(statusPortal.orderId, "IN_PROGRESS"); setStatusPortal(null) }}
              className="w-full text-left px-3 py-2 rounded-xl hover:bg-zinc-800 text-sm text-blue-400 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Start Progress
            </button>
            <button
              disabled={updatingOrderId === statusPortal.orderId}
              onClick={(e) => { e.stopPropagation(); handleUpdateStatus(statusPortal.orderId, "COMPLETED"); setStatusPortal(null) }}
              className="w-full text-left px-3 py-2 rounded-xl hover:bg-zinc-800 text-sm text-green-400 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Mark Completed
            </button>
          </>
        )}
        {canUpdateStatus && statusPortal.status === "IN_PROGRESS" && (
          <button
            disabled={updatingOrderId === statusPortal.orderId}
            onClick={(e) => { e.stopPropagation(); handleUpdateStatus(statusPortal.orderId, "COMPLETED"); setStatusPortal(null) }}
            className="w-full text-left px-3 py-2 rounded-xl hover:bg-zinc-800 text-sm text-green-400 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Mark Completed
          </button>
        )}
        {(!canUpdateStatus || statusPortal.status === "COMPLETED") && (
          <div className="px-3 py-2 text-xs text-zinc-400">No actions available</div>
        )}
      </div>,
      document.body
    )}

    {/* ASSIGN TOOLTIP PORTAL */}
    {assignPortal && ReactDOM.createPortal(
      <div
        style={{ position: "fixed", top: assignPortal.top, right: assignPortal.right, zIndex: 9999, transformOrigin: "top right" }}
        onMouseEnter={keepAssignPortal}
        onMouseLeave={closeAssignPortal}
        className="w-52 max-h-48 overflow-y-auto bg-[#101010]/95 backdrop-blur-xl border border-[#242424] rounded-2xl p-3 shadow-[0_0_40px_rgba(0,0,0,0.55)] animate-[scaleIn_0.15s_ease-out_forwards]"
      >
        <p className="text-[10px] font-semibold tracking-[0.15em] uppercase text-zinc-500 mb-2">Assigned To</p>
        <div className="space-y-1.5">
          {assignPortal.assignments.map((a: any) => (
            <div key={a.id} className="flex items-center gap-2 min-w-0">
              <div className="w-1.5 h-1.5 rounded-full bg-[#D6B36A] flex-shrink-0" />
              <span className="text-xs text-[#F5F1E8] font-medium truncate">{a.user.firstName} {a.user.lastName}</span>
            </div>
          ))}
        </div>
      </div>,
      document.body
    )}

    {/* ASSIGN MODAL */}
    {assignOrderId && (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50" onClick={tryCloseAssignModal}>
        <div
          className="bg-white/5 border border-white/10 backdrop-blur-2xl rounded-3xl w-[480px] shadow-[0_20px_80px_rgba(0,0,0,0.6)] flex flex-col max-h-[80vh] relative"
          onClick={(e) => e.stopPropagation()}
        >

          {/* HEADER */}
          <div className="flex items-center justify-between px-7 pt-6 pb-5 border-b border-white/10 bg-[radial-gradient(ellipse_80%_60%_at_top,rgba(214,179,106,0.08),transparent_70%)] rounded-t-3xl flex-shrink-0">
            <div>
              <p className="text-xs font-semibold tracking-[0.18em] uppercase text-[#D6B36A]/70 mb-1">Marketing Order</p>
              <h2 className="text-lg font-bold text-gear-gradient w-fit">Assign Users</h2>
            </div>
            <button
              onClick={tryCloseAssignModal}
              className="w-8 h-8 flex items-center justify-center rounded-full bg-white/10 border border-white/10 text-zinc-300 hover:text-white hover:bg-white/20 transition text-sm"
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
                      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 border border-[#D6B36A]/30 text-xs font-semibold"
                    >
                      <span className="text-gear-gradient">{u.firstName} {u.lastName}</span>
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
              className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-white/30 outline-none focus:border-[#D6B36A] focus:bg-white/15 transition"
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
                            ? "bg-white/10 border-[#D6B36A]/30"
                            : "bg-white/[0.03] border-white/10 hover:bg-white/[0.06] hover:border-white/20"
                        }`}
                      >
                        <div>
                          <p className={`text-sm font-semibold ${selected ? "text-[#F5F1E8]" : "text-zinc-200"}`}>
                            {u.firstName} {u.lastName}
                          </p>
                          {u.position && (
                            <p className="text-xs text-zinc-400 mt-0.5">{u.position.replace(/_/g, " ")}</p>
                          )}
                        </div>
                        <div className={`w-5 h-5 rounded-full border flex items-center justify-center flex-shrink-0 transition ${
                          selected ? "bg-[#D6B36A] border-[#D6B36A]" : "border-white/30"
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
          <div className="border-t border-white/10 bg-white/[0.02] p-5 rounded-b-3xl flex-shrink-0">
            <button
              onClick={saveAssign}
              disabled={isSavingAssign || !isAssignDirty}
              onMouseMove={gearWarp}
              className={`w-full py-3 rounded-2xl font-semibold transition flex items-center justify-center gap-2 ${
                isSavingAssign || !isAssignDirty
                  ? "bg-[#1A1A1A] text-zinc-600 cursor-not-allowed border border-[#2A2A2A]"
                  : "btn-gear"
              }`}
            >
              {isSavingAssign && <div className="w-4 h-4 border-2 border-zinc-600 border-t-transparent rounded-full animate-spin" />}
              {isSavingAssign ? "Saving..." : `Save Assignments${assignSelectedIds.length ? ` (${assignSelectedIds.length})` : ""}`}
            </button>
          </div>

          {/* DISCARD CONFIRM OVERLAY */}
          {showAssignDiscardConfirm && (
            <div className="absolute inset-0 bg-black/75 backdrop-blur-md flex items-center justify-center rounded-3xl z-10 px-6">
              <div className="bg-[#0C0C0C]/95 border border-white/10 backdrop-blur-2xl rounded-2xl p-6 w-full max-w-xs shadow-[0_20px_60px_rgba(0,0,0,0.6)]">
                <p className="text-[#F5F1E8] font-semibold text-sm mb-1">Discard changes?</p>
                <p className="text-zinc-500 text-xs mb-5">You have unsaved changes that will be lost if you close.</p>
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowAssignDiscardConfirm(false)}
                    className="flex-1 py-2.5 rounded-xl border border-white/15 bg-white/5 text-zinc-300 text-sm hover:text-white hover:bg-white/10 transition"
                  >
                    Keep Editing
                  </button>
                  <button
                    onClick={closeAssignModal}
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
    )}
    </>
  )
}