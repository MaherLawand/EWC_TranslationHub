type Props = {
  activePage: string

  setShowModal: (
    value: boolean
  ) => void

  canManageOrders: boolean
}

export default function Topbar({
  activePage,
  setShowModal,
  canManageOrders,
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

return (
  <header
    className="
      h-24
      px-8
      flex
      items-center
      justify-between
      border-b
      border-[#242424]
      bg-[#090909]/95
      backdrop-blur-xl
      shadow-[0_0_30px_rgba(0,0,0,0.35)]
    "
  >

    {/* LEFT */}
    <div>

      <h2
        className="
          text-[28px]
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

    {/* ACTION */}
    {activePage !== "users" &&
      canManageOrders && (
        <button
          onClick={() =>
            setShowModal(true)
          }
          className="
            h-[50px]
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
          "
        >
          + New Order
        </button>
      )}

  </header>
)
}