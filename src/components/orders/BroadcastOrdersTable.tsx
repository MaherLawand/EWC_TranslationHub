import React from "react"
import ReactDOM from "react-dom"
import StatusBadge from "../shared/StatusBadge"
import PaginationBar from "../shared/PaginationBar"
import { useWheelToHorizontalScroll } from "../../hooks/useWheelToHorizontalScroll"

import { LANGUAGES } from "../../constants/languages"

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
  updateOrderStatus: (
    orderId: string,
    status: string
  ) => void
  getDeadlineInfo: (
    deadlineDate: string
  ) => {
    text: string
    color: string
  }
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
}

export default function BroadcastOrdersTable({
  orders,
  page,
  totalPages,
  onPageChange,
  onRowClick,
  updateOrderStatus,
  getDeadlineInfo,
  currentUser,
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
const [updatingOrderId, setUpdatingOrderId] =
  React.useState<string | null>(null)

const [copiedId, setCopiedId] =
  React.useState<string | null>(null)

function copyOrderLink(e: React.MouseEvent, orderId: string) {
  e.stopPropagation()
  const url = `${window.location.origin}${window.location.pathname}?page=Broadcast&orderId=${orderId}`
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

function openStatusPortal(e: React.MouseEvent, orderId: string, status: string) {
  if (statusPortalTimer.current) clearTimeout(statusPortalTimer.current)
  const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
  setStatusPortal({ orderId, status, top: rect.bottom + 6, left: rect.left })
}
function closeStatusPortal() {
  statusPortalTimer.current = setTimeout(() => setStatusPortal(null), 120)
}
function keepStatusPortal() {
  if (statusPortalTimer.current) clearTimeout(statusPortalTimer.current)
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
        bg-[#0E0E0E]
        border
        border-[#242424]
        rounded-[32px]
        overflow-hidden
        shadow-[0_0_50px_rgba(0,0,0,0.45)]
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
        <div className="h-[38px] px-3 flex items-center rounded-xl bg-[#0E0E0E] border border-[#2A2A2A] text-sm text-[#D6B36A] font-medium flex-shrink-0">
          {orders.length} Orders
        </div>

        {/* RESET */}
        <button
          onClick={onResetFilters}
          className="h-[38px] px-4 rounded-xl bg-[#D6B36A] text-black text-sm font-bold tracking-wide shadow-[0_0_14px_rgba(214,179,106,0.18)] transition hover:bg-[#E4C27C] flex-shrink-0"
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
              Game
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

          </tr>

        </thead>

          <tbody>

  {isLoading ? (

    <tr>
      <td
        colSpan={7}
        className="py-20 text-center text-zinc-500"
      >
        Loading orders...
      </td>
    </tr>

  ) : orders.length === 0 ? (

    <tr>
      <td
        colSpan={7}
        className="py-20 text-center text-zinc-500"
      >
        No orders found
      </td>
    </tr>

  ) : (

    orders.map((order) => {

            const broadcast =
              order.broadcast

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

                    <p className="font-semibold text-[#F5F1E8]">
                      {order.title}
                    </p>

                    <button
                      onClick={(e) => copyOrderLink(e, order.id)}
                      title="Copy link"
                      className="opacity-0 group-hover/row:opacity-100 flex-shrink-0 p-1 rounded-md transition-all text-zinc-500 hover:text-[#D6B36A] hover:bg-[#1A1A1A]"
                    >
                      {copiedId === order.id ? (
                        <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-green-400">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <rect x="9" y="2" width="6" height="4" rx="1" />
                          <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
                        </svg>
                      )}
                    </button>

                  </div>

                </td>

                {/* GAME */}
                <td className="px-6 py-2.5 text-zinc-300 align-center">
                  {broadcast?.game?.name
                    ? broadcast.game.name
                    : <span className="text-zinc-600">—</span>}
                </td>

                {/* LANGUAGES */}
                <td className="px-6 py-2.5 align-center">

                  <div className="flex flex-wrap items-center gap-2">

                    {/* SOURCE */}
                    {broadcast?.sourceLanguage?.length ? (
                      <div className="flex flex-wrap gap-1">
                        {broadcast.sourceLanguage.map((lang: string) => (
                          <div key={lang} className="group/pill relative">
                            <div className="min-w-[34px] h-[22px] inline-flex items-center justify-center rounded-full border border-[#2D2D2D] bg-[#1A1A1A] text-[#EAEAEA] text-[10px] font-bold tracking-[0.12em] px-2 hover:border-[#D6B36A] hover:text-[#D6B36A] transition cursor-default">
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
                    {broadcast?.targetLanguages?.length ? (
                      <div className="flex flex-wrap gap-1">
                        {broadcast.targetLanguages.map((lang: string) => (
                          <div key={lang} className="group/pill relative">
                            <div className="min-w-[34px] h-[22px] inline-flex items-center justify-center rounded-full bg-[#F5F1E8] text-black text-[10px] font-bold tracking-[0.12em] px-2 shadow-[0_0_15px_rgba(245,241,232,0.08)] hover:bg-[#D6B36A] hover:border-[#D6B36A] transition cursor-default">
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

  {!broadcast?.deliveryFormats?.length ? (
    <span className="text-zinc-600">—</span>
  ) : (
  <div className="flex flex-wrap gap-2">

    {broadcast?.deliveryFormats?.map(
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

                  {broadcast?.deadlineDate ? (
                    <div className="flex items-center gap-2 whitespace-nowrap">
                      <span>
                        {new Date(broadcast.deadlineDate).toLocaleDateString()}
                      </span>
                      {(() => {
                        const info = getDeadlineInfo(broadcast.deadlineDate)
                        return (
                          <span className={`text-sm ${info.color}`}>
                            {info.text}
                          </span>
                        )
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
                      order.priority ===
                      "HIGH"
                        ? "bg-red-500/10 text-red-400 border-red-500/20"
                        : order.priority ===
                          "MEDIUM"
                        ? "bg-yellow-500/10 text-yellow-400 border-yellow-500/20"
                        : "bg-green-500/10 text-green-400 border-green-500/20"
                    }`}
                  >
                    {order.priority}
                  </span>

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

    {/* STATUS PORTAL — rendered in document.body to escape overflow clipping */}
    {statusPortal && ReactDOM.createPortal(
      <div
        style={{ position: "fixed", top: statusPortal.top, left: statusPortal.left, zIndex: 9999 }}
        onMouseEnter={keepStatusPortal}
        onMouseLeave={closeStatusPortal}
        className="w-48 flex flex-col bg-[#101010]/95 backdrop-blur-xl border border-[#242424] rounded-2xl p-2 shadow-[0_0_40px_rgba(0,0,0,0.55)]"
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
    </>
  )
}