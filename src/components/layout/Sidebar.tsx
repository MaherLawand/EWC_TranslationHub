import React from "react"
import SidebarItem from "../shared/SidebarItem"

type Props = {
  activePage: string
  logout: () => void
  setActivePage: (page: string) => void
  currentUser: any
  selectedEvent: string
  setSelectedEvent: (value: string) => void
}

export default function Sidebar({
  activePage,
  setActivePage,
  currentUser,
  logout,
  selectedEvent,
  setSelectedEvent,
}: Props) {

  const unreadNotifications =
    currentUser?.notifications?.filter((n: any) => !n.isRead).length || 0

  const canViewBroadcastOrders =
    currentUser?.department === "BROADCAST" ||
    currentUser?.department === "MARKETING" ||
    currentUser?.role === "ADMIN"

  /* ── dropdown child visibility (same rules as before) ── */
  const showMyGames =
    currentUser?.role !== "ADMIN" &&
    currentUser?.department === "BROADCAST" &&
    (currentUser?.position === "PRODUCER" ||
      currentUser?.position === "POST_PRODUCTION_MANAGER")

  const showMyOrders =
    currentUser?.role === "ADMIN" ||
    (currentUser?.department === "MARKETING" &&
      (currentUser?.position === "PRODUCER" ||
        currentUser?.position === "POST_PRODUCTION_MANAGER"))

  /* ── dropdown open state ── */
  const [broadcastOpen, setBroadcastOpen] = React.useState(false)
  const [marketingOpen, setMarketingOpen] = React.useState(false)

  // Auto-open when landing on a child page (e.g. initial load or external nav)
  React.useEffect(() => {
    if (activePage === "Broadcast" || activePage === "my-games")
      setBroadcastOpen(true)
  }, [activePage])

  React.useEffect(() => {
    if (activePage === "marketing" || activePage === "my-orders")
      setMarketingOpen(true)
  }, [activePage])

  /* ── helpers ── */
  const broadcastActive = activePage === "Broadcast" || activePage === "my-games"
  const marketingActive = activePage === "marketing" || activePage === "my-orders"

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
            {selectedEvent}
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

      {/* EVENT SWITCHER */}
      <div className="px-5 pt-6">
        <div
          className="
            relative
            grid
            grid-cols-2
            bg-[#111111]
            border
            border-[#242424]
            rounded-2xl
            p-1
            overflow-hidden
          "
        >
          {/* ACTIVE BACKGROUND */}
          <div
            className={`
              absolute
              top-1
              bottom-1
              w-[calc(50%-4px)]
              rounded-xl
              bg-[#D6B36A]
              transition-all
              duration-300
              ease-out
              ${selectedEvent === "EWC" ? "left-1" : "left-[calc(50%+2px)]"}
            `}
          />
          <button
            onClick={() => setSelectedEvent("EWC")}
            className={`
              relative z-10 h-[46px] rounded-xl text-sm font-semibold transition-all
              ${selectedEvent === "EWC" ? "text-black" : "text-zinc-500 hover:text-white"}
            `}
          >
            EWC
          </button>
          <button
            onClick={() => setSelectedEvent("ENC")}
            className={`
              relative z-10 h-[46px] rounded-xl text-sm font-semibold transition-all
              ${selectedEvent === "ENC" ? "text-black" : "text-zinc-500 hover:text-white"}
            `}
          >
            ENC
          </button>
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

          {/* ── BROADCAST (with My Games child) ── */}
          {canViewBroadcastOrders && (
            <div>
              <ParentNavItem
                label="Broadcast Orders"
                active={broadcastActive}
                open={broadcastOpen}
                showChevron={showMyGames}
                onLabelClick={() => {
                  setActivePage("Broadcast")
                  setBroadcastOpen(true)
                }}
                onChevronClick={() => setBroadcastOpen((o) => !o)}
              />

              {showMyGames && (
                <div
                  className={`overflow-hidden transition-all duration-300 ease-in-out ${
                    broadcastOpen ? "max-h-24 opacity-100" : "max-h-0 opacity-0"
                  }`}
                >
                  <div className="mt-1 ml-4 border-l border-[#2A2A2A] pl-2 space-y-1">
                    <SidebarItem
                      active={activePage === "my-games"}
                      label="My Games"
                      onClick={() => setActivePage("my-games")}
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── MARKETING (with My Orders child) ── */}
          {canViewBroadcastOrders && (
            <div>
              <ParentNavItem
                label="Marketing Orders"
                active={marketingActive}
                open={marketingOpen}
                showChevron={showMyOrders}
                onLabelClick={() => {
                  setActivePage("marketing")
                  setMarketingOpen(true)
                }}
                onChevronClick={() => setMarketingOpen((o) => !o)}
              />

              {showMyOrders && (
                <div
                  className={`overflow-hidden transition-all duration-300 ease-in-out ${
                    marketingOpen ? "max-h-24 opacity-100" : "max-h-0 opacity-0"
                  }`}
                >
                  <div className="mt-1 ml-4 border-l border-[#2A2A2A] pl-2 space-y-1">
                    <SidebarItem
                      active={activePage === "my-orders"}
                      label="My Orders"
                      onClick={() => setActivePage("my-orders")}
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── NOTIFICATIONS ── */}
          {(currentUser?.role === "ADMIN" ||
            currentUser?.position === "PRODUCER" ||
            currentUser?.position === "POST_PRODUCTION_MANAGER" ||
            currentUser?.position === "TRANSLATOR") && (
            <div className="relative">
              <SidebarItem
                active={activePage === "notifications"}
                label="Notifications"
                onClick={() => setActivePage("notifications")}
              />
              {unreadNotifications > 0 && (
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

          {/* ── USERS ── */}
          {currentUser?.role === "ADMIN" && (
            <SidebarItem
              active={activePage === "users"}
              label="Users"
              onClick={() => setActivePage("users")}
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
            {`${currentUser?.firstName?.[0] || ""}${
              currentUser?.lastName?.[0] || ""
            }`.toUpperCase()}
          </div>

          {/* USER INFO */}
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-[#F5F1E8] truncate">
              {currentUser?.firstName} {currentUser?.lastName}
            </p>
            <p className="text-xs text-zinc-500 mt-1 truncate">
              {currentUser?.position || currentUser?.role}
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

/* ────────────────────────────────────────────────────
   ParentNavItem — a SidebarItem-styled button that
   also carries an optional chevron for toggling its
   child list.
──────────────────────────────────────────────────── */
function ParentNavItem({
  label,
  active,
  open,
  showChevron,
  onLabelClick,
  onChevronClick,
}: {
  label: string
  active: boolean
  open: boolean
  showChevron: boolean
  onLabelClick: () => void
  onChevronClick: () => void
}) {
  return (
    <div
      className={`
        group
        relative
        w-full
        flex
        items-center
        h-[54px]
        rounded-2xl
        overflow-hidden
        transition-all
        duration-300
        ${
          active
            ? "bg-[#D6B36A] text-black font-semibold shadow-[0_0_25px_rgba(214,179,106,0.18)]"
            : "text-zinc-400 bg-transparent hover:bg-[#151515] hover:text-[#F5F1E8]"
        }
      `}
    >
      {/* GLOW OVERLAY */}
      {active && (
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_left,rgba(255,255,255,0.22),transparent_60%)] pointer-events-none" />
      )}

      {/* LABEL CLICK AREA */}
      <button
        onClick={onLabelClick}
        className="relative z-10 flex-1 h-full text-left px-5 flex items-center gap-3"
      >
        <div
          className={`
            w-2 h-2 rounded-full flex-shrink-0 transition-all duration-300
            ${active ? "bg-black" : "bg-zinc-600 group-hover:bg-[#D6B36A]"}
          `}
        />
        <span className="text-[15px] tracking-[0.01em] leading-none">{label}</span>
      </button>

      {/* CHEVRON TOGGLE */}
      {showChevron && (
        <button
          onClick={(e) => {
            e.stopPropagation()
            onChevronClick()
          }}
          className="relative z-10 h-full px-4 flex items-center opacity-60 hover:opacity-100 transition-opacity"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={`transition-transform duration-300 ${open ? "rotate-180" : "rotate-0"}`}
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </button>
      )}
    </div>
  )
}
