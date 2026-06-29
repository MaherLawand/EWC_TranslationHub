import React from "react"
import Sidebar from "../components/layout/Sidebar"
import Topbar from "../components/layout/Topbar"
import UsersPage from "../components/pages/UsersPage"
import BroadcastOrdersTable from "../components/orders/BroadcastOrdersTable"
import MarketingOrdersTable from "../components/orders/MarketingOrdersTable"
import OrderDetailsSidebar from "../components/orders/OrderDetailsSidebar"
import OrderModal from "../components/orders/OrderModal"
import { FeedbackPanel } from "../components/orders/OrderFeedback"
import UserModal from "../components/users/UserModal"
import AssignGamesModal from "../components/users/AssignGamesModal"
import GamesPage from "../components/pages/GamesPage"
import NotificationsPage from "../components/pages/NotificationsPage"
import { api } from "../lib/api"
import { CONTENT_TITLES } from "../constants/contentTitles"
import { deadlineToFormParts } from "../lib/deadline"
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

      const isDeepLinkingRef = React.useRef(
  !!new URLSearchParams(window.location.search).get("orderId")
)



  const [hasInitializedPage, setHasInitializedPage] =
    React.useState(false)

  const [isNotFound, setIsNotFound] =
    React.useState(false)


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
  // Only "Broadcast" and "marketing" are valid deep-link destinations; anything
  // else is rejected here (URL parsing effect will show 404).
  const VALID_DEEP_LINK_PAGES = ["Broadcast", "marketing"]
  const [activePage, setActivePage] = React.useState<string>(() => {
    const params = new URLSearchParams(window.location.search)
    const urlPage = params.get("page")
    if (urlPage && VALID_DEEP_LINK_PAGES.includes(urlPage)) return urlPage
    // orderId present but no valid page — defer to deep-link effect so the
    // role-based default never flashes before the correct page is known
    if (params.get("orderId")) return ""
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

  // Game-tier sort (Broadcast only). Mutually exclusive with deadline sort.
  const [tierSort, setTierSort] =
    React.useState("")

  // Game-tier filter (Broadcast only): "" = all, or "1" | "2" | "3".
  const [tierFilter, setTierFilter] =
    React.useState("")

  // Activating one sort clears the other so only one ordering is ever applied.
  const changeDeadlineSort = (v: string) => { setDeadlineSort(v); if (v) setTierSort("") }
  const changeTierSort = (v: string) => { setTierSort(v); if (v) setDeadlineSort("") }

  const [selectedGameFilter, setSelectedGameFilter] =
    React.useState("")

  const [contentTitleFilter, setContentTitleFilter] =
    React.useState("")

  const [orderIdFilter, setOrderIdFilter] =
    React.useState<string>(() => new URLSearchParams(window.location.search).get("orderId") ?? "")

  const [selectedEvent, setSelectedEvent] = React.useState<string>(() => {
    const e = new URLSearchParams(window.location.search).get("event")
    return e === "ENC" ? "ENC" : "EWC"
  })

  const [newOrder, setNewOrder] = React.useState({
    title: "",
    contentTitle: "",
    aspectRatios: [] as string[],
    notes: "",
    game: "",
    type: "BROADCAST",
    event: "EWC",
    status: "PENDING",
    priority: "MEDIUM",
    sourceLanguage: [],
    targetLanguages: [] as string[],
    deliveryFormats: [],
    deadline: "",
    deadlineTime: "",
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
  // Initialised synchronously so the currentUser init effect (which runs in
  // the same render cycle as the URL-parsing effect) always sees the correct
  // values, even when currentUser is already available from initialUser.
  const _initUrlPage = new URLSearchParams(window.location.search).get("page")
  const urlPageRef = React.useRef<string | null>(
    _initUrlPage && VALID_DEEP_LINK_PAGES.includes(_initUrlPage) ? _initUrlPage : null
  )
  const urlOrderIdRef = React.useRef<string | null>(
    new URLSearchParams(window.location.search).get("orderId")
  )
  // skipResetRef: set true by currentUser-init when a pendingNav needs to
  // suppress filter-reset on the next activePage change.
  const skipResetRef = React.useRef(false)
  // Track previous activePage/selectedEvent to skip effect on first mount
  // (and React Strict Mode double-invocation) without the fragile cleanup trick.
  const prevActivePageRef = React.useRef(activePage)
  const prevEventRef = React.useRef(selectedEvent)
  // Set true before calling setSelectedEvent during deep-link/notification nav
  // so the selectedEvent effect doesn't clear the order we're about to open.
  const preserveOrderOnEventChange = React.useRef(false)
  // Set true before calling setActivePage during deep-link page correction so
  // the activePage effect doesn't reset filters or clear selectedOrder.
  const deepLinkPageSwitchRef = React.useRef(false)

  // If the URL already contains an orderId the sidebar will appear after data
  // loads. Pre-reserve its 480 px width from the very first render so the
  // table never shifts when the sidebar mounts (would be CLS because it happens
  // without user interaction).
  const [sidebarPrereserved, setSidebarPrereserved] = React.useState<boolean>(() => {
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
    lockedUsers,
    fetchLockedUsers,
    clearLockout,
    isClearingLockout,
    resendInvite,
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
    broadcastMode,
    marketingOrders,
    setMarketingOrders,
    marketingPage,
    marketingTotalPages,
    isLoadingMarketing,
    fetchMarketingOrders,
    marketingMode,
    fetchSubOrders,
    editedOrder,
    setEditedOrder,
    isSavingOrder,
    isEditingOrder,
    setIsEditingOrder,
    deletingOrderId,
    setDeletingOrderId,
    createOrder,
    createSubOrders,
    createBigOrder,
    updateOrder,
    updateOrderStatus,
    deleteOrder,
    orderCounts,
    selectedOrderDetail,
    setSelectedOrderDetail,
    isLoadingDetail,
    fetchOrderDetail,
    fetchOrderCounts,
    toListOrder,
    fetchOrderFeedback,
    createOrderFeedback,
    updateOrderFeedback,
    deleteOrderFeedback,
    markFeedbackRead,
    fetchUnreadFeedbackCounts,
  } = useOrders({
    activePage,
    search,
    statusFilter,
    priorityFilter,
    formatFilter,
    contentTitleFilter,
    selectedGameFilter,
    deadlineSort,
    tierSort,
    tierFilter,
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
    // Invalid page param → 404; clear refs so no effect tries to use them
    if (page && !VALID_DEEP_LINK_PAGES.includes(page)) {
      urlPageRef.current = null
      urlOrderIdRef.current = null
      setIsNotFound(true)
      window.history.replaceState({}, "", window.location.pathname)
      return
    }
    // Refs are already initialised synchronously above — just clean the URL
    if (page || orderId)
      window.history.replaceState({}, "", window.location.pathname)
  }, [])

  React.useEffect(() => {
    if (activePage !== "users") return
    fetchUsers(1, userSearch)
    if (currentUser?.role === "ADMIN") fetchLockedUsers()
  }, [activePage])

  React.useEffect(() => {
    if (activePage !== "notifications") return

    const hasUnread = currentUser?.notifications?.some(
      (n: any) => !n.isRead
    )

    if (!hasUnread) return

    // Give the user 4 seconds to see which notifications are unread before
    // marking them all as read. Clears if they navigate away first.
    const timer = setTimeout(() => markNotificationsAsRead(), 4000)
    return () => clearTimeout(timer)
  }, [activePage, currentUser])

  React.useEffect(() => {
    // Skip when activePage hasn't actually changed (first mount + Strict Mode remount).
    const prevPage = prevActivePageRef.current
    prevActivePageRef.current = activePage
    if (prevPage === activePage) return

    // Deep-link page correction (order.type didn't match URL page param) —
    // silently switch the tab without resetting filters or clearing the sidebar.
    if (deepLinkPageSwitchRef.current) {
      deepLinkPageSwitchRef.current = false
      return
    }



    if (pendingNavRef.current) {
      const pending = pendingNavRef.current
      pendingNavRef.current = null
      setSearch(pending.search)
      if (pending.order) {
        setSelectedOrder(pending.order)
        fetchOrderDetail(pending.order.id)
      }
    } else if (skipResetRef.current) {
      skipResetRef.current = false
      setSelectedOrder(null)
      setSelectedOrderDetail(null)
      setSidebarPrereserved(false)
    }else {
  setSelectedOrder(null)
  setSelectedOrderDetail(null)
  setSidebarPrereserved(false)

  if (!isDeepLinkingRef.current) {
    resetFilters()
  }
}
  }, [activePage])

  // When any manual filter changes while a deep-link pin (orderIdFilter) is
  // active, release the pin and close the sidebar so normal filtering takes over.
  const prevFiltersRef = React.useRef({
    search, statusFilter, priorityFilter, formatFilter,
    contentTitleFilter, selectedGameFilter, deadlineSort,
  })
  React.useEffect(() => {
    if (!orderIdFilter) return
    const prev = prevFiltersRef.current
    const next = { search, statusFilter, priorityFilter, formatFilter, contentTitleFilter, selectedGameFilter, deadlineSort }
    prevFiltersRef.current = next
    const changed =
      prev.search !== search ||
      prev.statusFilter !== statusFilter ||
      prev.priorityFilter !== priorityFilter ||
      prev.formatFilter !== formatFilter ||
      prev.contentTitleFilter !== contentTitleFilter ||
      prev.selectedGameFilter !== selectedGameFilter ||
      prev.deadlineSort !== deadlineSort
    if (!changed) return
    setOrderIdFilter("")
    setSelectedOrder(null)
    setSelectedOrderDetail(null)
    setSidebarPrereserved(false)
  }, [search, statusFilter, priorityFilter, formatFilter, contentTitleFilter, selectedGameFilter, deadlineSort])

React.useEffect(() => {
  // Skip when selectedEvent hasn't actually changed (first mount + Strict Mode remount).
  const prevEvent = prevEventRef.current
  prevEventRef.current = selectedEvent
  if (prevEvent === selectedEvent) return

  if (preserveOrderOnEventChange.current) {
    preserveOrderOnEventChange.current = false
    return
  }

  setSelectedOrder(null)
  setSelectedOrderDetail(null)
  setEditedOrder(null)
  setSidebarPrereserved(false)

  resetFilters()
}, [selectedEvent])

  React.useEffect(() => {
    if (!currentUser || hasInitializedPage) return

    // Deep-link: honour URL page param over role-based default.
    // Also skip role-based init when orderId is present without a page param —
    // the deep-link effect will set the correct page after fetchOrderDetail.
    if (urlPageRef.current) {
      setActivePage(urlPageRef.current)
      urlPageRef.current = null
    } else if (urlOrderIdRef.current) {
      // deep-link without page — leave activePage="" until deep-link resolves
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

    // Set orderIdFilter so useOrders fetches the specific deep-linked order.
    // No need to set skipResetRef here — the activePage effect skips its first
    // fire entirely (isInitialActivePage guard), so there is no race.
    // if (urlOrderIdRef.current) {
    //   setOrderIdFilter(urlOrderIdRef.current)
    // }

    setHasInitializedPage(true)
  }, [currentUser, hasInitializedPage])

  // Deep-link: open the specific order sidebar once page is ready
  React.useEffect(() => {
    if (!hasInitializedPage || !currentUser || !urlOrderIdRef.current) return
    const orderId = urlOrderIdRef.current
    urlOrderIdRef.current = null
    // Open sidebar immediately with a skeleton placeholder while detail loads.
    setSelectedOrder({ id: orderId } as any)
    fetchOrderDetail(orderId).then((order) => {
      if (!order) {
        // Invalid / not-found orderId — close sidebar and release reserved space
        setSelectedOrder(null)
        setSidebarPrereserved(false)
        return
      }
      // Validate event — only EWC and ENC are supported
      if (order.event && !["EWC", "ENC"].includes(order.event)) {
        setIsNotFound(true)
        setSidebarPrereserved(false)
        return
      }
      // Switch event tab to match the order — guard against selectedEvent effect
      // clearing selectedOrder after this render.
      if (order.event && order.event !== selectedEvent) {
        preserveOrderOnEventChange.current = true
        setSelectedEvent(order.event)
      }
      // Correct the page if URL page param doesn't match order type (or was absent).
      // Use deepLinkPageSwitchRef so the activePage effect doesn't reset filters.
      const correctPage = order.type === "MARKETING" ? "marketing" : "Broadcast"
      if (activePage !== correctPage) {
        deepLinkPageSwitchRef.current = true
        setActivePage(correctPage)
      }
        setOrderIdFilter(order.id)
      setSelectedOrder(order)
        isDeepLinkingRef.current = false
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

  // Keep live refs so the socket closure (registered once on mount) always
  // calls the latest function / reads the latest state without going stale.
  // Updated INLINE during render (not in useEffect) so they are always current
  // before any event handler — useEffect runs after paint and can miss events.
  // Status patch signal for the order tables: a sub-order's status lives only in
  // each table's local subCache (lazy-loaded on expand), not in the top-level
  // orders state — so an in-place status update must be pushed into the tables.
  const [statusPatch, setStatusPatch] = React.useState<{ id: string; status: string; nonce: number } | null>(null)

  // Bumped on any structural change (create / edit / delete) so the order tables
  // refresh the sub-orders of currently-expanded parents. Pure status changes use
  // statusPatch instead (lightweight in-place, no refetch).
  const [subRefresh, setSubRefresh] = React.useState(0)

  // Feedback: which order's feedback panel is open (translator), and a nonce
  // bumped by the "order-feedback" socket event so open panels/bubbles refresh.
  // The panel lives at page level (not inside a table row) so a list refresh
  // never unmounts it or clears the translator's draft.
  const [feedbackOrder, setFeedbackOrder] = React.useState<{ id: string; title: string } | null>(null)
  const [feedbackRefresh, setFeedbackRefresh] = React.useState(0)

  // Per-order unread feedback counts (messages not authored/read by me) → badges.
  const [feedbackUnread, setFeedbackUnread] = React.useState<Record<string, number>>({})

  // Recompute unread counts for whatever orders are currently loaded.
  const refreshUnreadCounts = React.useCallback(() => {
    const ids = [...broadcastOrders, ...marketingOrders].map((o: any) => o.id).filter(Boolean)
    if (ids.length === 0) { setFeedbackUnread({}); return }
    fetchUnreadFeedbackCounts(ids).then(setFeedbackUnread).catch(() => {})
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [broadcastOrders, marketingOrders])

  // Refresh whenever the loaded orders change or any feedback event fires.
  React.useEffect(() => {
    refreshUnreadCounts()
  }, [refreshUnreadCounts, feedbackRefresh])

  const selectedOrderDetailRef = React.useRef(selectedOrderDetail)
  selectedOrderDetailRef.current = selectedOrderDetail

  const fetchOrderDetailRef = React.useRef(fetchOrderDetail)
  fetchOrderDetailRef.current = fetchOrderDetail

  const fetchBroadcastOrdersRef = React.useRef(fetchBroadcastOrders)
  fetchBroadcastOrdersRef.current = fetchBroadcastOrders

  const fetchMarketingOrdersRef = React.useRef(fetchMarketingOrders)
  fetchMarketingOrdersRef.current = fetchMarketingOrders

  const broadcastPageRef = React.useRef(broadcastPage)
  broadcastPageRef.current = broadcastPage

  const marketingPageRef = React.useRef(marketingPage)
  marketingPageRef.current = marketingPage

  // Refresh the top-bar counts scoped to the CURRENT page (same type/assignedOnly
  // mapping the hook uses on page load). Called from socket events via a live ref
  // so it always uses the current activePage/event/filters — calling the bare
  // fetchOrderCounts() omitted the type filter, which let other-department orders
  // (e.g. a completed marketing order) leak into the broadcast page's counts.
  function refreshOrderCounts() {
    if (activePage === "Broadcast") fetchOrderCounts("BROADCAST")
    else if (activePage === "my-games") fetchOrderCounts("BROADCAST", true)
    else if (activePage === "marketing") fetchOrderCounts("MARKETING")
    else if (activePage === "my-orders") fetchOrderCounts("MARKETING", true)
    else fetchOrderCounts()
  }
  const refreshOrderCountsRef = React.useRef(refreshOrderCounts)
  refreshOrderCountsRef.current = refreshOrderCounts

  React.useEffect(() => {
    if (!currentUser) return

    // The server reads the httpOnly JWT cookie automatically — no separate
    // auth handshake needed. withCredentials sends the cookie on the upgrade.
    const socket = socketIo(import.meta.env.VITE_API_URL, {
      withCredentials: true,
    })

    // ── Real-time order list sync ─────────────────────────────────────────
    // order-created: debounce refetch so burst creates (multiple users at once)
    // collapse into a single request per client instead of one per mutation.
    // order-created: debounce re-fetch (collapses bursts); always page 1 so
    // the new order appears at the top. Respects active filters via the ref.
    let createdTimer: ReturnType<typeof setTimeout> | null = null
    socket.on("order-created", ({ type }: { type: string }) => {
      if (createdTimer) clearTimeout(createdTimer)
      createdTimer = setTimeout(() => {
        if (type === "BROADCAST") { fetchBroadcastOrdersRef.current(1); refreshOrderCountsRef.current() }
        else if (type === "MARKETING") { fetchMarketingOrdersRef.current(1); refreshOrderCountsRef.current() }
        // A new sub-order may belong to an expanded parent → refresh its rows.
        setSubRefresh((n) => n + 1)
      }, 2000)
    })

    // order-patched:
    //   • with status  → patch row in-place (zero DB queries)
    //   • without status → full edit: debounce re-fetch staying on current page
    //                      + immediately refresh sidebar if that order is open
    let patchedTimer: ReturnType<typeof setTimeout> | null = null
    socket.on("order-patched", ({ id, type, status }: { id: string; type: string; status?: string }) => {
      if (status) {
        // Status-only — patch in-place, no re-fetch.
        // Bail out early if the order already has this status in local state
        // (deduplicates concurrent socket events for the same change).
        // Completing an order also clears its "source changed" flag (server does
        // the same), so it won't reappear when the order is later reopened.
        const patch = (o: any) => ({ ...o, status, ...(status === "COMPLETED" ? { sourceChangedAt: null } : {}) })
        if (type === "BROADCAST") {
          setBroadcastOrders((prev: any[]) => {
            const target = prev.find((o) => o.id === id)
            if (target && target.status === status) return prev
            return prev.map((o) => o.id === id ? patch(o) : o)
          })
        } else if (type === "MARKETING") {
          setMarketingOrders((prev: any[]) => {
            const target = prev.find((o) => o.id === id)
            if (target && target.status === status) return prev
            return prev.map((o) => o.id === id ? patch(o) : o)
          })
        }
        // Push the patch into the tables so a sub-order row inside an expanded
        // parent's subCache (which isn't in the top-level state) also updates.
        setStatusPatch({ id, status, nonce: Date.now() })
        // A status change moves an order between buckets → refresh the top-bar counts.
        refreshOrderCountsRef.current()
        // Patch the open sidebar in-place so the user never sees a stale badge.
        // Case 1: the sidebar is showing the order whose status just changed.
        // selectedOrder drives the header badge; selectedOrderDetail drives the
        // richer detail section — both must be patched.
        if (selectedOrderDetailRef.current?.id === id) {
          setSelectedOrder((prev: any) => prev ? { ...prev, status } : prev)
          setSelectedOrderDetail((prev: any) => prev ? { ...prev, status } : prev)
        }
        // Case 2: the sidebar is showing a parent whose sub-order was just patched.
        if (selectedOrderDetailRef.current?.subOrders?.some((s: any) => s.id === id)) {
          setSelectedOrderDetail((prev: any) =>
            prev
              ? { ...prev, subOrders: prev.subOrders.map((s: any) => s.id === id ? { ...s, status } : s) }
              : prev
          )
        }
      } else {
        // Full edit — stay on the user's current page, preserve filters
        if (patchedTimer) clearTimeout(patchedTimer)
        patchedTimer = setTimeout(() => {
          if (type === "BROADCAST") fetchBroadcastOrdersRef.current(broadcastPageRef.current)
          else if (type === "MARKETING") fetchMarketingOrdersRef.current(marketingPageRef.current)
          // The edited order may be a sub-order inside an expanded parent (its row
          // lives in the table's subCache, not the top-level list) → refresh it.
          setSubRefresh((n) => n + 1)
        }, 1000)
        // Sidebar refresh — immediate, no debounce needed
        if (selectedOrderDetailRef.current?.id === id) {
          fetchOrderDetailRef.current(id)
        }
      }
    })

    // order-deleted: remove from list in-place, no re-fetch needed
    socket.on("order-deleted", ({ id, type }: { id: string; type: string }) => {
      if (type === "BROADCAST") {
        setBroadcastOrders((prev: any[]) => prev.filter((o) => o.id !== id))
      } else if (type === "MARKETING") {
        setMarketingOrders((prev: any[]) => prev.filter((o) => o.id !== id))
      }
      refreshOrderCountsRef.current()
      // A deleted sub-order may still be cached under an expanded parent → refresh.
      setSubRefresh((n) => n + 1)
    })

    // order-feedback: feedback was added/edited/deleted on some order.
    //  • bump a nonce so any OPEN panel/bubble refreshes its thread in place
    //  • refresh the order lists (current page) so each row's feedback-count
    //    badge stays accurate. The panel lives at page level, so this list
    //    refresh never closes it or touches the translator's draft.
    let feedbackTimer: ReturnType<typeof setTimeout> | null = null
    socket.on("order-feedback", () => {
      setFeedbackRefresh((n) => n + 1)
      if (feedbackTimer) clearTimeout(feedbackTimer)
      feedbackTimer = setTimeout(() => {
        fetchBroadcastOrdersRef.current(broadcastPageRef.current)
        fetchMarketingOrdersRef.current(marketingPageRef.current)
      }, 600)
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
      if (createdTimer) clearTimeout(createdTimer)
      if (patchedTimer) clearTimeout(patchedTimer)
      if (feedbackTimer) clearTimeout(feedbackTimer)
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
      const res = await fetch(
        `${import.meta.env.VITE_API_URL}/orders/notifications/read`,
        { method: "PATCH", credentials: "include" }
      )
      if (!res.ok) return
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
      notification.order?.type ??
      (notification.type === "ASSIGNED_TO_ORDER" ? "MARKETING" : null)

    // Switch event tab if the order belongs to a different event.
    // Guard against selectedEvent effect clearing the sidebar we're about to open.
    const orderEvent = notification.order?.event
    if (orderEvent) {
      preserveOrderOnEventChange.current = true
      setSelectedEvent(orderEvent)
    }

    // `order` is looked up from the currently loaded list. For ENC orders when
    // selectedEvent is EWC (or vice-versa) it won't be in the list yet, so fall
    // back to the slim embed on the notification itself — enough to open the
    // sidebar while fetchOrderDetail loads the full data.
    const orderToOpen = order ?? (notification.order?.id ? notification.order : null)

    pendingNavRef.current = {
      search: notification.order?.title ?? "",
      order: orderToOpen,
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
    // A translator opening the order clears the "source changed" caution (mirrors
    // the server, which only clears for translators). Managers must NOT clear it.
    if (order?.sourceChangedAt && currentUser?.position === "TRANSLATOR") {
      const clear = (prev: any[]) => prev.map((o) => o.id === order.id ? { ...o, sourceChangedAt: null } : o)
      setBroadcastOrders(clear)
      setMarketingOrders(clear)
    }
  }

  // Duplicate flow: open the order modal in CREATE mode, pre-filled with every
  // field of the selected order, so the user reviews and creates it manually.
  async function openDuplicateOrder(order: any) {
    // Pull the full detail so every field (links, deliveries, languages) is present.
    const detail = await fetchOrderDetail(order.id)
    const src = detail || order
    const isMarketing = src.type === "MARKETING"
    const detailSide = isMarketing ? src.marketing : src.broadcast

    setIsEditing(false)
    setEditingOrderId("")
    setNewOrder({
      title: src.title || "",
      contentTitle: src.marketing?.contentTitle || "",
      aspectRatios: detailSide?.aspectRatios || [],
      notes: src.notes || "",
      game: src.broadcast?.gameId || "",
      type: src.type || "BROADCAST",
      event: src.event || selectedEvent,
      status: src.status || "PENDING",
      priority: src.priority || "MEDIUM",
      sourceLanguage: detailSide?.sourceLanguage || [],
      targetLanguages: detailSide?.targetLanguages || [],
      deliveryFormats:
        detailSide?.deliveryFormats?.map((f: any) => ({
          format: f.format,
          deliveryLink: f.deliveryLink || "",
        })) || [],
      deadline: deadlineToFormParts(detailSide?.deadlineDate, src.type === "MARKETING" && detailSide?.deadlineHasTime).date,
      deadlineTime: deadlineToFormParts(detailSide?.deadlineDate, src.type === "MARKETING" && detailSide?.deadlineHasTime).time,
      sourceFileLink: detailSide?.sourceFileLink || "",
      srtAvailableLink: detailSide?.srtAvailableLink || "",
      estimatedMinutes: String(src.broadcast?.estimatedMinutes || ""),
      deliveryDate: src.broadcast?.deliveryDate?.split("T")[0] || "",
      deliveries:
        detailSide?.deliveries?.map((d: any) => ({
          language: d.language,
          deliveryLink: d.deliveryLink || "",
        })) || [],
    })
    setShowModal(true)
  }

  function resetOrderState() {
    setNewOrder({
      title: "",
      contentTitle: "",
      aspectRatios: [],
      notes: "",
      game: "",
      type: "BROADCAST",
      event: "EWC",
      status: "PENDING",
      priority: "MEDIUM",
      sourceLanguage: [],
      targetLanguages: [],
      deliveryFormats: [],
      deadline: "",
      deadlineTime: "",
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
    setTierSort("")
    setTierFilter("")
    setSelectedGameFilter("")
    setContentTitleFilter("")
    setOrderIdFilter("")
    setSelectedEvent(selectedEvent)
  }

  // True when at least one filter/sort/search differs from its default — used to
  // disable the Reset button when there's nothing to reset.
  const hasActiveFilters =
    search.trim() !== "" ||
    statusFilter !== "All Statuses" ||
    priorityFilter !== "All Priorities" ||
    formatFilter.length > 0 ||
    deadlineSort !== "" ||
    tierSort !== "" ||
    tierFilter !== "" ||
    selectedGameFilter !== "" ||
    contentTitleFilter !== "" ||
    orderIdFilter !== ""

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

  function getDeadlineInfo(deadlineDate: string, hasTime = false) {
    const now = new Date()
    const deadline = new Date(deadlineDate)

    const startToday = new Date()
    startToday.setHours(0, 0, 0, 0)
    const startDeadline = new Date(deadline)
    startDeadline.setHours(0, 0, 0, 0)
    const diffDays = Math.round(
      (startDeadline.getTime() - startToday.getTime()) / (1000 * 60 * 60 * 24)
    )

    // Same calendar day AND a real time-of-day → show precise hours/minutes
    // instead of the vague "Due today".
    if (diffDays === 0 && hasTime) {
      const diffMin = Math.round((deadline.getTime() - now.getTime()) / 60000)
      const fmt = (mins: number) => {
        const h = Math.floor(mins / 60)
        const m = mins % 60
        return h > 0 ? `${h}h ${m}m` : `${m}m`
      }
      if (diffMin <= 0) return { text: `${fmt(Math.max(1, -diffMin))} overdue`, color: "text-red-400" }
      return { text: `${fmt(diffMin)} left`, color: "text-red-400" }
    }

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

                {/* CONTENT TITLE PILLS */}
                {(activePage === "marketing" || activePage === "my-orders") && (
                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    {CONTENT_TITLES.map((title) => {
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
                              ? "gear-fill border-transparent shadow-[0_0_18px_rgba(214,179,106,0.25)]"
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

                    {(() => {
                      const gameList = activePage === "my-games"
                        ? (currentUser?.assignedGames || [])
                            .map((assignment: any) =>
                              filteredGames.find((g) => g.id === assignment.gameId) ?? assignment.game
                            )
                            .filter(Boolean)
                        : filteredGames

                      if (activePage === "my-games" && gameList.length === 0) {
                        return (
                          <p className="text-sm text-zinc-500 py-1">
                            You're not assigned to any game. Please contact your lead.
                          </p>
                        )
                      }

                      return gameList.map((game: any) => {
                        const active = selectedGameFilter === game.id
                        return (
                          <button
                            key={game.id}
                            onClick={() => setSelectedGameFilter(active ? "" : game.id)}
                            title={game.name}
                            className={`
                              group relative w-[88px] flex flex-col items-center justify-start gap-1.5
                              rounded-2xl transition-all duration-200
                              ${active ? "scale-110" : "hover:scale-110"}
                            `}
                          >
                            <div
                              className={`
                                w-[80px] h-[80px] flex items-center justify-center transition-opacity duration-200
                                ${active ? "opacity-100" : "opacity-55 group-hover:opacity-100"}
                              `}
                            >
                              <img
                                src={game.logo}
                                alt={game.name}
                                className={`
                                  relative z-10 w-[60px] h-[60px] object-contain
                                  ${active ? "border border-[#D6B36A] rounded-lg p-1" : ""}
                                `}
                              />
                            </div>
                            <span
                              className={`
                                w-full text-center text-[10px] leading-tight truncate
                                ${active ? "text-[#D6B36A] font-semibold" : "text-zinc-200"}
                              `}
                            >
                              {game.name}
                            </span>
                          </button>
                        )
                      })
                    })()}

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
                lockedUsers={currentUser?.role === "ADMIN" ? lockedUsers : []}
                clearLockout={clearLockout}
                isClearingLockout={isClearingLockout}
                resendInvite={currentUser?.role === "ADMIN" ? resendInvite : undefined}
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
                  orders={(orderIdFilter ? broadcastOrders.filter(o => o.id === orderIdFilter) : broadcastOrders).map((o: any) => ({ ...o, unreadFeedbackCount: feedbackUnread[o.id] ?? 0 }))}
                  page={broadcastPage}
                  totalPages={broadcastTotalPages}
                  onPageChange={(p) => fetchBroadcastOrders(p)}
                  onRowClick={onRowClick}
                  updateOrderStatus={updateOrderStatus}
                  getDeadlineInfo={getDeadlineInfo}
                  deadlineSort={deadlineSort}
                  setDeadlineSort={changeDeadlineSort}
                  tierSort={tierSort}
                  setTierSort={changeTierSort}
                  tierFilter={tierFilter}
                  setTierFilter={setTierFilter}
                  onResetFilters={resetFilters}
                  filtersActive={hasActiveFilters}
                  search={search}
                  setSearch={setSearch}
                  priorityFilter={priorityFilter}
                  setPriorityFilter={setPriorityFilter}
                  formatFilter={formatFilter}
                  setFormatFilter={setFormatFilter}
                  selectedEvent={selectedEvent}
                  mode={broadcastMode}
                  fetchSubOrders={fetchSubOrders}
                  statusPatch={statusPatch}
                  subRefresh={subRefresh}
                  canManageOrders={canManageOrders}
                  onDuplicate={openDuplicateOrder}
                  onOpenFeedback={(o: any) => setFeedbackOrder({ id: o.id, title: o.title })}
                  fetchOrderFeedback={fetchOrderFeedback}
                  feedbackRefresh={feedbackRefresh}
                  markFeedbackRead={markFeedbackRead}
                  onFeedbackRead={refreshUnreadCounts}
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
                  orders={(orderIdFilter ? marketingOrders.filter(o => o.id === orderIdFilter) : marketingOrders).map((o: any) => ({ ...o, unreadFeedbackCount: feedbackUnread[o.id] ?? 0 }))}
                  currentUser={currentUser}
                  page={marketingPage}
                  totalPages={marketingTotalPages}
                  onPageChange={(p) => fetchMarketingOrders(p)}
                  onRowClick={onRowClick}
                  updateOrderStatus={updateOrderStatus}
                  getDeadlineInfo={getDeadlineInfo}
                  onAssignUsers={onAssignUsers}
                  deadlineSort={deadlineSort}
                  setDeadlineSort={changeDeadlineSort}
                  onResetFilters={resetFilters}
                  filtersActive={hasActiveFilters}
                  search={search}
                  setSearch={setSearch}
                  priorityFilter={priorityFilter}
                  setPriorityFilter={setPriorityFilter}
                  formatFilter={formatFilter}
                  setFormatFilter={setFormatFilter}
                  selectedEvent={selectedEvent}
                  mode={marketingMode}
                  fetchSubOrders={fetchSubOrders}
                  statusPatch={statusPatch}
                  subRefresh={subRefresh}
                  canManageOrders={canManageOrders}
                  onDuplicate={openDuplicateOrder}
                  onOpenFeedback={(o: any) => setFeedbackOrder({ id: o.id, title: o.title })}
                  fetchOrderFeedback={fetchOrderFeedback}
                  feedbackRefresh={feedbackRefresh}
                  markFeedbackRead={markFeedbackRead}
                  onFeedbackRead={refreshUnreadCounts}
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
                  if (!v) {
                    setSelectedOrderDetail(null)
                    setSidebarPrereserved(false)
                  }
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
                onSelectOrder={onRowClick}
                createSubOrders={createSubOrders}
              />
            )}
          </div>

        </div>

        {/* DELETE CONFIRM MODAL */}
        {showDeleteModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center px-4">
            <div className="w-full max-w-[480px] bg-[#0C0C0C]/95 border border-white/10 backdrop-blur-2xl rounded-3xl p-8 shadow-[0_20px_80px_rgba(0,0,0,0.6)]">

              <div className="mb-6">
                <h2 className="text-2xl font-bold text-gear-gradient w-fit">Delete Order</h2>
                <p className="text-zinc-500 mt-3 leading-relaxed">
                  This action cannot be undone.
                  The order and all related delivery
                  assets will be permanently deleted.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setShowDeleteModal(false)}
                  className="bg-white/5 border border-white/15 text-zinc-300 py-3 rounded-2xl font-semibold hover:text-white hover:bg-white/10 transition"
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
          createBigOrder={createBigOrder}
          createSubOrders={createSubOrders}
          updateOrder={updateOrder}
          selectedEvent={selectedEvent}
          onAssignUsers={onAssignUsers}
          editingOrderId={editingOrderId}
          canAssignUsers={canManageOrders}
          setIsEditing={setIsEditing}
          setEditingOrderId={setEditingOrderId}
        />

        {/* FEEDBACK PANEL — page-level so list refreshes never disrupt the draft */}
        <FeedbackPanel
          order={feedbackOrder}
          currentUser={currentUser}
          onClose={() => setFeedbackOrder(null)}
          fetchOrderFeedback={fetchOrderFeedback}
          createOrderFeedback={createOrderFeedback}
          updateOrderFeedback={updateOrderFeedback}
          deleteOrderFeedback={deleteOrderFeedback}
          feedbackRefresh={feedbackRefresh}
          markFeedbackRead={markFeedbackRead}
          onRead={refreshUnreadCounts}
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
