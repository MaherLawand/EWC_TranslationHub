import SidebarItem from "../shared/SidebarItem"

type Props = {
  activePage: string

  logout: () => void

  setActivePage: (
    page: string
  ) => void

  currentUser: any
}

export default function Sidebar({
  activePage,
  setActivePage,
  currentUser,
  logout,
}: Props) {
const unreadNotifications =
  currentUser?.notifications?.filter(
    (n: any) => !n.isRead
  ).length || 0

  return (
    <aside
      className="
        w-[260px]
        bg-[radial-gradient(circle_at_center,rgba(214,179,106,0.03),transparent_100%)]
        bg-[#0A0A0A]
        border-r
        border-[#1F1F1F]
        flex
        flex-col
        backdrop-blur-2xl
      "
    >

      {/* LOGO */}
      <div
        className="
          min-h-[110px]
          border-b
          border-[#1F1F1F]
          flex
          items-center
          px-8
          py-7
        "
      >

        <div className="space-y-2">

          <p
            className="
              text-[10px]
              uppercase
              tracking-[0.45em]
              text-[#D6B36A]
              font-semibold
            "
          >
            EWC
          </p>

          <h1
            className="
              text-[24px]
              leading-[1.15]
              font-bold
              tracking-[-0.03em]
              text-[#F5F1E8]
            "
          >
            Translation
            Hub
          </h1>

        </div>

      </div>

      {/* NAVIGATION */}
      <nav className="flex-1 px-5 py-7 overflow-auto">

        <div className="px-3 mb-5">

          <p
            className="
              text-[13px]
              uppercase
              tracking-[0.28em]
              text-zinc-600
              font-semibold
            "
          >
            Navigation
          </p>

        </div>

        <div className="space-y-2">

          {/* BROADCAST */}
                    {/* GAMES */}
          {(currentUser?.department ===
            "BROADCAST" ||
            currentUser?.role ===
              "ADMIN") && (
            <SidebarItem
              active={
                activePage ===
                "games"
              }
              label="Games"
              onClick={() =>
                setActivePage(
                  "games"
                )
              }
            />
          )}

          {/* MARKETING */}
          {(currentUser?.department ===
            "MARKETING" ||
            currentUser?.role ===
              "ADMIN") && (
            <SidebarItem
              active={
                activePage ===
                "marketing"
              }
              label="Marketing Orders"
              onClick={() =>
                setActivePage(
                  "marketing"
                )
              }
            />
          )}

{/* MY GAMES */}
{currentUser?.role !== "ADMIN" &&
  currentUser?.department ===
    "BROADCAST" &&
  (currentUser?.position ===
    "PRODUCER" ||
    currentUser?.position ===
      "POST_PRODUCTION_MANAGER") && (
    <SidebarItem
      active={
        activePage ===
        "my-games"
      }
      label="My Games"
      onClick={() =>
        setActivePage(
          "my-games"
        )
      }
    />
)}
{/* NOTIFICATIONS */}
{(
  currentUser?.role === "ADMIN" ||

  (
    currentUser?.department ===
      "BROADCAST" &&

    (
      currentUser?.position ===
        "PRODUCER" ||

      currentUser?.position ===
        "POST_PRODUCTION_MANAGER"
    )
  )
) && (
  <div className="relative">

    <SidebarItem
      active={
        activePage ===
        "notifications"
      }
      label="Notifications"
      onClick={() =>
        setActivePage(
          "notifications"
        )
      }
    />

    {unreadNotifications >
      0 && (
      <div
        className="
          absolute
          right-3
          top-1/2
          -translate-y-1/2
          min-w-[22px]
          h-[22px]
          px-1.5
          rounded-full
          bg-[#D6B36A]
          text-black
          text-[11px]
          font-bold
          flex
          items-center
          justify-center
          shadow-[0_0_18px_rgba(214,179,106,0.35)]
        "
      >
        {unreadNotifications}
      </div>
    )}

  </div>
)}
          {/* USERS */}
          {currentUser?.role ===
            "ADMIN" && (
            <SidebarItem
              active={
                activePage ===
                "users"
              }
              label="Users"
              onClick={() =>
                setActivePage(
                  "users"
                )
              }
            />
          )}

        </div>

      </nav>

      {/* FOOTER */}
      <div
        className="
          border-t
          border-[#1F1F1F]
          px-5
          py-5
          bg-[#090909]/80
          backdrop-blur-xl
        "
      >

        <div className="flex items-center gap-4">

          {/* AVATAR */}
          <div
            className="
              w-12
              h-12
              rounded-2xl
              bg-[#151515]
              border
              border-[#2B2B2B]
              flex
              items-center
              justify-center
              text-[#D6B36A]
              font-bold
              text-sm
              shadow-[0_0_20px_rgba(214,179,106,0.08)]
              flex-shrink-0
            "
          >
            {currentUser?.name
              ?.slice(0, 2)
              ?.toUpperCase()}
          </div>

          {/* USER INFO */}
          <div className="min-w-0 flex-1">

            <p
              className="
                font-semibold
                text-[#F5F1E8]
                truncate
              "
            >
              {currentUser?.name}
            </p>

            <p
              className="
                text-xs
                text-zinc-500
                mt-1
                truncate
              "
            >
              {currentUser?.position ||
                currentUser?.role}
            </p>

          </div>

        </div>

        {/* LOGOUT */}
        <button
          onClick={logout}
          className="
            w-full
            mt-5
            h-[48px]
            rounded-2xl
            border
            border-[#D6B36A]/20
            bg-[#D6B36A]
            text-black
            text-sm
            font-semibold
            transition-all
            hover:bg-[#E7C989]
            hover:shadow-[0_0_25px_rgba(214,179,106,0.18)]
          "
        >
          Logout
        </button>

      </div>

    </aside>
  )
}