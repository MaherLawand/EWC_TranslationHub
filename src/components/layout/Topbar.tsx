import React from "react"

type Props = {
  activePage: string
  statsOrders: any
  currentUser: any
  setShowModal: (value: boolean) => void
  canManageOrders: boolean
  statusFilter: string
  setStatusFilter: (v: string) => void
}

function Topbar({
  activePage,
  setShowModal,
  canManageOrders,
  statsOrders,
  currentUser,
  statusFilter,
  setStatusFilter,
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

  // Memoized counts — avoid re-filtering on every render
  const pendingCount    = React.useMemo(() => statsOrders.filter((o: any) => o.status === "PENDING").length,     [statsOrders])
  const inProgressCount = React.useMemo(() => statsOrders.filter((o: any) => o.status === "IN_PROGRESS").length, [statsOrders])
  const completedCount  = React.useMemo(() => statsOrders.filter((o: any) => o.status === "COMPLETED").length,   [statsOrders])

return (
  <header
    className="
      px-8
      py-6
      border-b
      border-[#242424]
      bg-[#090909]
      shadow-[0_0_30px_rgba(0,0,0,0.35)]
      flex
      flex-col
      gap-6
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

  {/* LEFT */}
  <div className="min-w-fit">

    <h2
      className="
        text-[30px]
        font-bold
        tracking-tight
        text-[#F5F1E8]
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
      "
    >
      {getDescription()}
    </p>

  </div>

  {/* COMPACT STATS */}
  {showStats && (
    <div
      className="
        flex-1
        flex
        items-center
        justify-center
        gap-3
      "
    >

      {/* TOTAL — resets filter */}
      <button
        onClick={() => setStatusFilter("All Statuses")}
        className={`
          min-w-[120px] rounded-2xl border px-4 py-3 text-left cursor-pointer transition-all duration-200
          ${statusFilter === "All Statuses"
            ? "border-[#3A3A3A] bg-[#1A1A1A]"
            : "border-[#242424] bg-[#111111] opacity-50 hover:opacity-80"}
        `}
      >
        <p className="text-[10px] uppercase tracking-[0.18em] text-zinc-400">Total</p>
        <h3 className="text-2xl font-bold text-white mt-1">{statsOrders.length}</h3>
      </button>

      {/* PENDING */}
      <button
        onClick={() => setStatusFilter(statusFilter === "Pending" ? "All Statuses" : "Pending")}
        className={`
          min-w-[120px] rounded-2xl border px-4 py-3 text-left cursor-pointer transition-all duration-200
          ${statusFilter === "Pending"
            ? "bg-yellow-500/20 border-yellow-500/50 shadow-[0_0_20px_rgba(234,179,8,0.15)]"
            : "bg-yellow-500/10 border-yellow-500/20 opacity-50 hover:opacity-80"}
        `}
      >
        <p className="text-[10px] uppercase tracking-[0.18em] text-yellow-400">Pending</p>
        <h3 className="text-2xl font-bold text-white mt-1">{pendingCount}</h3>
      </button>

      {/* IN PROGRESS */}
      <button
        onClick={() => setStatusFilter(statusFilter === "In Progress" ? "All Statuses" : "In Progress")}
        className={`
          min-w-[120px] rounded-2xl border px-4 py-3 text-left cursor-pointer transition-all duration-200
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
          min-w-[120px] rounded-2xl border px-4 py-3 text-left cursor-pointer transition-all duration-200
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
  {activePage !== "users" &&
    canManageOrders && (
      <button
        onClick={() =>
          setShowModal(true)
        }
        className="
          h-[52px]
          px-6
          rounded-2xl
          bg-[#D6B36A]
          text-black
          font-semibold
          tracking-wide
          shadow-[0_0_25px_rgba(214,179,106,0.18)]
          transition-all
          duration-300
          hover:bg-[#E4C27C]
          hover:shadow-[0_0_35px_rgba(214,179,106,0.28)]
          hover:scale-[1.02]
          active:scale-[0.99]
          flex-shrink-0
        "
      >
        + New Order
      </button>
    )}

</div>


  </header>
)
}

export default React.memo(Topbar)