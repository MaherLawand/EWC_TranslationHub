import React from "react"

import { toast } from "react-toastify"
export function useOrders({
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
}: any) {

  // ─── Broadcast orders state ───────────────────────────────────────────────
  const [broadcastOrders, setBroadcastOrders] = React.useState<any[]>([])
  const [broadcastPage, setBroadcastPage] = React.useState(1)
  const [broadcastTotalPages, setBroadcastTotalPages] = React.useState(1)
  const [isLoadingBroadcast, setIsLoadingBroadcast] = React.useState(false)
  const broadcastAbortRef = React.useRef<AbortController | null>(null)

  // ─── Marketing orders state ───────────────────────────────────────────────
  const [marketingOrders, setMarketingOrders] = React.useState<any[]>([])
  const [marketingPage, setMarketingPage] = React.useState(1)
  const [marketingTotalPages, setMarketingTotalPages] = React.useState(1)
  const [isLoadingMarketing, setIsLoadingMarketing] = React.useState(false)
  const marketingAbortRef = React.useRef<AbortController | null>(null)

  // ─── Detail view state ────────────────────────────────────────────────────
  const [selectedOrderDetail, setSelectedOrderDetail] = React.useState<any | null>(null)
  const [isLoadingDetail, setIsLoadingDetail] = React.useState(false)

  // ─── Other state ──────────────────────────────────────────────────────────
  const [isEditingOrder, setIsEditingOrder] = React.useState(false)
  const [editedOrder, setEditedOrder] = React.useState<any>(null)
  const [isSavingOrder, setIsSavingOrder] = React.useState(false)
  const [deletingOrderId, setDeletingOrderId] = React.useState("")

  // ─── statsOrders (for any summary / stat cards) ───────────────────────────
  const statsOrders =
    activePage === "marketing"
      ? marketingOrders
      : activePage === "Broadcast" || activePage === "my-games"
      ? broadcastOrders
      : [...broadcastOrders, ...marketingOrders]

  // ─── toListOrder helper ───────────────────────────────────────────────────
  function toListOrder(full: any): any {
    return {
      id: full.id,
      type: full.type,
      title: full.title,
      status: full.status,
      priority: full.priority,
      dateAdded: full.dateAdded,
      broadcast: full.broadcast ? {
        id: full.broadcast.id,
        sourceLanguage: full.broadcast.sourceLanguage,
        targetLanguages: full.broadcast.targetLanguages,
        deadlineDate: full.broadcast.deadlineDate,
        deliveryFormats: full.broadcast.deliveryFormats?.map((f: any) => ({ id: f.id, format: f.format })),
        game: full.broadcast.game ? { id: full.broadcast.game.id, name: full.broadcast.game.name } : null,
      } : null,
      marketing: full.marketing ? {
        id: full.marketing.id,
        contentTitle: full.marketing.contentTitle,
        sourceLanguage: full.marketing.sourceLanguage,
        targetLanguages: full.marketing.targetLanguages,
        deadlineDate: full.marketing.deadlineDate,
        deliveryFormats: full.marketing.deliveryFormats?.map((f: any) => ({ id: f.id, format: f.format })),
        assignments: full.marketing.assignments?.map((a: any) => ({ id: a.id })),
      } : null,
    }
  }

  // ─── Build common filter params ───────────────────────────────────────────
  function buildFilterParams() {
    const params = new URLSearchParams()

    if (search.trim()) params.append("search", search)
    if (statusFilter !== "All Statuses")
      params.append("status", statusFilter.toUpperCase().replace(" ", "_"))
    if (priorityFilter !== "All Priorities") params.append("priority", priorityFilter)
    if (formatFilter.length > 0)
      formatFilter.forEach((format: string) => params.append("format", format))
    if (contentTitleFilter) params.append("contentTitle", contentTitleFilter)
    if (selectedGameFilter) params.append("gameId", selectedGameFilter)
    if (deadlineSort) params.append("deadlineSort", deadlineSort)
    if (selectedEvent) params.append("event", selectedEvent)

    return params
  }

  // ─── Fetch broadcast orders (server-paginated) ────────────────────────────
  async function fetchBroadcastOrders(page = 1) {
    broadcastAbortRef.current?.abort()
    const controller = new AbortController()
    broadcastAbortRef.current = controller
    setIsLoadingBroadcast(true)
    try {
      const params = buildFilterParams()
      params.append("type", "BROADCAST")
      params.append("page", String(page))
      params.append("limit", "50")
      if (activePage === "my-games") params.append("assignedOnly", "true")

      const res = await fetch(
        `${import.meta.env.VITE_API_URL}/orders?${params.toString()}`,
        { credentials: "include", signal: controller.signal }
      )
      if (!res.ok) throw new Error("Failed to fetch broadcast orders")
      const data = await res.json()
      setBroadcastOrders(data.orders)
      setBroadcastTotalPages(data.totalPages || 1)
      setBroadcastPage(data.page || page)
    } catch (e: any) {
      if (e?.name !== "AbortError") console.error("Broadcast fetch error:", e)
    } finally {
      if (broadcastAbortRef.current === controller) setIsLoadingBroadcast(false)
    }
  }

  // ─── Fetch marketing orders (server-paginated) ────────────────────────────
  async function fetchMarketingOrders(page = 1) {
    marketingAbortRef.current?.abort()
    const controller = new AbortController()
    marketingAbortRef.current = controller
    setIsLoadingMarketing(true)
    try {
      const params = buildFilterParams()
      params.append("type", "MARKETING")
      params.append("page", String(page))
      params.append("limit", "50")

      const res = await fetch(
        `${import.meta.env.VITE_API_URL}/orders?${params.toString()}`,
        { credentials: "include", signal: controller.signal }
      )
      if (!res.ok) throw new Error("Failed to fetch marketing orders")
      const data = await res.json()
      setMarketingOrders(data.orders)
      setMarketingTotalPages(data.totalPages || 1)
      setMarketingPage(data.page || page)
    } catch (e: any) {
      if (e?.name !== "AbortError") console.error("Marketing fetch error:", e)
    } finally {
      if (marketingAbortRef.current === controller) setIsLoadingMarketing(false)
    }
  }

  // ─── Fetch full order detail for sidebar ─────────────────────────────────
  async function fetchOrderDetail(orderId: string) {
    setIsLoadingDetail(true)
    try {
      const res = await fetch(
        `${import.meta.env.VITE_API_URL}/orders/${orderId}`,
        { credentials: "include" }
      )
      if (!res.ok) throw new Error()
      const data = await res.json()
      setSelectedOrderDetail(data)
      setEditedOrder(JSON.parse(JSON.stringify(data)))
    } catch {
      // silent — sidebar shows last known state
    } finally {
      setIsLoadingDetail(false)
    }
  }

  // ─── Create order ─────────────────────────────────────────────────────────
  async function createOrder(assignUserIds: string[] = []) {
    if (!newOrder.title || isSavingOrder) return
    try {
      setIsSavingOrder(true)
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/orders`,
        {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...newOrder,
            event: selectedEvent,
            estimatedMinutes: Number(newOrder.estimatedMinutes),
            game: newOrder.type === "Marketing" ? "-" : newOrder.game,
          }),
        }
      )

      if (!response.ok) throw new Error("Failed to create order")

      let createdOrder = await response.json()

      // Assign users immediately after creation if any were selected
      if (assignUserIds.length > 0 && createdOrder.id) {
        try {
          const assignRes = await fetch(
            `${import.meta.env.VITE_API_URL}/orders/${createdOrder.id}/assign`,
            {
              method: "POST",
              credentials: "include",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ userIds: assignUserIds }),
            }
          )
          if (assignRes.ok) createdOrder = await assignRes.json()
        } catch (assignError) {
          console.error("Assign users error:", assignError)
        }
      }

      // Re-fetch page 1 of the relevant type so list stays consistent
      if (createdOrder.type === "MARKETING") {
        await fetchMarketingOrders(1)
      } else {
        await fetchBroadcastOrders(1)
      }

      // Open (or switch) the sidebar to the newly created order
      setSelectedOrder(createdOrder)
      fetchOrderDetail(createdOrder.id)

      setShowModal(false)
      resetOrderState()
    } catch (error) {
      console.error("Create order error:", error)
    } finally {
      setIsSavingOrder(false)
    }
  }

  // ─── Update order (full edit) ─────────────────────────────────────────────
  async function updateOrder() {
    if (isSavingOrder) return
    try {
      setIsSavingOrder(true)
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/orders/${editingOrderId}`,
        {
          method: "PATCH",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...newOrder,
            estimatedMinutes: Number(newOrder.estimatedMinutes),
            deliveries: newOrder.deliveries || [],
          }),
        }
      )

      const data = await response.json()

      if (!response.ok) {
        toast.error(data.message || "Failed to update order")
        return
      }

      // Update slim entry in correct array
      if (data.type === "BROADCAST") {
        setBroadcastOrders((prev) =>
          prev.map((o) => (o.id === data.id ? toListOrder(data) : o))
        )
      } else {
        setMarketingOrders((prev) =>
          prev.map((o) => (o.id === data.id ? toListOrder(data) : o))
        )
      }

      setSelectedOrderDetail({ ...data })
      setEditedOrder(JSON.parse(JSON.stringify(data)))

      toast.success("Order updated successfully")
      resetOrderState()
      setShowModal(false)
      setIsEditing(false)
      setEditingOrderId("")
    } catch (error) {
      console.error(error)
      toast.error("Something went wrong")
    } finally {
      setIsSavingOrder(false)
    }
  }

  // ─── Update order status ──────────────────────────────────────────────────
  async function updateOrderStatus(orderId: string, status: string) {
    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/orders/${orderId}/status`,
        {
          method: "PATCH",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status }),
        }
      )

      const updated = await response.json()
      await refreshNotifications()

      // Update slim entry in correct array
      if (updated.type === "BROADCAST") {
        setBroadcastOrders((prev) =>
          prev.map((o) => (o.id === updated.id ? toListOrder(updated) : o))
        )
      } else {
        setMarketingOrders((prev) =>
          prev.map((o) => (o.id === updated.id ? toListOrder(updated) : o))
        )
      }

      if (selectedOrder?.id === updated.id) {
        setSelectedOrderDetail(updated)
        setEditedOrder(updated)
      }
    } catch (error) {
      console.error(error)
    }
  }

  // ─── Delete order ─────────────────────────────────────────────────────────
  async function deleteOrder() {
    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/orders/${deletingOrderId}`,
        { method: "DELETE", credentials: "include" }
      )

      if (!response.ok) throw new Error("Failed to delete order")

      setBroadcastOrders((prev) => prev.filter((o) => o.id !== deletingOrderId))
      setMarketingOrders((prev) => prev.filter((o) => o.id !== deletingOrderId))

      setSelectedOrder(null)
      setSelectedOrderDetail(null)
      setShowDeleteModal(false)
    } catch (error) {
      console.error(error)
    }
  }

  // ─── Trigger fetches when page/filters change ─────────────────────────────
  React.useEffect(() => {
    const shouldFetch =
      activePage === "Broadcast" ||
      activePage === "my-games" ||
      activePage === "marketing" ||
      activePage === "notifications" ||
      activePage === "dashboard"

    if (!shouldFetch) return

    fetchBroadcastOrders(1)
    fetchMarketingOrders(1)
  }, [
    activePage,
    search,
    statusFilter,
    priorityFilter,
    formatFilter,
    contentTitleFilter,
    selectedGameFilter,
    deadlineSort,
    selectedEvent,
  ])

  return {
    // Broadcast
    broadcastOrders,
    setBroadcastOrders,
    broadcastPage,
    broadcastTotalPages,
    isLoadingBroadcast,
    fetchBroadcastOrders,
    // Marketing
    marketingOrders,
    setMarketingOrders,
    marketingPage,
    marketingTotalPages,
    isLoadingMarketing,
    fetchMarketingOrders,
    // Detail
    selectedOrderDetail,
    setSelectedOrderDetail,
    isLoadingDetail,
    fetchOrderDetail,
    // Editing / modals
    isEditingOrder,
    setIsEditingOrder,
    editedOrder,
    setEditedOrder,
    isSavingOrder,
    setIsSavingOrder,
    deletingOrderId,
    setDeletingOrderId,
    // Actions
    createOrder,
    updateOrder,
    updateOrderStatus,
    deleteOrder,
    statsOrders,
    toListOrder,
  }
}
