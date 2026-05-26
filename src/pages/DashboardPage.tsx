import React from "react"
import Sidebar from "../components/layout/Sidebar"
import Topbar from "../components/layout/Topbar"
import UsersPage from "../components/pages/UsersPage"
import BroadcastOrdersTable from "../components/orders/BroadcastOrdersTable"
import MarketingOrdersTable from "../components/orders/MarketingOrdersTable"
import OrderDetailsSidebar from "../components/orders/OrderDetailsSidebar"
import OrderModal from "../components/orders/OrderModal"
import UserModal from "../components/users/UserModal"
import AssignGamesModal from "../components/users/AssignGamesModal"
import GamesPage from "../components/pages/GamesPage"
import NotificationsPage from "../components/pages/NotificationsPage"
import { api } from "../lib/api"
import { toast, ToastContainer } from "react-toastify"
import { useOrders } from "../hooks/useOrders"
import { useUsers } from "../hooks/useUsers"
import { useGames } from "../hooks/useGames"
import { io as socketIo } from "socket.io-client"

// Compute the user's landing page from their role/department/position.
// Called synchronously at useState initialisation time so the correct page
// (and therefore showFilters) is known on the very first render — preventing
// the filter-panel appearing/disappearing CLS.
function computeInitialPage(user: any): string {
  if (!user) return ""
  if (user.role === "ADMIN") return "Broadcast"
  if (user.position === "VIEWER") return "Broadcast"
  if (
    (user.position === "PRODUCER" || user.position === "POST_PRODUCTION_MANAGER") &&
    user.department === "BROADCAST"
  ) return "my-games"
  if (user.department === "MARKETING") return "marketing"
  return "Broadcast"
}

