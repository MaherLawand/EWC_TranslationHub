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
import PusherClient from "pusher-js"

export default function App() {

  const [hasInitializedPage, setHasInitializedPage] =
    React.useState(false)

  const [currentUser, setCurrentUser] =
    React.useState<any>(null)

  const [search, setSearch] =
    React.useState("")

  const [statusFilter, setStatusFilter] =
    React.useState("All Statuses")

  const [activePage, setActivePage] =
    React.useState("")

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

  const pendingNavRef = React.useRef<{
    search: string
    order: any | null
  } | null>(null)

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
    userSearch,
    setUserSearch,
    showUserModal,
    setShowUserModal,
    selectedUser,
    isEditingUser,
    userForm,
    setUserForm,
    isSavingUser,
    fetchUsers,
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
    orders,
    isLoadingOrders,
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
    statsOrders,
    setOrders,
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

  React.useEffect(() => {
    if (activePage !== "users") return
    fetchUsers()
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
        setEditedOrder(JSON.parse(JSON.stringify(pending.order)))
      }
    } else {
      setSelectedOrder(null)
      resetFilters()
    }
  }, [activePage])

  React.useEffect(() => {
    setSelectedOrder(null)
    setEditedOrder(null)
  }, [selectedEvent])

  React.useEffect(() => {
    if (!currentUser || hasInitializedPage) return

    if (currentUser.role === "ADMIN") {
      setActivePage("Broadcast")
    } else if (
      currentUser.role === "VIEWER" &&
      currentUser.department === "BROADCAST"
    ) {
      setActivePage("Broadcast")
    } else if (
      (currentUser.role === "VIEWER" || currentUser.role === "EDITOR") &&
      currentUser.department === "MARKETING"
    ) {
      setActivePage("marketing")
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

    setHasInitializedPage(true)
  }, [currentUser, hasInitializedPage])

  React.useEffect(() => {
    if (!currentUser) return

    const pusher = new PusherClient(
      import.meta.env.VITE_PUSHER_KEY,
      {
        cluster: import.meta.env.VITE_PUSHER_CLUSTER,
        channelAuthorization: {
          endpoint: `${import.meta.env.VITE_API_URL}/auth/pusher/auth`,
          transport: "ajax",
          customHandler: async ({ socketId, channelName }, callback) => {
            try {
              const res = await fetch(
                `${import.meta.env.VITE_API_URL}/auth/pusher/auth`,
                {
                  method: "POST",
                  credentials: "include",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    socket_id: socketId,
                    channel_name: channelName,
                  }),
                }
              )
              const data = await res.json()
              callback(null, data)
            } catch {
              callback(new Error("Pusher auth failed"), null)
            }
          },
        },
      }
    )

    const channel = pusher.subscribe(`private-user-${currentUser.id}`)

    channel.bind("new-notification", (notification: any) => {
      setCurrentUser((prev: any) => {
        if (!prev) return prev
        const already = prev.notifications?.some((n: any) => n.id === notification.id)
        if (already) return prev
        return {
          ...prev,
          notifications: [notification, ...(prev.notifications || [])].slice(0, 20),
        }
      })
    })

    return () => {
      channel.unbind_all()
      pusher.unsubscribe(`private-user-${currentUser.id}`)
      pusher.disconnect()
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
    setOrders((prev: any[]) =>
      prev.map((o: any) => (o.id === updated.id ? updated : o))
    )
    setSelectedOrder(updated)
    setEditedOrder(JSON.parse(JSON.stringify(updated)))
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
  DERIVED
  ========================================
  */
  const showFilters =
    activePage === "marketing" ||
    activePage === "Broadcast" ||
    activePage === "my-games"

  const safeOrders = Array.isArray(orders) ? orders : []
  const broadcastOrders = safeOrders.filter((o) => o.type === "BROADCAST")
  const marketingOrders = safeOrders.filter((o) => o.type === "MARKETING")

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
        setActivePage={setActivePage}
        currentUser={currentUser}
        logout={logout}
        selectedEvent={selectedEvent}
        setSelectedEvent={setSelectedEvent}
      />

      {/* MAIN */}
      <main className="flex-1 flex flex-col overflow-hidden">

        {/* TOPBAR */}
        <Topbar
          activePage={activePage}
          setShowModal={setShowModal}
          canManageOrders={canManageOrders}
          statsOrders={statsOrders}
          currentUser={currentUser}
        />

        {/* CONTENT */}
        <div className="flex-1 flex overflow-hidden">

          {/* TABLE AREA */}
          <div className="flex-1 overflow-auto px-8 py-7 space-y-7 bg-[#070707]">

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
                  backdrop-blur-2xl
                  space-y-5
                "
              >

                {/* TOP */}
                <div
                  className="
                    flex
                    items-start
                    justify-between
                    gap-5
                    flex-nowrap
                  "
                >
                  {/* LEFT */}
                  <div
                    className="
                      flex
                      items-center
                      gap-3
                      flex-1
                      min-w-0
                      flex-wrap
                      overflow-hidden
                    "
                  >

                    {/* SEARCH */}
                    <div className="relative flex-1 min-w-[240px]">
                      <input
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search orders"
                        className="
                          w-full
                          h-[54px]
                          bg-[#121212]
                          border
                          border-[#2A2A2A]
                          rounded-2xl
                          pl-5
                          pr-5
                          text-sm
                          text-white
                          outline-none
                          transition-all
                          placeholder:text-zinc-600
                          focus:border-[#D6B36A]
                          focus:bg-[#151515]
                          focus:shadow-[0_0_25px_rgba(214,179,106,0.10)]
                        "
                      />
                    </div>

                    {/* MARKETING FILTERS */}
                    {activePage === "marketing" && (
                      <>
                        {/* CONTENT */}
                        <div className="relative">
                          <select
                            value={contentTitleFilter}
                            onChange={(e) => setContentTitleFilter(e.target.value)}
                            className="
                              h-[54px]
                              min-w-[220px]
                              appearance-none
                              bg-[#121212]
                              border
                              border-[#2A2A2A]
                              rounded-2xl
                              px-5
                              pr-11
                              text-sm
                              font-medium
                              text-[#F5F1E8]
                              outline-none
                              transition-all
                              hover:border-[#3A3A3A]
                              focus:border-[#D6B36A]
                              focus:bg-[#151515]
                              cursor-pointer
                            "
                          >
                            <option value="">All Content</option>
                            <option value="Content 1">Content 1</option>
                            <option value="Content 2">Content 2</option>
                            <option value="Content 3">Content 3</option>
                            <option value="Others">Others</option>
                          </select>
                          <div className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500 text-[10px]">▼</div>
                        </div>

                        {/* STATUS */}
                        <div className="relative">
                          <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            className="
                              h-[54px]
                              min-w-[170px]
                              appearance-none
                              bg-[#121212]
                              border
                              border-[#2A2A2A]
                              rounded-2xl
                              px-5
                              pr-11
                              text-sm
                              font-medium
                              text-[#F5F1E8]
                              outline-none
                              transition-all
                              hover:border-[#3A3A3A]
                              focus:border-[#D6B36A]
                              focus:bg-[#151515]
                              cursor-pointer
                            "
                          >
                            <option>All Statuses</option>
                            <option>Pending</option>
                            <option>In Progress</option>
                            <option>Completed</option>
                          </select>
                          <div className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500 text-[10px]">▼</div>
                        </div>

                        {/* PRIORITY */}
                        <div className="relative">
                          <select
                            value={priorityFilter}
                            onChange={(e) => setPriorityFilter(e.target.value)}
                            className="
                              h-[54px]
                              min-w-[160px]
                              appearance-none
                              bg-[#121212]
                              border
                              border-[#2A2A2A]
                              rounded-2xl
                              px-5
                              pr-11
                              text-sm
                              font-medium
                              text-[#F5F1E8]
                              outline-none
                              transition-all
                              hover:border-[#3A3A3A]
                              focus:border-[#D6B36A]
                              focus:bg-[#151515]
                              cursor-pointer
                            "
                          >
                            <option>All Priorities</option>
                            <option>HIGH</option>
                            <option>MEDIUM</option>
                            <option>LOW</option>
                          </select>
                          <div className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500 text-[10px]">▼</div>
                        </div>
                      </>
                    )}

                    {/* NON MARKETING FILTERS */}
                    {activePage !== "marketing" && (
                      <>
                        {/* STATUS */}
                        <div className="relative">
                          <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            className="
                              h-[54px]
                              min-w-[170px]
                              appearance-none
                              bg-[#121212]
                              border
                              border-[#2A2A2A]
                              rounded-2xl
                              px-5
                              pr-11
                              text-sm
                              font-medium
                              text-[#F5F1E8]
                              outline-none
                              transition-all
                              hover:border-[#3A3A3A]
                              focus:border-[#D6B36A]
                              focus:bg-[#151515]
                              cursor-pointer
                            "
                          >
                            <option>All Statuses</option>
                            <option>Pending</option>
                            <option>In Progress</option>
                            <option>Completed</option>
                          </select>
                          <div className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500 text-[10px]">▼</div>
                        </div>

                        {/* PRIORITY */}
                        <div className="relative">
                          <select
                            value={priorityFilter}
                            onChange={(e) => setPriorityFilter(e.target.value)}
                            className="
                              h-[54px]
                              min-w-[160px]
                              appearance-none
                              bg-[#121212]
                              border
                              border-[#2A2A2A]
                              rounded-2xl
                              px-5
                              pr-11
                              text-sm
                              font-medium
                              text-[#F5F1E8]
                              outline-none
                              transition-all
                              hover:border-[#3A3A3A]
                              focus:border-[#D6B36A]
                              focus:bg-[#151515]
                              cursor-pointer
                            "
                          >
                            <option>All Priorities</option>
                            <option>HIGH</option>
                            <option>MEDIUM</option>
                            <option>LOW</option>
                          </select>
                          <div className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500 text-[10px]">▼</div>
                        </div>

                        {/* FORMAT */}
<div className="relative">

  <select
    value={formatFilter[0] || ""}
    
    onChange={(e) => {

      if (!e.target.value) {
        setFormatFilter([])
        return
      }

      setFormatFilter([
        e.target.value
      ])
    }}

    className="
      h-[54px]
      min-w-[180px]
      appearance-none
      bg-[#121212]
      border
      border-[#2A2A2A]
      rounded-2xl
      px-5
      pr-11
      text-sm
      font-medium
      text-[#F5F1E8]
      outline-none
      transition-all
      hover:border-[#3A3A3A]
      focus:border-[#D6B36A]
      focus:bg-[#151515]
      cursor-pointer
    "
  >

    <option value="">
      All Formats
    </option>

    <option value="SRT">
      SRT
    </option>

    <option value="BURNED_IN">
      BURNED IN
    </option>

    <option value="TEXT">
      TEXT
    </option>

  </select>

  <div
    className="
      pointer-events-none
      absolute
      right-4
      top-1/2
      -translate-y-1/2
      text-zinc-500
      text-[10px]
    "
  >
    ▼
  </div>

</div>

                        {/* DEADLINE */}
                        <div className="relative">
                          <select
                            value={deadlineSort}
                            onChange={(e) => setDeadlineSort(e.target.value)}
                            className="
                              h-[54px]
                              min-w-[180px]
                              appearance-none
                              bg-[#121212]
                              border
                              border-[#2A2A2A]
                              rounded-2xl
                              px-5
                              pr-11
                              text-sm
                              font-medium
                              text-[#F5F1E8]
                              outline-none
                              transition-all
                              hover:border-[#3A3A3A]
                              focus:border-[#D6B36A]
                              focus:bg-[#151515]
                              cursor-pointer
                            "
                          >
                            <option value="">Deadline Order</option>
                            <option value="ASC">Closest Deadline</option>
                            <option value="DESC">Furthest Deadline</option>
                          </select>
                          <div className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500 text-[10px]">▼</div>
                        </div>
                      </>
                    )}

                  </div>

                  {/* RIGHT */}
                  <div
                    className="
                      flex
                      items-center
                      gap-3
                      flex-shrink-0
                      min-w-fit
                    "
                  >

                    {/* RESET */}
                    <button
                      onClick={resetFilters}
                      className="
                        h-[54px]
                        px-5
                        rounded-2xl
                        border
                        border-[#2A2A2A]
                        bg-[#141414]
                        text-sm
                        font-medium
                        text-zinc-400
                        transition-all
                        hover:text-white
                        hover:border-[#3A3A3A]
                        hover:bg-[#1A1A1A]
                      "
                    >
                      Reset
                    </button>

                    {/* ACTIVE */}
                    <div
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
                    </div>

                  </div>

                </div>

                {/* GAMES */}
                {(activePage === "Broadcast" || activePage === "my-games") && (
                  <div className="flex flex-wrap items-center gap-3 pt-1">

                    {(activePage === "my-games"
                      ? filteredGames.filter((game) =>
                          Array.isArray(currentUser?.assignedGames) &&
                          currentUser.assignedGames.some(
                            (assignment: any) => assignment.gameId === game.id
                          )
                        )
                      : filteredGames
                    ).map((game) => {
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

              {(activePage === "dashboard" || activePage === "Broadcast") && (
                <BroadcastOrdersTable
                  isLoading={isLoadingOrders}
                  currentUser={currentUser}
                  orders={broadcastOrders}
                  setSelectedOrder={setSelectedOrder}
                  setEditedOrder={setEditedOrder}
                  updateOrderStatus={updateOrderStatus}
                  getDeadlineInfo={getDeadlineInfo}
                />
              )}

              {activePage === "my-games" && (
                <BroadcastOrdersTable
                  isLoading={isLoadingOrders}
                  currentUser={currentUser}
                  orders={broadcastOrders}
                  setSelectedOrder={setSelectedOrder}
                  setEditedOrder={setEditedOrder}
                  updateOrderStatus={updateOrderStatus}
                  getDeadlineInfo={getDeadlineInfo}
                />
              )}

              {activePage === "notifications" && (
                <NotificationsPage
                  notifications={currentUser?.notifications || []}
                  markNotificationsAsRead={markNotificationsAsRead}
                  orders={orders}
                  navigateToOrder={navigateToOrder}
                />
              )}

              {(activePage === "dashboard" || activePage === "marketing") && (
                <MarketingOrdersTable
                  isLoading={isLoadingOrders}
                  orders={marketingOrders}
                  currentUser={currentUser}
                  setSelectedOrder={setSelectedOrder}
                  setEditedOrder={setEditedOrder}
                  updateOrderStatus={updateOrderStatus}
                  getDeadlineInfo={getDeadlineInfo}
                />
              )}
            </>

          </div>

          {/* RIGHT SIDEBAR */}
          {selectedOrder && (
            <OrderDetailsSidebar
              selectedOrder={selectedOrder}
              editedOrder={editedOrder}
              currentUser={currentUser}
              setSelectedOrder={setSelectedOrder}
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

        {/* DELETE CONFIRM MODAL */}
        {showDeleteModal && (
          <div className="fixed inset-0 bg-black/70 z-[100] flex items-center justify-center">
            <div className="w-[480px] bg-[#0E0E0E] border border-zinc-800 rounded-3xl p-8">

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
