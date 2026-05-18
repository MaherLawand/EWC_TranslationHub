import { act } from "react"

type Props = {
  activePage: string
statsOrders: any

  currentUser: any
  setShowModal: (
    value: boolean
  ) => void

  canManageOrders: boolean
}

export default function Topbar({
  activePage,
  setShowModal,
  canManageOrders,
  statsOrders,
  currentUser,
}: Props) {
  function getTitle() {
    switch (activePage) {
      case "broadcast":
        return "Broadcast"

      case "marketing":
        return "Marketing"

      case "games":
        return "Games"

        case "my-games":
          return "My Games"

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

      case "games":
        return "Manage games"

      case "my-games":
        return "Manage your games"

      default:
        return "Manage translation requests"
    }
  }

  const showStats =
  activePage === "games" ||
  activePage === "marketing" ||
  activePage === "my-games" ||
  activePage === "broadcast"

return (
  <header
    className="
      px-8
      py-6
      border-b
      border-[#242424]
      bg-[#090909]/95
      backdrop-blur-xl
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

      {/* TOTAL */}
      <div
        className="
          min-w-[120px]
          rounded-2xl
          border
          border-[#242424]
          bg-[#111111]
          px-4
          py-3
        "
      >
        <p className="text-[10px] uppercase tracking-[0.18em] text-zinc-500">
          Total
        </p>

        <h3 className="text-2xl font-bold text-white mt-1">
          {statsOrders.length}
        </h3>
      </div>

      {/* IN PROGRESS */}
      <div
        className="
          min-w-[120px]
          rounded-2xl
          border
          border-blue-500/10
          bg-blue-500/[0.06]
          px-4
          py-3
        "
      >
        <p className="text-[10px] uppercase tracking-[0.18em] text-blue-400">
          In Progress
        </p>

        <h3 className="text-2xl font-bold text-white mt-1">
          {
            statsOrders.filter(
              (o: any) =>
                o.status ===
                "IN_PROGRESS"
            ).length
          }
        </h3>
      </div>

      {/* COMPLETED */}
      <div
        className="
          min-w-[120px]
          rounded-2xl
          border
          border-green-500/10
          bg-green-500/[0.06]
          px-4
          py-3
        "
      >
        <p className="text-[10px] uppercase tracking-[0.18em] text-green-400">
          Completed
        </p>

        <h3 className="text-2xl font-bold text-white mt-1">
          {
            statsOrders.filter(
              (o: any) =>
                o.status ===
                "COMPLETED"
            ).length
          }
        </h3>
      </div>

      {/* PENDING */}
      <div
        className="
          min-w-[120px]
          rounded-2xl
          border
          border-orange-500/10
          bg-orange-500/[0.06]
          px-4
          py-3
        "
      >
        <p className="text-[10px] uppercase tracking-[0.18em] text-orange-400">
          Pending
        </p>

        <h3 className="text-2xl font-bold text-white mt-1">
          {
            statsOrders.filter(
              (o: any) =>
                o.status ===
                "PENDING"
            ).length
          }
        </h3>
      </div>

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