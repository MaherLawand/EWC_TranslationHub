import React from "react"
import ReactDOM from "react-dom"
import { LANGUAGES } from "../../constants/languages"
import { MARKETING_FORMAT_OPTIONS, formatLabel } from "../../constants/deliveryFormats"
import { FeedbackButton, type Feedback } from "./OrderFeedback"
import LanguagesCell from "./LanguagesCell"
import FormatsCell from "./FormatsCell"
import StatusBadge from "../shared/StatusBadge"
import PaginationBar from "../shared/PaginationBar"
import { formatDeadline } from "../../lib/deadline"
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
  getDeadlineInfo: (deadlineDate: string, hasTime?: boolean) => { text: string; color: string }
  onAssignUsers: (orderId: string, userIds: string[]) => Promise<void>
  deadlineSort: string
  setDeadlineSort: (v: string) => void
  onResetFilters: () => void
  filtersActive?: boolean
  isLoading?: boolean
  search: string
  setSearch: (v: string) => void
  priorityFilter: string
  setPriorityFilter: (v: string) => void
  formatFilter: string[]
  setFormatFilter: (v: string[]) => void
  selectedEvent: string
  mode?: "grouped" | "flat"
  fetchSubOrders?: (
    parentId: string,
    page?: number
  ) => Promise<{
    subOrders: any[]
    total: number
    page: number
    totalPages: number
  }>
  statusPatch?: { id: string; status: string; nonce: number } | null
  /** Bumped whenever a structural change (create/edit/delete) occurs so all
   *  currently-expanded parents reload their sub-orders to show fresh data. */
  subRefresh?: number
  /** Whether the current user can create/manage orders (controls Duplicate). */
  canManageOrders?: boolean
  /** Open the create modal pre-filled with this order's data (duplicate). */
  onDuplicate?: (order: any) => void | Promise<void>
  /** Translator click → open the feedback panel for this order. */
  onOpenFeedback?: (order: any) => void
  /** Fetch feedback for an order (used by the hover preview bubble). */
  fetchOrderFeedback?: (orderId: string) => Promise<Feedback[]>
  /** Bumped when any feedback changes so open bubbles refresh. */
  feedbackRefresh?: number
  /** Mark feedback messages read (called when they scroll into view). */
  markFeedbackRead?: (ids: string[]) => Promise<void> | void
  /** Called after messages are marked read so the unread badges refresh. */
  onFeedbackRead?: () => void
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
  filtersActive = false,
  isLoading,
  search,
  setSearch,
  priorityFilter,
  setPriorityFilter,
  formatFilter,
  setFormatFilter,
  selectedEvent,
  mode = "grouped",
  fetchSubOrders,
  statusPatch,
  subRefresh,
  canManageOrders,
  onDuplicate,
  onOpenFeedback,
  fetchOrderFeedback,
  feedbackRefresh,
  markFeedbackRead,
  onFeedbackRead,
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

// Tracks the order whose duplicate is currently being prepared (detail fetch +
// modal open) so the button shows a spinner and can't be clicked repeatedly.
const [duplicatingId, setDuplicatingId] =
  React.useState<string | null>(null)

async function handleDuplicate(e: React.MouseEvent, order: any) {
  e.stopPropagation()
  if (!onDuplicate || duplicatingId) return
  setDuplicatingId(order.id)
  try {
    await onDuplicate(order)
  } finally {
    setDuplicatingId(null)
  }
}

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
  left: number
} | null>(null)
const statusPortalTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null)
const statusPortalRef = React.useRef<HTMLDivElement>(null)

// Opens (idempotent) anchored just below the badge; the layout-effect below
// then measures the rendered menu and clamps it on-screen (same approach as the
// feedback bubble) so it never floats detached above the badge.
// Called by BOTH hover (desktop) and click/tap (mobile); always opens, never
// toggles, so a tap's mouseenter+click pair can't cancel out.
function openStatusPortal(e: React.MouseEvent, orderId: string, status: string) {
  e.stopPropagation()
  if (statusPortalTimer.current) clearTimeout(statusPortalTimer.current)
  const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
  const MENU_W = 192
  const PAD = 8
  let left = rect.right - MENU_W
  if (left + MENU_W > window.innerWidth - PAD) left = window.innerWidth - MENU_W - PAD
  if (left < PAD) left = PAD
  setStatusPortal({ orderId, status, top: rect.bottom + 6, left })
}
function closeStatusPortal() {
  statusPortalTimer.current = setTimeout(() => setStatusPortal(null), 120)
}
function keepStatusPortal() {
  if (statusPortalTimer.current) clearTimeout(statusPortalTimer.current)
}

