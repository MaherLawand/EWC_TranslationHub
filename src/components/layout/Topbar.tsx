import React from "react"
import { gearWarp } from "../../lib/gearHover"

type OrderCounts = {
  PENDING: number
  READY_FOR_TRANSLATION: number
  IN_PROGRESS: number
  COMPLETED: number
  total: number
}

type Props = {
  activePage: string
  orderCounts: OrderCounts
  currentUser: any
  setShowModal: (value: boolean) => void
  canManageOrders: boolean
  statusFilter: string
  setStatusFilter: (v: string) => void
  onMobileMenuToggle?: () => void
}

function Topbar({
  activePage,
  setShowModal,
  canManageOrders,
  orderCounts,
  currentUser,
  statusFilter,
  setStatusFilter,
  onMobileMenuToggle,
}: Props) {
  function getTitle() {
    switch (activePage) {
      case "broadcast":
        return "Broadcast"

      case "marketing":
        return "Marketing"

      case "Broadcast":
        return "Broadcast"

        case "my-games":
          return "My Games"

          case "my-orders":
            return "My Orders"
            case "notifications":
              return "Notifications"

      case "users":
        return "Users"

      default:
        return "Dashboard"
    }
  }

  function getDescription() {
    switch (activePage) {
      case "broadcast":
        return "Manage broadcast translations"

      case "marketing":
        return "Manage marketing assets"

      case "users":
        return "Manage platform users"

      case "Broadcast":
        return "Manage broadcast translations"

      case "my-games":
        return "Manage your games"

        case "notifications":
          return "Manage your notifications"
      
      case "my-orders":
        return "Manage your translation requests"

      default:
        return "Manage translation requests"
    }
  }

  const showStats =
    activePage === "games" ||
    activePage === "marketing" ||
    activePage === "my-games" ||
    activePage === "Broadcast"

  const pendingCount    = orderCounts.PENDING
  const readyCount      = orderCounts.READY_FOR_TRANSLATION
  const inProgressCount = orderCounts.IN_PROGRESS
  const completedCount  = orderCounts.COMPLETED

return (
  <header
    className="
      px-4
      sm:px-8
      border-b
      border-[#242424]
      bg-[#090909]
      shadow-[0_0_30px_rgba(0,0,0,0.35)]
      flex
      flex-col
      justify-center
      gap-3
      sm:gap-6
      py-3
      sm:py-0
      min-h-[80px]
      sm:h-[100px]
      flex-shrink-0
    "
  >

    {/* TOP ROW */}
  {/* TOP ROW */}
<div
  className="
    flex
    items-center
    justify-between
    gap-6
  "
>

  {/* HAMBURGER — mobile only */}
  {onMobileMenuToggle && (
    <button
      onClick={onMobileMenuToggle}
      className="
        lg:hidden
        flex-shrink-0
        w-10
        h-10
        flex
        items-center
        justify-center
        rounded-xl
        border
        border-[#2A2A2A]
        bg-[#111111]
        text-zinc-400
        hover:text-white
        hover:border-[#3A3A3A]
        transition-colors
      "
      aria-label="Open menu"
    >
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <line x1="2" y1="4.5" x2="16" y2="4.5" />
        <line x1="2" y1="9" x2="16" y2="9" />
        <line x1="2" y1="13.5" x2="16" y2="13.5" />
      </svg>
    </button>
  )}

  {/* LEFT */}
  <div className="min-w-fit">

    <h2
      className="
        text-2xl
        sm:text-[30px]
        font-bold
        tracking-tight
        text-gear-gradient
        w-fit
        leading-none
      "
    >
      {getTitle()}
    </h2>

    <p
      className="
        text-sm
        text-zinc-500
        mt-2
        tracking-wide
        hidden
        sm:block
      "
    >
      {getDescription()}
    </p>

  </div>

  {/* COMPACT STATS */}
  {showStats && (
    <div
      className="
        hidden
        lg:flex
        flex-1
        items-center
        justify-center
        gap-3
      "
    >

      {/* TOTAL — resets filter */}
      <button
        onClick={() => setStatusFilter("All Statuses")}
        className={`
          min-w-[104px] rounded-2xl border px-4 py-3 text-left cursor-pointer transition-all duration-200
          ${statusFilter === "All Statuses"
            ? "border-[#3A3A3A] bg-[#1A1A1A]"
            : "border-[#242424] bg-[#111111] opacity-50 hover:opacity-80"}
        `}
      >
        <p className="text-[10px] uppercase tracking-[0.18em] text-zinc-400">Total</p>
        <h3 className="text-2xl font-bold text-white mt-1">{orderCounts.total}</h3>
      </button>

      {/* PENDING */}
      <button
        onClick={() => setStatusFilter(statusFilter === "Pending" ? "All Statuses" : "Pending")}
        className={`
          min-w-[104px] rounded-2xl border px-4 py-3 text-left cursor-pointer transition-all duration-200
          ${statusFilter === "Pending"
            ? "bg-yellow-500/20 border-yellow-500/50 shadow-[0_0_20px_rgba(234,179,8,0.15)]"
            : "bg-yellow-500/10 border-yellow-500/20 opacity-50 hover:opacity-80"}
        `}
      >
        <p className="text-[10px] uppercase tracking-[0.18em] text-yellow-400">Pending</p>
        <h3 className="text-2xl font-bold text-white mt-1">{pendingCount}</h3>
      </button>

      {/* READY FOR TRANSLATION */}
      <button
        onClick={() => setStatusFilter(statusFilter === "Ready for Translation" ? "All Statuses" : "Ready for Translation")}
        className={`
          min-w-[104px] rounded-2xl border px-4 py-3 text-left cursor-pointer transition-all duration-200
          ${statusFilter === "Ready for Translation"
            ? "bg-cyan-500/20 border-cyan-500/50 shadow-[0_0_20px_rgba(6,182,212,0.15)]"
            : "bg-cyan-500/[0.06] border-cyan-500/10 opacity-50 hover:opacity-80"}
        `}
      >
        <p className="text-[10px] uppercase tracking-[0.18em] text-cyan-400">Ready</p>
        <h3 className="text-2xl font-bold text-white mt-1">{readyCount}</h3>
      </button>

      {/* IN PROGRESS */}
      <button
        onClick={() => setStatusFilter(statusFilter === "In Progress" ? "All Statuses" : "In Progress")}
        className={`
          min-w-[104px] rounded-2xl border px-4 py-3 text-left cursor-pointer transition-all duration-200
          ${statusFilter === "In Progress"
            ? "bg-blue-500/20 border-blue-500/50 shadow-[0_0_20px_rgba(59,130,246,0.15)]"
            : "bg-blue-500/[0.06] border-blue-500/10 opacity-50 hover:opacity-80"}
        `}
      >
        <p className="text-[10px] uppercase tracking-[0.18em] text-blue-400">In Progress</p>
        <h3 className="text-2xl font-bold text-white mt-1">{inProgressCount}</h3>
      </button>

      {/* COMPLETED */}
      <button
        onClick={() => setStatusFilter(statusFilter === "Completed" ? "All Statuses" : "Completed")}
        className={`
          min-w-[104px] rounded-2xl border px-4 py-3 text-left cursor-pointer transition-all duration-200
          ${statusFilter === "Completed"
            ? "bg-green-500/20 border-green-500/50 shadow-[0_0_20px_rgba(34,197,94,0.15)]"
            : "bg-green-500/[0.06] border-green-500/10 opacity-50 hover:opacity-80"}
        `}
      >
        <p className="text-[10px] uppercase tracking-[0.18em] text-green-400">Completed</p>
        <h3 className="text-2xl font-bold text-white mt-1">{completedCount}</h3>
      </button>



    </div>
  )}

  {/* ACTION */}
  {(activePage !== "users" && activePage !== "notifications") &&
    canManageOrders && (
      <button
        onClick={() =>
          setShowModal(true)
        }
        onMouseMove={gearWarp}
        className="
          btn-gear
          h-[44px]
          sm:h-[52px]
          px-4
          sm:px-6
          rounded-2xl
          text-sm
          sm:text-base
          font-semibold
          tracking-wide
          shadow-[0_0_25px_rgba(214,179,106,0.18)]
          active:scale-[0.99]
          flex-shrink-0
          whitespace-nowrap
        "
      >
        <span className="sm:hidden">+ New</span>
        <span className="hidden sm:inline">+ New Order</span>
      </button>
    )}

</div>

  {/* COMPACT STATS — MOBILE/TABLET (status filter, horizontally scrollable) */}
  {showStats && (
    <div className="lg:hidden flex gap-2 overflow-x-auto dark-scroll -mx-1 px-1">
      {([
        { label: "Total", value: "All Statuses", count: orderCounts.total, active: "border-[#3A3A3A] bg-[#1A1A1A]", idle: "border-[#242424] bg-[#111111] opacity-60", text: "text-zinc-400" },
        { label: "Pending", value: "Pending", count: pendingCount, active: "bg-yellow-500/20 border-yellow-500/50", idle: "bg-yellow-500/10 border-yellow-500/20 opacity-60", text: "text-yellow-400" },
        { label: "Ready", value: "Ready for Translation", count: readyCount, active: "bg-cyan-500/20 border-cyan-500/50", idle: "bg-cyan-500/[0.06] border-cyan-500/10 opacity-60", text: "text-cyan-400" },
        { label: "In Progress", value: "In Progress", count: inProgressCount, active: "bg-blue-500/20 border-blue-500/50", idle: "bg-blue-500/[0.06] border-blue-500/10 opacity-60", text: "text-blue-400" },
        { label: "Completed", value: "Completed", count: completedCount, active: "bg-green-500/20 border-green-500/50", idle: "bg-green-500/[0.06] border-green-500/10 opacity-60", text: "text-green-400" },
      ] as const).map((s) => {
        const isActive = statusFilter === s.value
        return (
          <button
            key={s.value}
            onClick={() => setStatusFilter(isActive && s.value !== "All Statuses" ? "All Statuses" : s.value)}
            className={`flex-shrink-0 flex items-center gap-2 rounded-xl border px-3 py-1.5 transition-all duration-200 ${isActive ? s.active : s.idle}`}
          >
            <span className={`text-[10px] uppercase tracking-[0.12em] ${s.text}`}>{s.label}</span>
            <span className="text-sm font-bold text-white">{s.count}</span>
          </button>
        )
      })}
    </div>
  )}



  </header>
)
}

export default React.memo(Topbar)