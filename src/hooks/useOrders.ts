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

  // ─── List mode (grouped vs flat) per table, driven by server response ──────
  const [broadcastMode, setBroadcastMode] = React.useState<"grouped" | "flat">("grouped")
  const [marketingMode, setMarketingMode] = React.useState<"grouped" | "flat">("grouped")

  // ─── Detail view state ────────────────────────────────────────────────────
  const [selectedOrderDetail, setSelectedOrderDetail] = React.useState<any | null>(null)
  const [isLoadingDetail, setIsLoadingDetail] = React.useState(false)
  const detailAbortRef = React.useRef<AbortController | null>(null)

  // ─── Other state ──────────────────────────────────────────────────────────
  const [isEditingOrder, setIsEditingOrder] = React.useState(false)
  const [editedOrder, setEditedOrder] = React.useState<any>(null)
  const [isSavingOrder, setIsSavingOrder] = React.useState(false)
  // Synchronous ref guard — prevents double-submit from rapid clicks before
  // the async setIsSavingOrder(true) has committed to React state.
  const isSavingRef = React.useRef(false)
  // Per-orderId in-flight guard for status updates — prevents same-user
  // double-submit before the network round-trip completes.
  const updatingStatusIdsRef = React.useRef(new Set<string>())
  const [deletingOrderId, setDeletingOrderId] = React.useState("")



  // ─── Order counts (for Topbar stat cards — counts ALL orders, not just page) ─
  const [orderCounts, setOrderCounts] = React.useState({ PENDING: 0, IN_PROGRESS: 0, COMPLETED: 0, total: 0 })
  const countsAbortRef = React.useRef<AbortController | null>(null)

  // ─── toListOrder helper ───────────────────────────────────────────────────
  function toListOrder(full: any): any {
    return {
      id: full.id,
      type: full.type,
      title: full.title,
      status: full.status,
      priority: full.priority,
      dateAdded: full.dateAdded,
      isParent: full.isParent ?? false,
      parentId: full.parentId ?? null,
      // Count badge (grouped mode). Falls back to nested array length if present.
      subOrderCount: full._count?.subOrders ?? (Array.isArray(full.subOrders) ? full.subOrders.length : 0),
      subOrders: Array.isArray(full.subOrders)
        ? full.subOrders.map((s: any) => toListOrder(s))
        : [],
      // Flat-mode breadcrumb reference to the parent (present on sub-order rows).
      parent: full.parent ? { id: full.parent.id, title: full.parent.title } : null,
      broadcast: full.broadcast ? {
        id: full.broadcast.id,
        sourceLanguage: full.broadcast.sourceLanguage,
        targetLanguages: full.broadcast.targetLanguages,
        deadlineDate: full.broadcast.deadlineDate,
        deliveryFormats: full.broadcast.deliveryFormats?.map((f: any) => ({ id: f.id, format: f.format })),
        game: full.broadcast.game ? { id: full.broadcast.game.id, name: full.broadcast.game.name, logo: full.broadcast.game.logo ?? null } : null,
      } : null,
      marketing: full.marketing ? {
        id: full.marketing.id,
        contentTitle: full.marketing.contentTitle,
        sourceLanguage: full.marketing.sourceLanguage,
        targetLanguages: full.marketing.targetLanguages,
        deadlineDate: full.marketing.deadlineDate,
        deliveryFormats: full.marketing.deliveryFormats?.map((f: any) => ({ id: f.id, format: f.format })),
        assignments: full.marketing.assignments?.map((a: any) => ({
          id: a.id,
          user: a.user
            ? { id: a.user.id, firstName: a.user.firstName, lastName: a.user.lastName, position: a.user.position }
            : undefined,
        })),
      } : null,
    }
  }

  // ─── Build common filter params ───────────────────────────────────────────
  function buildFilterParams() {
    const params = new URLSearchParams()

    if (orderIdFilter) {
      // Deep-link exact match — no event filter so ENC orders work on EWC tab
      params.append("orderId", orderIdFilter)
      return params
    }

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

  // ─── Fetch counts for Topbar stat cards (no statusFilter, no deadlineSort) ─
  async function fetchOrderCounts(type?: string, assignedOnly = false) {
    countsAbortRef.current?.abort()
    const controller = new AbortController()
    countsAbortRef.current = controller
    try {
      const params = new URLSearchParams()
      if (orderIdFilter) {
        params.append("orderId", orderIdFilter)
      } else {
        if (search.trim()) params.append("search", search)
        if (priorityFilter !== "All Priorities") params.append("priority", priorityFilter)
        if (formatFilter.length > 0) formatFilter.forEach((f: string) => params.append("format", f))
        if (contentTitleFilter) params.append("contentTitle", contentTitleFilter)
        if (selectedGameFilter) params.append("gameId", selectedGameFilter)
        if (selectedEvent) params.append("event", selectedEvent)
      }
      if (type) params.append("type", type)
      if (assignedOnly) params.append("assignedOnly", "true")
      const res = await fetch(
        `${import.meta.env.VITE_API_URL}/orders/counts?${params.toString()}`,
        { credentials: "include", signal: controller.signal }
      )
      if (!res.ok) return
      const data = await res.json()
      if (countsAbortRef.current === controller) setOrderCounts(data)
    } catch (e: any) {
      if (e?.name !== "AbortError") console.error("Counts fetch error:", e)
    }
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
      setBroadcastMode(data.mode === "flat" ? "flat" : "grouped")
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
      if (activePage === "my-orders") params.append("assignedOnly", "true")

      const res = await fetch(
        `${import.meta.env.VITE_API_URL}/orders?${params.toString()}`,
        { credentials: "include", signal: controller.signal }
      )
      if (!res.ok) throw new Error("Failed to fetch marketing orders")
      const data = await res.json()
      setMarketingOrders(data.orders)
      setMarketingTotalPages(data.totalPages || 1)
      setMarketingPage(data.page || page)
      setMarketingMode(data.mode === "flat" ? "flat" : "grouped")
    } catch (e: any) {
      if (e?.name !== "AbortError") console.error("Marketing fetch error:", e)
    } finally {
      if (marketingAbortRef.current === controller) setIsLoadingMarketing(false)
    }
  }

  // ─── Fetch full order detail for sidebar ─────────────────────────────────
  async function fetchOrderDetail(orderId: string) {
    // Cancel any in-flight detail fetch so a slower previous request
    // can never overwrite the result of a more recent one.
    detailAbortRef.current?.abort()
    const controller = new AbortController()
    detailAbortRef.current = controller

    setIsLoadingDetail(true)
    try {
      const res = await fetch(
        `${import.meta.env.VITE_API_URL}/orders/${orderId}`,
        { credentials: "include", signal: controller.signal }
      )
      if (!res.ok) throw new Error()
      const data = await res.json()
      // Only update state if this fetch is still the latest one
      if (detailAbortRef.current === controller) {
        setSelectedOrderDetail(data)
        setEditedOrder(JSON.parse(JSON.stringify(data)))
      }
      return data as any
    } catch (e: any) {
      if (e?.name !== "AbortError") {
        // silent — sidebar shows last known state
      }
    } finally {
      if (detailAbortRef.current === controller) setIsLoadingDetail(false)
    }
  }

  // ─── Lazy-fetch a parent's sub-orders (paginated) when its row is expanded ─
  async function fetchSubOrders(parentId: string, page = 1) {
    try {
      const res = await fetch(
        `${import.meta.env.VITE_API_URL}/orders/${parentId}/sub-orders?page=${page}&limit=50`,
        { credentials: "include" }
      )
      if (!res.ok) throw new Error("Failed to fetch sub-orders")
      const data = await res.json()
      return {
        subOrders: Array.isArray(data.subOrders) ? data.subOrders.map((s: any) => toListOrder(s)) : [],
        total: data.total ?? 0,
        page: data.page ?? page,
        totalPages: data.totalPages ?? 1,
      }
    } catch (e) {
      console.error("Sub-orders fetch error:", e)
      return { subOrders: [], total: 0, page, totalPages: 1 }
    }
  }

  // ─── Create order ─────────────────────────────────────────────────────────
  async function createOrder(assignUserIds: string[] = []) {
    if (!newOrder.title || isSavingRef.current) return
    isSavingRef.current = true
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

      const createData = await response.json()
      if (!response.ok) {
        toast.error(createData.message || "Failed to create order")
        return
      }

      let createdOrder = createData

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

      toast.success("Order created successfully")
      setShowModal(false)
      resetOrderState()
    } catch (error) {
      console.error("Create order error:", error)
      toast.error("Something went wrong")
    } finally {
      isSavingRef.current = false
      setIsSavingOrder(false)
    }
  }

  // ─── Create a "big order" (parent) + its sub-orders in one flow ───────────
  // parentPayload: shared fields (title, type, game, deadline, priority, notes…)
  // subItems: array of full sub-order payloads (each typically a duplicate of
  // the shared data with its own title).
  async function createBigOrder(parentPayload: any, subItems: any[]) {
    if (!parentPayload?.title || isSavingRef.current) return
    isSavingRef.current = true
    try {
      setIsSavingOrder(true)

      // 1. Create the parent ("big order") carrying the shared fields.
      const parentRes = await fetch(`${import.meta.env.VITE_API_URL}/orders`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...parentPayload,
          isParent: true,
          event: selectedEvent,
          estimatedMinutes: Number(parentPayload.estimatedMinutes) || 0,
          game: parentPayload.type === "MARKETING" ? "-" : parentPayload.game,
        }),
      })

      const parent = await parentRes.json()
      if (!parentRes.ok) {
        toast.error(parent.message || "Failed to create big order")
        return
      }

      // 2. Bulk-create the sub-orders under the new parent.
      if (Array.isArray(subItems) && subItems.length > 0) {
        const payload = subItems.map((item) => ({
          ...item,
          event: selectedEvent,
          estimatedMinutes: Number(item.estimatedMinutes) || 0,
          game: item.type === "MARKETING" ? "-" : item.game,
        }))

        const subRes = await fetch(
          `${import.meta.env.VITE_API_URL}/orders/${parent.id}/sub-orders`,
          {
            method: "POST",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ items: payload }),
          }
        )
        const subData = await subRes.json()
        if (!subRes.ok) {
          toast.error(subData.message || "Failed to create sub-orders")
          // Parent was created; refresh so it still appears.
        }
      }

      // 3. Refresh the relevant list.
      if (parent.type === "MARKETING") {
        await fetchMarketingOrders(1)
      } else {
        await fetchBroadcastOrders(1)
      }

      setShowModal(false)
      resetOrderState()
      toast.success("Big order created")
      return parent
    } catch (error) {
      console.error("Create big order error:", error)
      toast.error("Something went wrong")
    } finally {
      isSavingRef.current = false
      setIsSavingOrder(false)
    }
  }

  // ─── Create sub-orders under a parent ("big order") ───────────────────────
  // items: array of full sub-order payloads. Created atomically server-side.
  async function createSubOrders(parentId: string, items: any[]) {
    if (!parentId || !Array.isArray(items) || items.length === 0) return
    if (isSavingRef.current) return
    isSavingRef.current = true
    try {
      setIsSavingOrder(true)

      const payload = items.map((item) => ({
        ...item,
        event: item.event ?? selectedEvent,
        estimatedMinutes: Number(item.estimatedMinutes) || 0,
        game: item.type === "MARKETING" ? "-" : item.game,
      }))

      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/orders/${parentId}/sub-orders`,
        {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ items: payload }),
        }
      )

      const data = await response.json()

      if (!response.ok) {
        toast.error(data.message || "Failed to create sub-orders")
        return
      }

      // Re-fetch the relevant list so the parent group reflects new children.
      const parentType = data?.type
      if (parentType === "MARKETING") {
        await fetchMarketingOrders(1)
      } else {
        await fetchBroadcastOrders(1)
      }

      // Refresh the sidebar if the parent is open.
      if (selectedOrder?.id === parentId) {
        fetchOrderDetail(parentId)
      }

      toast.success(
        items.length === 1
          ? "Sub-order added"
          : `${items.length} sub-orders added`
      )
      return data
    } catch (error) {
      console.error("Create sub-orders error:", error)
      toast.error("Something went wrong")
    } finally {
      isSavingRef.current = false
      setIsSavingOrder(false)
    }
  }

  // ─── Update order (full edit) ─────────────────────────────────────────────
  async function updateOrder() {
    if (isSavingRef.current) return
    isSavingRef.current = true
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

      if (response.status === 409) {
        // Another user saved between when this user opened the modal and submitted.
        // Keep the modal open so they can see the conflict message and decide what to do.
        toast.error(data.message || "This order was recently modified by someone else. Please close and reopen to see the latest changes.")
        return
      }

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
      setSelectedOrder((prev: any) => prev ? { ...prev, ...toListOrder(data) } : prev)
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
      isSavingRef.current = false
      setIsSavingOrder(false)
    }
  }

  // ─── Update order status ──────────────────────────────────────────────────
  async function updateOrderStatus(orderId: string, status: string) {
    // Prevent the same user from firing concurrent requests for the same order
    // before the first one completes (e.g. rapid double-click).
    if (updatingStatusIdsRef.current.has(orderId)) return
    updatingStatusIdsRef.current.add(orderId)
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

      if (!response.ok) throw new Error("Failed to update status")

      const updated = await response.json()
      await refreshNotifications()

      setBroadcastOrders((prev) => prev.map((o) => (o.id === updated.id ? { ...o, status: updated.status } : o)))
      setMarketingOrders((prev) => prev.map((o) => (o.id === updated.id ? { ...o, status: updated.status } : o)))

      // Sidebar: re-fetch full detail (non-blocking — sidebar shows loading shimmer)
      if (selectedOrder?.id === updated.id) {
        fetchOrderDetail(updated.id)
      }
    } catch (error) {
      console.error(error)
      toast.error("Failed to update order status")
    } finally {
      updatingStatusIdsRef.current.delete(orderId)
    }
  }

  // ─── Delete order ─────────────────────────────────────────────────────────
  async function deleteOrder() {
    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/orders/${deletingOrderId}`,
        { method: "DELETE", credentials: "include" }
      )

      const deleteData = await response.json().catch(() => ({}))
      if (!response.ok) {
        toast.error(deleteData.message || "Failed to delete order")
        return
      }

      setBroadcastOrders((prev) => prev.filter((o) => o.id !== deletingOrderId))
      setMarketingOrders((prev) => prev.filter((o) => o.id !== deletingOrderId))

      setSelectedOrder(null)
      setSelectedOrderDetail(null)
      setShowDeleteModal(false)
      toast.success("Order deleted")
    } catch (error) {
      console.error(error)
      toast.error("Failed to delete order")
    }
  }

  // ─── Trigger fetches when page/filters change ─────────────────────────────
  const prevSelectedEventRef = React.useRef(selectedEvent)
  React.useEffect(() => {
    const shouldFetch =
      activePage === "Broadcast" ||
      activePage === "my-games" ||
      activePage === "marketing" ||
      activePage === "my-orders" ||
      activePage === "notifications" ||
      activePage === "dashboard"

    if (!shouldFetch) return

    // When orderIdFilter is active, event is already ignored by buildFilterParams.
    // Skip the re-fetch if only selectedEvent changed — avoids a redundant round-trip
    // when the deep-link effect corrects the event tab to match an ENC order.
    const eventChanged = prevSelectedEventRef.current !== selectedEvent
    prevSelectedEventRef.current = selectedEvent
    if (orderIdFilter && eventChanged) return

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
    orderIdFilter,
  ])

  // ─── Counts effect — excludes statusFilter & deadlineSort so stat cards ───
  // always show totals across all statuses regardless of the active filter.
  React.useEffect(() => {
    if (activePage === "Broadcast") fetchOrderCounts("BROADCAST")
    else if (activePage === "my-games") fetchOrderCounts("BROADCAST", true)
    else if (activePage === "marketing") fetchOrderCounts("MARKETING")
    else if (activePage === "my-orders") fetchOrderCounts("MARKETING", true)
    else fetchOrderCounts()
  }, [
    activePage,
    search,
    priorityFilter,
    formatFilter,
    contentTitleFilter,
    selectedGameFilter,
    selectedEvent,
    orderIdFilter,
  ])

  return {
    // Broadcast
    broadcastOrders,
    setBroadcastOrders,
    broadcastPage,
    broadcastTotalPages,
    isLoadingBroadcast,
    fetchBroadcastOrders,
    broadcastMode,
    // Marketing
    marketingOrders,
    setMarketingOrders,
    marketingPage,
    marketingTotalPages,
    isLoadingMarketing,
    fetchMarketingOrders,
    marketingMode,
    // Sub-orders (lazy)
    fetchSubOrders,
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
    createSubOrders,
    createBigOrder,
    updateOrder,
    updateOrderStatus,
    deleteOrder,
    toListOrder,
    orderCounts,
    fetchOrderCounts,
  }
}