// After the menu renders, clamp its top using its real height so it stays fully
// on-screen (shifts up only by the actual overflow, never a guessed amount).
React.useLayoutEffect(() => {
  if (!statusPortal) return
  const el = statusPortalRef.current
  if (!el) return
  const PAD = 8
  const h = el.offsetHeight
  let top = statusPortal.top
  if (top + h > window.innerHeight - PAD) top = window.innerHeight - h - PAD
  if (top < PAD) top = PAD
  el.style.top = `${top}px`
}, [statusPortal])

// Close on any tap/click outside the dropdown (mobile has no mouseleave).
React.useEffect(() => {
  if (!statusPortal) return
  const close = () => setStatusPortal(null)
  const id = window.setTimeout(() => {
    document.addEventListener("click", close)
    document.addEventListener("touchstart", close)
  }, 0)
  return () => {
    window.clearTimeout(id)
    document.removeEventListener("click", close)
    document.removeEventListener("touchstart", close)
  }
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [statusPortal?.orderId])

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

    // Optimistic: if this is an expanded sub-order, patch its cached row right
    // away so the actor sees the change instantly (the socket round-trip + the
    // statusPatch effect will confirm it for everyone).
    setSubCache((prev) => {
      let changed = false
      const next = new Map(prev)
      for (const [pid, entry] of next) {
        if (entry.rows.some((r: any) => r.id === orderId)) {
          next.set(pid, {
            ...entry,
            rows: entry.rows.map((r: any) =>
              r.id === orderId ? { ...r, status } : r
            ),
          })
          changed = true
        }
      }
      return changed ? next : prev
    })

    await updateOrderStatus(
      orderId,
      status
    )
  } finally {
    setUpdatingOrderId(null)
  }
}

const scrollRef = useWheelToHorizontalScroll<HTMLDivElement>()

// Expandable parent ("big order") rows
const [expandedIds, setExpandedIds] = React.useState<Set<string>>(new Set())

// Lazy-loaded sub-orders per parent: { rows, loading, page, totalPages }
type SubCacheEntry = { rows: any[]; loading: boolean; page: number; totalPages: number }
const [subCache, setSubCache] = React.useState<Map<string, SubCacheEntry>>(new Map())

// Live ref so the orders effect can read the current expansion without
// re-running when it changes.
const expandedIdsRef = React.useRef(expandedIds)
expandedIdsRef.current = expandedIds

// Switching grouped ↔ flat fundamentally changes the row set → full reset.
React.useEffect(() => {
  setExpandedIds(new Set())
  setSubCache(new Map())
}, [mode])