export default function App({ initialUser }: { initialUser?: any } = {}) {

  const [hasInitializedPage, setHasInitializedPage] =
    React.useState(false)

  const [isNotFound, setIsNotFound] =
    React.useState(false)

  const VALID_PAGES = ["Broadcast", "marketing", "my-games", "my-orders", "users", "notifications"]

  // Seed currentUser from the auth check that already completed in App.tsx —
  // avoids a blank currentUser on first render.
  const [currentUser, setCurrentUser] =
    React.useState<any>(initialUser ?? null)

  const [search, setSearch] =
    React.useState("")

  const [statusFilter, setStatusFilter] =
    React.useState("All Statuses")

  // Lazy initialiser: read URL params synchronously + use initialUser so the
  // correct activePage (and therefore showFilters) is set before first paint.
  const [activePage, setActivePage] = React.useState<string>(() => {
    const params = new URLSearchParams(window.location.search)
    const urlPage = params.get("page")
    if (urlPage) return urlPage
    return computeInitialPage(initialUser)
  })

  const [showModal, setShowModal] =
    React.useState(false)

  const [selectedOrder, setSelectedOrder] =
    React.useState<any>(null)

  const [priorityFilter, setPriorityFilter] =
    React.useState("All Priorities")

  const [formatFilter, setFormatFilter] =
    React.useState<string[]>([])

  const [deadlineSort, setDeadlineSort] =
    React.useState("")

  const [selectedGameFilter, setSelectedGameFilter] =
    React.useState("")

  const [contentTitleFilter, setContentTitleFilter] =
    React.useState("")

  const [orderIdFilter, setOrderIdFilter] =
    React.useState("")

  const [selectedEvent, setSelectedEvent] =
    React.useState("EWC")

  const [newOrder, setNewOrder] = React.useState({
    title: "",
    contentTitle: "",
    notes: "",
    game: "",
    type: "BROADCAST",
    event: "EWC",
    status: "PENDING",
    priority: "MEDIUM",
    sourceLanguage: [],
    targetLanguages: [] as string[],
    deliveryFormats: [{ format: "SRT", deliveryLink: "" }],
    deadline: "",
    sourceFileLink: "",
    srtAvailableLink: "",
    estimatedMinutes: "",
    deliveryDate: "",
    deliveries: [],
  })

  const [isEditing, setIsEditing] =
    React.useState(false)

  const [editingOrderId, setEditingOrderId] =
    React.useState("")

  const [showDeleteModal, setShowDeleteModal] =
    React.useState(false)

  const [mobileMenuOpen, setMobileMenuOpen] =
    React.useState(false)

  const pendingNavRef = React.useRef<{
    search: string
    order: any | null
  } | null>(null)

  // ── Favicon pulse ──────────────────────────────────────────────────────────
  const faviconPulseRef = React.useRef<ReturnType<typeof setInterval> | null>(null)
  const originalFaviconHref = React.useRef<string>("/favicon.ico")

  function getFaviconLink(): HTMLLinkElement {
    let el = document.querySelector<HTMLLinkElement>("link[rel~='icon']")
    if (!el) {
      el = document.createElement("link")
      el.rel = "icon"
      document.head.appendChild(el)
    }
    return el
  }

  function startFaviconPulse() {
    if (faviconPulseRef.current) return   // already running
    const link = getFaviconLink()
    originalFaviconHref.current = link.href || "/favicon.ico"

    const canvas = document.createElement("canvas")
    canvas.width = 32
    canvas.height = 32
    const ctx = canvas.getContext("2d")!

    function buildAndStart(notifDataUrl: string) {
      let showDot = true
      link.href = notifDataUrl
      faviconPulseRef.current = setInterval(() => {
        showDot = !showDot
        link.href = showDot ? notifDataUrl : originalFaviconHref.current
      }, 900)
    }

    const img = new Image()
    img.onload = () => {
      ctx.clearRect(0, 0, 32, 32)
      ctx.drawImage(img, 0, 0, 32, 32)
      // Golden glow dot — top-right corner
      ctx.save()
      ctx.shadowColor = "#D6B36A"
      ctx.shadowBlur = 6
      ctx.beginPath()
      ctx.arc(24, 8, 7, 0, Math.PI * 2)
      ctx.fillStyle = "#D6B36A"
      ctx.fill()
      ctx.restore()
      buildAndStart(canvas.toDataURL())
    }
    img.onerror = () => {
      // Fallback: solid golden circle
      ctx.beginPath()
      ctx.arc(16, 16, 14, 0, Math.PI * 2)
      ctx.fillStyle = "#D6B36A"
      ctx.fill()
      buildAndStart(canvas.toDataURL())
    }
    img.src = "/favicon.ico"
  }

  function stopFaviconPulse() {
    if (!faviconPulseRef.current) return
    clearInterval(faviconPulseRef.current)
    faviconPulseRef.current = null
    getFaviconLink().href = originalFaviconHref.current
  }

  // Deep-link: ?page=Broadcast&orderId=xxx
  const urlPageRef = React.useRef<string | null>(null)
  const urlOrderIdRef = React.useRef<string | null>(null)
  // Prevents the activePage effect from calling resetFilters() during deep-link init
  const skipResetRef = React.useRef(false)

  // If the URL already contains an orderId the sidebar will appear after data
  // loads. Pre-reserve its 480 px width from the very first render so the
  // table never shifts when the sidebar mounts (would be CLS because it happens
  // without user interaction).
  const [sidebarPrereserved] = React.useState<boolean>(() => {
    const params = new URLSearchParams(window.location.search)
    return !!params.get("orderId")
  })

  const canManageOrders =
    currentUser?.role === "ADMIN" ||
    currentUser?.position === "PRODUCER" ||
    currentUser?.position === "POST_PRODUCTION_MANAGER"

  /*
  ========================================
  HOOKS
  ========================================
  */
  const {
    users,
    usersPage,
    usersTotalPages,
    isLoadingUsers,
    fetchUsers,
    userSearch,
    setUserSearch,
    showUserModal,
    setShowUserModal,
    selectedUser,
    isEditingUser,
    userForm,
    setUserForm,
    isSavingUser,
    openCreateUserModal,
    openEditUserModal,
    createUser,
    updateUser,
    deleteUser,
  } = useUsers()

  const {
    games,
    gameSearch,
    setGameSearch,
    gameUsers,
    filteredGames,
    showAssignGamesModal,
    setShowAssignGamesModal,
    selectedUserForGames,
    selectedGames,
    isSavingAssignments,
    fetchGames,
    openAssignGamesModal,
    toggleGame,
    saveAssignments,
  } = useGames({ activePage, selectedGameFilter, fetchUsers })

  const {
    broadcastOrders,
    setBroadcastOrders,
    broadcastPage,
    broadcastTotalPages,
    isLoadingBroadcast,
    fetchBroadcastOrders,
    marketingOrders,
    setMarketingOrders,
    marketingPage,
    marketingTotalPages,
    isLoadingMarketing,
    fetchMarketingOrders,
    editedOrder,
    setEditedOrder,
    isSavingOrder,
    isEditingOrder,
    setIsEditingOrder,
    deletingOrderId,
    setDeletingOrderId,
    createOrder,
    updateOrder,
    updateOrderStatus,
    deleteOrder,
    orderCounts,
    selectedOrderDetail,
    setSelectedOrderDetail,
    isLoadingDetail,
    fetchOrderDetail,
    toListOrder,
  } = useOrders({
    activePage,
    search,
    statusFilter,
    priorityFilter,
    formatFilter,
    contentTitleFilter,
    selectedGameFilter,
    deadlineSort,
    selectedEvent,
    orderIdFilter,
    newOrder,
    resetOrderState,
    selectedOrder,
    setSelectedOrder,
    setShowModal,
    setShowDeleteModal,
    refreshNotifications,
    editingOrderId,
    setEditingOrderId,
    setIsEditing,
  })

  /*
  ========================================
  EFFECTS
  ========================================
  */
  React.useEffect(() => {
    fetchCurrentUser()
  }, [])

  // Stop favicon pulse when the user tabs back in
  React.useEffect(() => {
    function onVisibilityChange() {
      if (!document.hidden) stopFaviconPulse()
    }
    document.addEventListener("visibilitychange", onVisibilityChange)
    return () => document.removeEventListener("visibilitychange", onVisibilityChange)
  }, [])

  // Parse deep-link query params on first mount, then clean the URL
  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const page = params.get("page")
    const orderId = params.get("orderId")
    // Invalid page param → 404
    if (page && !VALID_PAGES.includes(page)) {
      setIsNotFound(true)
      window.history.replaceState({}, "", window.location.pathname)
      return
    }
    if (page) urlPageRef.current = page
    if (orderId) urlOrderIdRef.current = orderId
    if (page || orderId)
      window.history.replaceState({}, "", window.location.pathname)
  }, [])

  React.useEffect(() => {
    if (activePage !== "users") return
    fetchUsers(1, userSearch)
  }, [activePage])

  React.useEffect(() => {
    if (activePage !== "notifications") return

    const hasUnread = currentUser?.notifications?.some(
      (n: any) => !n.isRead
    )

    if (hasUnread) markNotificationsAsRead()
  }, [activePage, currentUser])

  React.useEffect(() => {
    if (pendingNavRef.current) {
      const pending = pendingNavRef.current
      pendingNavRef.current = null
      setSearch(pending.search)
      if (pending.order) {
        setSelectedOrder(pending.order)
        fetchOrderDetail(pending.order.id)
      }
    } else if (skipResetRef.current) {
      // Deep-link init set activePage + orderIdFilter together — skip resetFilters()
      // so it doesn't wipe orderIdFilter and cause a second unfiltered fetch
      skipResetRef.current = false
      setSelectedOrder(null)
      setSelectedOrderDetail(null)
    } else {
      setSelectedOrder(null)
      setSelectedOrderDetail(null)
      resetFilters()
    }
  }, [activePage])

  React.useEffect(() => {
    setSelectedOrder(null)
    setSelectedOrderDetail(null)
    setEditedOrder(null)
  }, [selectedEvent])

  React.useEffect(() => {
    if (!currentUser || hasInitializedPage) return

    // Deep-link: honour URL page param over role-based default
    if (urlPageRef.current) {
      setActivePage(urlPageRef.current)
      urlPageRef.current = null
    } else if (currentUser.role === "ADMIN") {
      setActivePage("Broadcast")
    } else if (currentUser.position === "VIEWER") {
      setActivePage("Broadcast")
    } else if (
      (currentUser.position === "PRODUCER" ||
        currentUser.position === "POST_PRODUCTION_MANAGER") &&
      currentUser.department === "BROADCAST"
    ) {
      setActivePage("my-games")
    } else if (currentUser.department === "MARKETING") {
      setActivePage("marketing")
    } else if (currentUser.department === "BROADCAST") {
      setActivePage("Broadcast")
    }

    // Batch orderIdFilter with activePage so useOrders only fetches once.
    // Also flag skipResetRef so the activePage effect doesn't call resetFilters()
    // and wipe orderIdFilter before useOrders gets to use it.
    if (urlOrderIdRef.current) {
      skipResetRef.current = true
      setOrderIdFilter(urlOrderIdRef.current)
    }

    setHasInitializedPage(true)
  }, [currentUser, hasInitializedPage])

  // Deep-link: open the specific order sidebar once page is ready
  React.useEffect(() => {
    if (!hasInitializedPage || !currentUser || !urlOrderIdRef.current) return
    const orderId = urlOrderIdRef.current
    urlOrderIdRef.current = null
    // orderIdFilter already set synchronously in the initialization effect above
    // (batched with setActivePage so useOrders only fires once)
    fetchOrderDetail(orderId).then((order) => {
      if (!order) return
      setSelectedOrder(order)
    })
  }, [hasInitializedPage, currentUser?.id])

  // Request browser notification permission once the user is loaded
  React.useEffect(() => {
    if (!currentUser) return
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission()
    }
  }, [currentUser?.id])

  // Keep document.title in sync with active page, open order, and unread count
  React.useEffect(() => {
    const unread = currentUser?.notifications?.filter((n: any) => !n.isRead).length ?? 0
    const badge = unread > 0 ? `(${unread}) ` : ""

    let pageLabel = "EWC Translations"
    if (selectedOrderDetail?.title) {
      pageLabel = selectedOrderDetail.title
    } else {
      switch (activePage) {
        case "Broadcast":     pageLabel = `${selectedEvent} | Broadcast Orders`; break
        case "my-games":      pageLabel = `${selectedEvent} | My Games`;         break
        case "marketing":     pageLabel = `${selectedEvent} | Marketing Orders`; break
        case "my-orders":     pageLabel = `${selectedEvent} | My Orders`;        break
        case "notifications": pageLabel = "Notifications";                       break
        case "users":         pageLabel = "Users";                               break
        default:              pageLabel = "EWC Translations";                    break
      }
    }

    document.title = `${badge}${pageLabel}`
  }, [activePage, selectedEvent, selectedOrderDetail?.title, currentUser?.notifications])

  React.useEffect(() => {
    if (!currentUser) return

    // The server reads the httpOnly JWT cookie automatically — no separate
    // auth handshake needed. withCredentials sends the cookie on the upgrade.
    const socket = socketIo(import.meta.env.VITE_API_URL, {
      withCredentials: true,
    })

    socket.on("new-notification", (notification: any) => {
      setCurrentUser((prev: any) => {
        if (!prev) return prev
        const already = prev.notifications?.some((n: any) => n.id === notification.id)
        if (already) return prev
        return {
          ...prev,
          notifications: [notification, ...(prev.notifications || [])].slice(0, 20),
        }
      })

      // Pulse the favicon + fire OS notification when the user is on another tab
      if (document.hidden) {
        startFaviconPulse()

        if (
          "Notification" in window &&
          Notification.permission === "granted"
        ) {
          const n = new Notification(notification.title ?? "New Notification", {
            body: notification.message ?? "",
            icon: "/favicon.ico",
            tag: notification.id, // deduplicate: same id = replace, not stack
          })
          // Clicking the OS notification brings the tab back into focus
          n.onclick = () => {
            window.focus()
            n.close()
          }
        }
      }
    })

    return () => {
      socket.disconnect()
    }
  }, [currentUser?.id])

  /*
  ========================================
  FUNCTIONS
  ========================================
  */
  async function fetchCurrentUser() {
    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/auth/me`,
        { credentials: "include" }
      )
      if (!response.ok) throw new Error("Failed to fetch current user")
      const data = await response.json()
      setCurrentUser(data)
    } catch (error) {
      console.error("Failed to fetch current user:", error)
    }
  }

  async function refreshNotifications() {
    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/auth/me`,
        { credentials: "include" }
      )
      if (!response.ok) return
      const updatedUser = await response.json()
      setCurrentUser((prev: any) => {
        if (
          JSON.stringify(prev?.notifications) ===
          JSON.stringify(updatedUser.notifications)
        ) {
          return prev
        }
        return { ...prev, notifications: updatedUser.notifications }
      })
    } catch (error) {
      console.error(error)
    }
  }

  async function markNotificationsAsRead() {
    try {
      await fetch(
        `${import.meta.env.VITE_API_URL}/orders/notifications/read`,
        { method: "PATCH", credentials: "include" }
      )
      setCurrentUser((prev: any) => ({
        ...prev,
        notifications: prev.notifications.map((n: any) => ({
          ...n,
          isRead: true,
        })),
      }))
      stopFaviconPulse()
    } catch (error) {
      console.error(error)
    }
  }

  async function logout() {
    try {
      await api.post("/auth/logout")
      window.location.replace("/login")
    } catch (error) {
      console.error(error)
    }
  }

  function navigateToOrder(notification: any, order: any | null) {
    const orderType =
      order?.type ??
      (notification.type === "ASSIGNED_TO_ORDER" ? "MARKETING" : null)

    pendingNavRef.current = {
      search: notification.order?.title ?? "",
      order,
    }

    setActivePage(orderType === "MARKETING" ? "marketing" : "Broadcast")
  }

  async function onAssignUsers(orderId: string, userIds: string[]) {
    const response = await fetch(
      `${import.meta.env.VITE_API_URL}/orders/${orderId}/assign`,
      {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userIds }),
      }
    )
    if (!response.ok) throw new Error("Failed to assign users")
    const updated = await response.json()
    if (updated.type === "BROADCAST") {
      setBroadcastOrders((prev: any[]) =>
        prev.map((o: any) => (o.id === updated.id ? toListOrder(updated) : o))
      )
    } else {
      setMarketingOrders((prev: any[]) =>
        prev.map((o: any) => (o.id === updated.id ? toListOrder(updated) : o))
      )
    }
    setSelectedOrderDetail(updated)
    setEditedOrder(JSON.parse(JSON.stringify(updated)))
  }

  function onRowClick(order: any) {
    setSelectedOrder(order)
    fetchOrderDetail(order.id)
  }

  function resetOrderState() {
    setNewOrder({
      title: "",
      contentTitle: "",
      notes: "",
      game: "",
      type: "BROADCAST",
      event: "EWC",
      status: "PENDING",
      priority: "MEDIUM",
      sourceLanguage: [],
      targetLanguages: [],
      deliveryFormats: [{ format: "SRT", deliveryLink: "" }],
      deadline: "",
      sourceFileLink: "",
      srtAvailableLink: "",
      estimatedMinutes: "",
      deliveryDate: "",
      deliveries: [],
    })
  }

  function resetFilters() {
    setSearch("")
    setStatusFilter("All Statuses")
    setPriorityFilter("All Priorities")
    setFormatFilter([])
    setDeadlineSort("")
    setSelectedGameFilter("")
    setContentTitleFilter("")
    setOrderIdFilter("")
    setSelectedEvent(selectedEvent)
  }

  function toggleLanguage(language: string) {
    setNewOrder((prev: any) => {
      const alreadySelected = prev.targetLanguages.includes(language)
      return {
        ...prev,
        targetLanguages: alreadySelected
          ? prev.targetLanguages.filter((l: string) => l !== language)
          : [...prev.targetLanguages, language],
        deliveries: alreadySelected
          ? prev.deliveries.filter((d: any) => d.language !== language)
          : [...prev.deliveries, { language, deliveryLink: "" }],
      }
    })
  }

  function getDeadlineInfo(deadlineDate: string) {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const deadline = new Date(deadlineDate)
    deadline.setHours(0, 0, 0, 0)
    const diffDays = Math.ceil(
      (deadline.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
    )

    if (diffDays === 0) return { text: "Due today", color: "text-red-400" }
    if (diffDays < 0) return { text: `${Math.abs(diffDays)} days overdue`, color: "text-red-400" }
    if (diffDays <= 3) return { text: `${diffDays} day${diffDays > 1 ? "s" : ""} left`, color: "text-yellow-400" }
    return { text: `${diffDays} day${diffDays > 1 ? "s" : ""} left`, color: "text-zinc-500" }
  }

  /*
  ========================================
  404
  ========================================
  */
  if (isNotFound) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-[#070707] text-white gap-5">
        <h1 className="text-8xl font-bold text-[#D6B36A]">404</h1>
        <p className="text-zinc-400 text-lg">This page doesn't exist.</p>
        <button
          onClick={() => {
            setIsNotFound(false)
            setActivePage(computeInitialPage(currentUser))
          }}
          className="mt-2 h-[48px] px-8 rounded-2xl bg-[#D6B36A] text-black text-sm font-bold tracking-wide hover:bg-[#E4C27C] transition-all"
        >
          Go to Dashboard
        </button>
      </div>
    )
  }

  /*
  ========================================
  DERIVED
  ========================================
  */
  const showFilters =
    activePage === "marketing" ||
    activePage === "my-orders" ||
    activePage === "Broadcast" ||
    activePage === "my-games"


  return (
    <div
      className="
        h-screen
        flex
        overflow-hidden
        text-white
        bg-[radial-gradient(circle_at_top,rgba(214,179,106,0.04),transparent_30%)]
        bg-[#070707]
      "
    >

      {/* LEFT SIDEBAR */}
      <Sidebar
        activePage={activePage}
        setActivePage={(page) => {
          setActivePage(page)
          setMobileMenuOpen(false)
        }}
        currentUser={currentUser}
        logout={logout}
        selectedEvent={selectedEvent}
        setSelectedEvent={setSelectedEvent}
        mobileOpen={mobileMenuOpen}
        onMobileClose={() => setMobileMenuOpen(false)}
      />

      {/* MAIN */}
      <main className="flex-1 flex flex-col overflow-hidden">

        {/* TOPBAR */}
        <Topbar
          activePage={activePage}
          setShowModal={setShowModal}
          canManageOrders={canManageOrders}
          orderCounts={orderCounts}
          currentUser={currentUser}
          statusFilter={statusFilter}
          setStatusFilter={setStatusFilter}
          onMobileMenuToggle={() => setMobileMenuOpen((o) => !o)}
        />

        {/* CONTENT */}
        <div className="flex-1 flex overflow-hidden">

          {/* TABLE AREA */}
          <div className="flex-1 overflow-auto px-4 sm:px-8 py-5 sm:py-7 space-y-5 sm:space-y-7 bg-[#070707]">

            {/* FILTERS */}
            {showFilters && (
              <div
                className="
                  border
                  border-[#242424]
                  overflow-x-auto
                  bg-[linear-gradient(180deg,#0F0F0F_0%,#0B0B0B_100%)]
                  rounded-[30px]
                  px-6
                  py-5
                  shadow-[0_15px_50px_rgba(0,0,0,0.45)]
                  space-y-5
                "
              >

                    {/* ACTIVE */}
                    {/* <div
                      className="
                        h-[54px]
                        px-5
                        rounded-2xl
                        border
                        border-[#2A2A2A]
                        bg-[#151515]
                        flex
                        items-center
                        text-sm
                        font-medium
                        text-[#D6B36A]
                        shadow-[0_0_20px_rgba(214,179,106,0.08)]
                      "
                    >
                      {
                        [
                          search,
                          statusFilter !== "All Statuses",
                          priorityFilter !== "All Priorities",
                          formatFilter.length > 0,
                          deadlineSort,
                          selectedGameFilter,
                          contentTitleFilter,
                          selectedEvent,
                        ].filter(Boolean).length
                      }{" "}
                      Active
                    </div> */}

                  </div>

                </div>

                {/* CONTENT TITLE PILLS */}
                {(activePage === "marketing" || activePage === "my-orders") && (
                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    {["Content 1", "Content 2", "Content 3", "Others"].map((title) => {
                      const active = contentTitleFilter === title
                      return (
                        <button
                          key={title}
                          onClick={() => setContentTitleFilter(active ? "" : title)}
                          className={`
                            px-4
                            py-1.5
                            rounded-2xl
                            border
                            text-sm
                            font-medium
                            transition-all
                            duration-200
                            cursor-pointer
                            ${active
                              ? "bg-[#D6B36A] text-black border-[#D6B36A] shadow-[0_0_18px_rgba(214,179,106,0.25)]"
                              : "bg-[#151515] text-zinc-400 border-[#2A2A2A] hover:border-[#3A3A3A] hover:text-white"
                            }
                          `}
                        >
                          {title}
                        </button>
                      )
                    })}
                  </div>
                )}

                {/* GAMES */}
                {(activePage === "Broadcast" || activePage === "my-games") && (
                  <div className="flex flex-wrap items-center gap-3 pt-1">

                    {(activePage === "my-games"
                      ? (currentUser?.assignedGames || [])
                          .map((assignment: any) => {
                            // Prefer entry from filteredGames (has server-rewritten logo URL)
                            // Fall back to game object embedded in the assignment
                            return filteredGames.find((g) => g.id === assignment.gameId) ?? assignment.game
                          })
                          .filter(Boolean)
                      : filteredGames
                    ).map((game: any) => {
                      const active = selectedGameFilter === game.id
                      return (
                        <button
                          key={game.id}
                          onClick={() =>
                            setSelectedGameFilter(active ? "" : game.id)
                          }
                          title={game.name}
                          className={`
                            relative
                            w-[80px]
                            h-[80px]
                            flex
                            items-center
                            justify-center
                            rounded-2xl
                            transition-all
                            duration-200
                            ${
                              active
                                ? "scale-110"
                                : "opacity-55 hover:opacity-100 hover:scale-110"
                            }
                          `}
                        >
                          {active && (
                            <div className="absolute inset-0 rounded-2xl" />
                          )}
                          <img
                            src={game.logo}
                            alt={game.name}
                            className={`
                              relative
                              z-10
                              w-[60px]
                              h-[60px]
                              object-contain
                              ${active ? "border border-[#D6B36A] rounded-lg p-1" : ""}
                            `}
                          />
                        </button>
                      )
                    })}

                  </div>
                )}

              </div>
            )}

            {/* USERS PAGE */}
            {activePage === "users" && (
              <UsersPage
                users={users}
                page={usersPage}
                totalPages={usersTotalPages}
                onPageChange={(p) => fetchUsers(p, userSearch)}
                isLoading={isLoadingUsers}
                deleteUser={deleteUser}
                search={userSearch}
                setSearch={setUserSearch}
                openCreateUserModal={openCreateUserModal}
                openEditUserModal={openEditUserModal}
                openAssignGamesModal={openAssignGamesModal}
              />
            )}

            {/* TABLE DATA */}
            <>
              {(activePage === "Broadcast" || activePage === "my-games") && (
                <GamesPage
                  games={games}
                  selectedGameFilter={selectedGameFilter}
                  setSelectedGameFilter={setSelectedGameFilter}
                  producers={gameUsers.producers}
                  ppms={gameUsers.ppms}
                />
              )}

              {(activePage === "dashboard" || activePage === "Broadcast" || activePage === "my-games") && (
                <BroadcastOrdersTable
                  isLoading={isLoadingBroadcast}
                  currentUser={currentUser}
                  orders={broadcastOrders}
                  page={broadcastPage}
                  totalPages={broadcastTotalPages}
                  onPageChange={(p) => fetchBroadcastOrders(p)}
                  onRowClick={onRowClick}
                  updateOrderStatus={updateOrderStatus}
                  getDeadlineInfo={getDeadlineInfo}
                  deadlineSort={deadlineSort}
                  setDeadlineSort={setDeadlineSort}
                  onResetFilters={resetFilters}
                  search={search}
                  setSearch={setSearch}
                  priorityFilter={priorityFilter}
                  setPriorityFilter={setPriorityFilter}
                  formatFilter={formatFilter}
                  setFormatFilter={setFormatFilter}
                />
              )}

              {activePage === "notifications" && (
                <NotificationsPage
                  notifications={currentUser?.notifications || []}
                  markNotificationsAsRead={markNotificationsAsRead}
                  orders={[...broadcastOrders, ...marketingOrders]}
                  navigateToOrder={navigateToOrder}
                />
              )}

              {(activePage === "dashboard" || activePage === "marketing" || activePage === "my-orders") && (
                <MarketingOrdersTable
                  isLoading={isLoadingMarketing}
                  orders={marketingOrders}
                  currentUser={currentUser}
                  page={marketingPage}
                  totalPages={marketingTotalPages}
                  onPageChange={(p) => fetchMarketingOrders(p)}
                  onRowClick={onRowClick}
                  updateOrderStatus={updateOrderStatus}
                  getDeadlineInfo={getDeadlineInfo}
                  onAssignUsers={onAssignUsers}
                  deadlineSort={deadlineSort}
                  setDeadlineSort={setDeadlineSort}
                  onResetFilters={resetFilters}
                  search={search}
                  setSearch={setSearch}
                  priorityFilter={priorityFilter}
                  setPriorityFilter={setPriorityFilter}
                />
              )}
            </>

          </div>

          {/* RIGHT SIDEBAR
              When arriving via a deep-link (?orderId=…) the sidebar will appear
              after data loads — without user interaction, so it counts as CLS.
              sidebarPrereserved pre-allocates the 480 px slot from the very
              first render so the table never shifts when the sidebar mounts.
              For normal use (row click) the slot is absent until the click,
              which is interaction-triggered and excluded from CLS measurement. */}
          <div
            className={
              selectedOrder || sidebarPrereserved
                ? "w-0 overflow-hidden lg:w-[480px] lg:h-full lg:flex-shrink-0"
                : "hidden"
            }
          >
            {selectedOrder && (
              <OrderDetailsSidebar
                selectedOrder={selectedOrder}
                orderDetail={selectedOrderDetail}
                isLoadingDetail={isLoadingDetail}
                currentUser={currentUser}
                setSelectedOrder={(v) => {
                  setSelectedOrder(v)
                  if (!v) setSelectedOrderDetail(null)
                }}
                setIsEditingOrder={setIsEditingOrder}
                setIsEditing={setIsEditing}
                setEditingOrderId={setEditingOrderId}
                setNewOrder={setNewOrder}
                setShowModal={setShowModal}
                showDeleteModal={showDeleteModal}
                setShowDeleteModal={setShowDeleteModal}
                setDeletingOrderId={setDeletingOrderId}
                deleteOrder={deleteOrder}
                canManageOrders={canManageOrders}
                getDeadlineInfo={getDeadlineInfo}
                activePage={activePage}
              />
            )}
          </div>

        </div>

        {/* DELETE CONFIRM MODAL */}
        {showDeleteModal && (
          <div className="fixed inset-0 bg-black/70 z-[100] flex items-center justify-center px-4">
            <div className="w-full max-w-[480px] bg-[#0E0E0E] border border-zinc-800 rounded-3xl p-8">

              <div className="mb-6">
                <div className="w-14 h-14 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400 text-2xl mb-5">
                  !
                </div>
                <h2 className="text-2xl font-bold">Delete Order</h2>
                <p className="text-zinc-500 mt-3 leading-relaxed">
                  This action cannot be undone.
                  The order and all related delivery
                  assets will be permanently deleted.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setShowDeleteModal(false)}
                  className="bg-zinc-900 border border-zinc-800 py-3 rounded-2xl font-semibold hover:bg-zinc-800 transition"
                >
                  Cancel
                </button>
                <button
                  onClick={deleteOrder}
                  className="bg-red-500 text-white py-3 rounded-2xl font-semibold hover:bg-red-600 transition"
                >
                  Delete Order
                </button>
              </div>

            </div>
          </div>
        )}

        {/* ORDER MODAL */}
        <OrderModal
          showModal={showModal}
          setShowModal={setShowModal}
          isEditing={isEditing}
          isSavingOrder={isSavingOrder}
          newOrder={newOrder}
          setNewOrder={setNewOrder}
          toggleLanguage={toggleLanguage}
          fetchGames={fetchGames}
          games={games}
          selectedOrder={selectedOrder}
          setSelectedOrder={setSelectedOrder}
          createOrder={createOrder}
          updateOrder={updateOrder}
          selectedEvent={selectedEvent}
          onAssignUsers={onAssignUsers}
          editingOrderId={editingOrderId}
          canAssignUsers={canManageOrders}
          setIsEditing={setIsEditing}
          setEditingOrderId={setEditingOrderId}
        />

        {/* USER MODAL */}
        <UserModal
          showUserModal={showUserModal}
          setShowUserModal={setShowUserModal}
          isEditingUser={isEditingUser}
          isSavingUser={isSavingUser}
          userForm={userForm}
          setUserForm={setUserForm}
          createUser={createUser}
          updateUser={updateUser}
        />

        {/* ASSIGN GAMES MODAL */}
        <AssignGamesModal
          show={showAssignGamesModal}
          onClose={() => setShowAssignGamesModal(false)}
          games={games}
          selectedGames={selectedGames}
          toggleGame={toggleGame}
          saveAssignments={saveAssignments}
          isSavingAssignments={isSavingAssignments}
          user={selectedUserForGames}
        />

        <ToastContainer
          position="top-right"
          autoClose={3000}
          theme="dark"
        />

      </main>
    </div>
  )
}