// When the orders list changes (create/edit/delete refetch), DON'T collapse
// everything. Keep parents that are still present expanded; only when the set
// of order ids actually changes do we refresh the open parents' sub-orders so
// their rows stay fresh. A pure in-place status patch (same ids) is a no-op
// here, so expanded sub-orders never flicker on a status update.
const prevOrderIdsRef = React.useRef<string>("")
React.useEffect(() => {
  const ids = orders.map((o: any) => o.id)
  const sig = ids.join(",")
  const present = new Set(ids)
  const stillExpanded = [...expandedIdsRef.current].filter((id) => present.has(id))

  if (stillExpanded.length !== expandedIdsRef.current.size) {
    setExpandedIds(new Set(stillExpanded))
    setSubCache((prev) => {
      const next = new Map<string, SubCacheEntry>()
      for (const id of stillExpanded) {
        const e = prev.get(id)
        if (e) next.set(id, e)
      }
      return next
    })
  }

  if (sig !== prevOrderIdsRef.current) {
    const isFirst = prevOrderIdsRef.current === ""
    prevOrderIdsRef.current = sig
    // Refresh still-open parents' sub-orders so a real list change doesn't
    // leave stale rows (skip the very first render — nothing is expanded yet).
    if (!isFirst) for (const id of stillExpanded) loadSubOrders(id, 1)
  }
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [orders])

// Apply an incoming in-place status patch to a cached sub-order row (sub-orders
// live only in subCache, not in the top-level orders state).
React.useEffect(() => {
  if (!statusPatch) return
  setSubCache((prev) => {
    let changed = false
    const next = new Map(prev)
    for (const [pid, entry] of next) {
      if (entry.rows.some((r: any) => r.id === statusPatch.id)) {
        next.set(pid, {
          ...entry,
          rows: entry.rows.map((r: any) =>
            r.id === statusPatch.id ? { ...r, status: statusPatch.status } : r
          ),
        })
        changed = true
      }
    }
    return changed ? next : prev
  })
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [statusPatch?.nonce])

// When a structural change (create/edit/delete) is signalled, reload the
// sub-orders for every currently-expanded parent so their rows stay fresh
// without collapsing the expansion or triggering a full page reload.
React.useEffect(() => {
  if (subRefresh === undefined || subRefresh === 0) return
  for (const id of expandedIdsRef.current) loadSubOrders(id, 1)
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [subRefresh])

async function loadSubOrders(parentId: string, page = 1) {
  if (!fetchSubOrders) return
  setSubCache((prev) => {
    const next = new Map(prev)
    const existing = next.get(parentId)
    next.set(parentId, {
      rows: existing?.rows ?? [],
      loading: true,
      page: existing?.page ?? 1,
      totalPages: existing?.totalPages ?? 1,
    })
    return next
  })
  const data = await fetchSubOrders(parentId, page)
  setSubCache((prev) => {
    const next = new Map(prev)
    const existing = next.get(parentId)
    const baseRows = page > 1 ? existing?.rows ?? [] : []
    next.set(parentId, {
      rows: [...baseRows, ...data.subOrders],
      loading: false,
      page: data.page,
      totalPages: data.totalPages,
    })
    return next
  })
}

function toggleExpand(e: React.MouseEvent, id: string) {
  e.stopPropagation()
  setExpandedIds((prev) => {
    const next = new Set(prev)
    if (next.has(id)) {
      next.delete(id)
    } else {
      next.add(id)
      if (!subCache.get(id)?.rows.length) loadSubOrders(id, 1)
    }
    return next
  })
}

// Renders a single order row. `isSub` = an indented sub-order under a parent.
function renderRow(order: any, isSub: boolean) {
  const marketing = order.marketing
  const isUpdating = updatingOrderId === order.id
  const isParent = order.isParent
  const isExpanded = expandedIds.has(order.id)
  // A parent's status is derived from its sub-orders → not manually editable.
  const canEditThisStatus = canUpdateStatus && !isParent
  const validAssignments = marketing?.assignments?.filter((a: any) => a.user) || []
  // Flat mode (search/filter active): sub-orders appear as their own rows with
  // a "part of {parent}" breadcrumb and no expand chevron.
  const isFlat = mode === "flat"
  const showBreadcrumb = isFlat && order.parentId && order.parent

  return (
    <tr
      key={order.id}
      onClick={() => onRowClick(order)}
      className={`
        group/row
        border-b
        border-[#1F1F1F]
        hover:bg-[rgba(214,179,106,0.03)]
        cursor-pointer
        transition-colors
        duration-150
        ${isSub ? "bg-white/[0.015]" : ""}
      `}
    >

      {/* ORDER */}
      <td className="px-6 py-2.5 align-center">

        <div className="flex items-center gap-2" style={isSub ? { paddingLeft: 28 } : undefined}>

          {isParent && !isFlat && (
            <button
              onClick={(e) => toggleExpand(e, order.id)}
              title={isExpanded ? "Collapse" : "Expand"}
              className="flex-shrink-0 w-5 h-5 inline-flex items-center justify-center rounded-md text-[#E8C77E] hover:text-[#F5D98A] hover:bg-[#1A1A1A] transition"
            >
              <span className={`text-gear-gradient text-[15px] transition-transform ${isExpanded ? "rotate-90" : ""}`}>▶</span>
            </button>
          )}

          {(isSub || showBreadcrumb) && (
            <span className="flex-shrink-0 text-gear-gradient text-xs">↳</span>
          )}

          {/* SOURCE CHANGED — caution flag before the title for visibility.
              Hidden once the order is completed (no longer being worked on). */}
          {order.sourceChangedAt && order.status !== "COMPLETED" && (
            <span
              title="Source file was changed — review the updated source"
              className="flex-shrink-0 text-amber-300 animate-pulse drop-shadow-[0_0_6px_rgba(252,211,77,0.6)]"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round">
                <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                <line x1="12" y1="9" x2="12" y2="13" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
            </span>
          )}

          <p title={order.title} className="font-normal text-[#F5F1E8] max-w-[320px] truncate">
            {order.title}
          </p>

          {isParent && !isFlat && (
            <span className="flex-shrink-0 px-2 py-0.5 rounded-full bg-[#D6B36A]/10 border border-[#D6B36A]/30 text-gear-gradient text-[10px] font-semibold">
              {order.subOrderCount ?? order._count?.subOrders ?? order.subOrders?.length ?? 0} sub
            </span>
          )}

          {showBreadcrumb && (
            <span className="flex-shrink-0 px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-zinc-400 text-[10px] font-medium">
              part of {order.parent.title}
            </span>
          )}

          <button
            onClick={(e) => copyOrderLink(e, order.id)}
            title="Copy link"
            className="flex-shrink-0 p-1 rounded-md transition-all text-zinc-500 hover:text-[#D6B36A] hover:bg-[#1A1A1A]"
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

          {/* DUPLICATE — only for standalone orders (no sub-orders), managers only.
              Uses the brand gradient to distinguish it from the grey Copy link. */}
          {canManageOrders && onDuplicate && !isParent && !order.parentId && (
            <button
              onClick={(e) => handleDuplicate(e, order)}
              disabled={duplicatingId === order.id}
              title="Duplicate order"
              className="flex-shrink-0 p-1 rounded-md transition-all hover:bg-[#1A1A1A] disabled:cursor-wait"
            >
              {duplicatingId === order.id ? (
                <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#D6B36A" strokeWidth="2.5" strokeLinecap="round" className="animate-spin">
                  <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="url(#dupGrad)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <defs>
                    <linearGradient id="dupGrad" x1="0" y1="0" x2="1" y2="1">
                      <stop offset="0%" stopColor="#F0C75E" />
                      <stop offset="35%" stopColor="#E89B3A" />
                      <stop offset="65%" stopColor="#D9692A" />
                      <stop offset="100%" stopColor="#BE3F1E" />
                    </linearGradient>
                  </defs>
                  <rect x="8" y="8" width="13" height="13" rx="2" ry="2" />
                  <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
                </svg>
              )}
            </button>
          )}

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

        <LanguagesCell source={marketing?.sourceLanguage} target={marketing?.targetLanguages} />

      </td>

      {/* FORMAT */}
      <td className="px-6 py-2.5 align-center">
        <FormatsCell
          formats={(marketing?.deliveryFormats ?? []).map((f: any) => formatLabel(f.format))}
        />
      </td>

      {/* DEADLINE */}
      <td className="px-6 py-2.5 text-zinc-300 align-center">
        {marketing?.deadlineDate ? (
          <div className="flex flex-col leading-tight whitespace-nowrap">
            <span>{formatDeadline(marketing.deadlineDate, marketing.deadlineHasTime)}</span>
            {/* Days-left / overdue is meaningless once the order is completed. */}
            {order.status !== "COMPLETED" && (() => {
              const info = getDeadlineInfo(marketing.deadlineDate, marketing.deadlineHasTime)
              return <span className={`text-xs ${info.color}`}>{info.text}</span>
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
          onMouseEnter={(e) => canEditThisStatus && openStatusPortal(e, order.id, order.status)}
          onMouseLeave={canEditThisStatus ? closeStatusPortal : undefined}
        >
          {canEditThisStatus ? (
            <button
              onClick={(e) => openStatusPortal(e, order.id, order.status)}
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
          className={`px-3 py-1 rounded-full text-sm font-medium border ${
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
      </td>

      {/* FEEDBACK */}
      <td className="px-6 py-2.5 align-center text-center">
        {onOpenFeedback && fetchOrderFeedback && (
          <div className="flex justify-center">
            <FeedbackButton
              order={order}
              currentUser={currentUser}
              onOpen={onOpenFeedback}
              fetchOrderFeedback={fetchOrderFeedback}
              feedbackRefresh={feedbackRefresh}
              markFeedbackRead={markFeedbackRead}
              onRead={onFeedbackRead}
            />
          </div>
        )}
      </td>

    </tr>
  )
}

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
            {MARKETING_FORMAT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
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
          onMouseMove={filtersActive ? gearWarp : undefined}
          disabled={!filtersActive}
          className="btn-gear h-[38px] px-4 rounded-xl text-sm font-bold tracking-wide shadow-[0_0_14px_rgba(214,179,106,0.18)] flex-shrink-0 disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none"
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

  <th className="text-center px-6 py-3">
    Feedback
  </th>

</tr>

        </thead>

        <tbody>

  {isLoading ? (

    <tr>
      <td
        colSpan={9}
        className="py-20 text-center text-zinc-500"
      >
        Loading orders...
      </td>
    </tr>

  ) : orders.length === 0 ? (

    <tr>
      <td
        colSpan={9}
        className="py-20 text-center text-zinc-500"
      >
        No orders found
      </td>
    </tr>

  ) : (

    mode === "flat" ? (
      // Flat mode: results include sub-orders as their own rows. Reorder so each
      // parent appears first with its matching sub-orders grouped right beneath
      // it (instead of scattered by the deadline sort). Sub-orders whose parent
      // isn't in the result set keep their own place (shown with a breadcrumb).
      (() => {
        const byId = new Map(orders.map((o: any) => [o.id, o]))
        const childrenByParent = new Map<string, any[]>()
        for (const o of orders as any[]) {
          if (o.parentId && byId.has(o.parentId)) {
            const arr = childrenByParent.get(o.parentId) || []
            arr.push(o)
            childrenByParent.set(o.parentId, arr)
          }
        }
        const ordered: any[] = []
        const seen = new Set<string>()
        for (const o of orders as any[]) {
          if (seen.has(o.id)) continue
          // Skip children that will be emitted under their parent below.
          if (o.parentId && byId.has(o.parentId)) continue
          ordered.push(o)
          seen.add(o.id)
          const kids = childrenByParent.get(o.id)
          if (kids) {
            // Natural (numeric-aware) order so "Day 2" precedes "Day 10".
            kids.sort((a, b) => (a.title || "").localeCompare(b.title || "", undefined, { numeric: true, sensitivity: "base" }))
            for (const k of kids) {
              if (!seen.has(k.id)) { ordered.push(k); seen.add(k.id) }
            }
          }
        }
        return ordered.map((order) => renderRow(order, false))
      })()
    ) : (
      // Grouped mode: parents render with lazy-loaded sub-orders on expand.
      orders.flatMap((order) => {
            const rows = [renderRow(order, false)]
            if (order.isParent && expandedIds.has(order.id)) {
              const entry = subCache.get(order.id)
              if (entry) {
                [...entry.rows]
                  .sort((a: any, b: any) => (a.title || "").localeCompare(b.title || "", undefined, { numeric: true, sensitivity: "base" }))
                  .forEach((sub: any) => rows.push(renderRow(sub, true)))
              }
              if (entry?.loading) {
                rows.push(
                  <tr key={`${order.id}-loading`} className="border-b border-[#1F1F1F] bg-white/[0.015]">
                    <td colSpan={9} className="px-6 py-3" style={{ paddingLeft: 56 }}>
                      <div className="flex items-center gap-2 text-zinc-500 text-sm">
                        <div className="w-3.5 h-3.5 border-2 border-zinc-600 border-t-transparent rounded-full animate-spin" />
                        Loading sub-orders…
                      </div>
                    </td>
                  </tr>
                )
              } else if (entry && entry.page < entry.totalPages) {
                rows.push(
                  <tr key={`${order.id}-more`} className="border-b border-[#1F1F1F] bg-white/[0.015]">
                    <td colSpan={9} className="px-6 py-2" style={{ paddingLeft: 56 }}>
                      <button
                        onClick={(e) => { e.stopPropagation(); loadSubOrders(order.id, entry.page + 1) }}
                        className="text-xs font-semibold text-[#E8C77E] hover:text-[#F5D98A] transition"
                      >
                        Load more sub-orders
                      </button>
                    </td>
                  </tr>
                )
              }
            }
            return rows
          })
    )
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
        ref={statusPortalRef}
        style={{ position: "fixed", top: statusPortal.top, left: statusPortal.left, zIndex: 9999, transformOrigin: "top left" }}
        onClick={(e) => e.stopPropagation()}
        onTouchStart={(e) => e.stopPropagation()}
        onMouseEnter={keepStatusPortal}
        onMouseLeave={closeStatusPortal}
        className="w-48 flex flex-col bg-[#101010]/95 backdrop-blur-xl border border-[#242424] rounded-2xl p-2 shadow-[0_0_40px_rgba(0,0,0,0.55)] animate-bubble-pop"
      >
        {canUpdateStatus ? (
          ([
            { value: "PENDING", label: "Set Pending", cls: "text-yellow-400" },
            { value: "IN_PROGRESS", label: "Start Progress", cls: "text-blue-400" },
            { value: "COMPLETED", label: "Mark Completed", cls: "text-green-400" },
          ] as const)
            .filter((s) => s.value !== statusPortal.status)
            .map((s) => (
              <button
                key={s.value}
                disabled={updatingOrderId === statusPortal.orderId}
                onClick={(e) => { e.stopPropagation(); handleUpdateStatus(statusPortal.orderId, s.value); setStatusPortal(null) }}
                className={`w-full text-left px-3 py-2 rounded-xl hover:bg-zinc-800 text-sm ${s.cls} transition disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {s.label}
              </button>
            ))
        ) : (
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
          className="bg-[#0C0C0C]/95 border border-white/10 backdrop-blur-2xl rounded-3xl w-[480px] shadow-[0_20px_80px_rgba(0,0,0,0.6)] flex flex-col max-h-[80vh] relative"
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
              className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-white/50 outline-none focus:border-[#D6B36A] focus:bg-white/15 transition"
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