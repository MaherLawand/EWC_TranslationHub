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
  const [orders, setOrders] = React.useState<any[]>([])
  const [isLoadingOrders, setIsLoadingOrders] =
  React.useState(false)
  const fetchAbortRef = React.useRef<AbortController | null>(null)

  const [isEditingOrder, setIsEditingOrder] =
  React.useState(false)

  const [editedOrder, setEditedOrder] =
  React.useState<any>(null)


const [isSavingOrder, setIsSavingOrder] =
  React.useState(false)

const [
  deletingOrderId,
  setDeletingOrderId,
] = React.useState("")

const statsOrders =
  activePage === "marketing"

    ? orders.filter(
        (o) =>
          o.type ===
          "MARKETING"
      )

    : activePage === "Broadcast" ||
      activePage === "my-games"

    ? orders.filter(
        (o) =>
          o.type ===
          "BROADCAST"
      )

    : orders


async function fetchOrders() {
  // cancel any in-flight request before starting a new one
  fetchAbortRef.current?.abort()
  const controller = new AbortController()
  fetchAbortRef.current = controller

  try {
    setIsLoadingOrders(true)
    const params =
      new URLSearchParams()

    /*
      SEARCH
    */
    if (search.trim()) {
      params.append(
        "search",
        search
      )
    }

    if (
  activePage === "my-games"
) {
  params.append(
    "assignedOnly",
    "true"
  )
}

    /*
      STATUS
    */
    if (
      statusFilter !==
      "All Statuses"
    ) {
      params.append(
        "status",
        statusFilter
          .toUpperCase()
          .replace(" ", "_")
      )
    }

    /*
      PRIORITY
    */
    if (
      priorityFilter !==
      "All Priorities"
    ) {
      params.append(
        "priority",
        priorityFilter
      )
    }

    /*
      FORMAT
    */
    if (
  formatFilter.length > 0
) {

formatFilter.forEach((format: string) => {
  params.append("format", format)
})
}

    /*
      CONTENT TITLE
    */
    if (
      contentTitleFilter
    ) {
      params.append(
        "contentTitle",
        contentTitleFilter
      )
    }

    /*
      GAME
    */
    if (
      selectedGameFilter
    ) {
      params.append(
        "gameId",
        selectedGameFilter
      )
    }

    /*
      DEADLINE SORT
    */
    if (deadlineSort) {
      params.append(
        "deadlineSort",
        deadlineSort
      )
    }

    if (selectedEvent) {
  params.append(
    "event",
    selectedEvent
  )
}

    const response =
      await fetch(
        `${import.meta.env.VITE_API_URL}/orders?${params.toString()}`,
        {
          credentials: "include",
          signal: controller.signal,
        }
      )

    if (!response.ok) {
      throw new Error(
        "Failed to fetch orders"
      )
    }

    const data =
      await response.json()

    setOrders(data.orders)

  } catch (error: any) {
    if (error?.name !== "AbortError") {
      console.error(
        "Failed to fetch orders:",
        error
      )
    }
  } finally {
    // only clear loading if this controller is still the active one
    if (fetchAbortRef.current === controller) {
      setIsLoadingOrders(false)
    }
  }
}

async function createOrder(assignUserIds: string[] = []) {
  if (
    !newOrder.title ||
    isSavingOrder
  )
    return
  try {
    setIsSavingOrder(true)
    const response = await fetch(
      `${import.meta.env.VITE_API_URL}/orders`,
      {
        method: "POST",

        credentials: "include",

        headers: {
          "Content-Type":
            "application/json",
        },

        body: JSON.stringify({
          ...newOrder,

          event: selectedEvent,

          estimatedMinutes:
            Number(
              newOrder.estimatedMinutes
            ),

          game:
            newOrder.type ===
            "Marketing"
              ? "-"
              : newOrder.game,
        }),
      }
    )

    if (!response.ok) {
      throw new Error(
        "Failed to create order"
      )
    }

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
        if (assignRes.ok) {
          createdOrder = await assignRes.json()
        }
      } catch (assignError) {
        console.error("Assign users error:", assignError)
      }
    }

    setOrders((prev) => [
      createdOrder,
      ...prev,
    ])

    setShowModal(false)

    resetOrderState()
  } catch (error) {
    console.error(
      "Create order error:",
      error
    )
  } finally {
      setIsSavingOrder(false)
  }
}

async function updateOrder() {

  if (isSavingOrder) {
    return
  }

  try {

    setIsSavingOrder(true)

    const response = await fetch(
      `${import.meta.env.VITE_API_URL}/orders/${editingOrderId}`,
      {
        method: "PATCH",

        credentials: "include",

        headers: {
          "Content-Type":
            "application/json",
        },

        body: JSON.stringify({
          ...newOrder,

          estimatedMinutes:
            Number(
              newOrder.estimatedMinutes
            ),

          deliveries:
            newOrder.deliveries || [],
        }),
      }
    )

    const data =
      await response.json()

    /*
      IMPORTANT
    */
    if (!response.ok) {

      toast.error(
        data.message ||
        "Failed to update order"
      )

      return
    }

    setOrders((prev) =>
      prev.map((o) =>
        o.id === data.id
          ? { ...data }
          : o
      )
    )

    setSelectedOrder({
      ...data,
    })

    setEditedOrder(
      JSON.parse(
        JSON.stringify(data)
      )
    )

    toast.success(
      "Order updated successfully"
    )

    resetOrderState()

    setShowModal(false)

    setIsEditing(false)

    setEditingOrderId("")

  } catch (error) {

    console.error(error)

    toast.error(
      "Something went wrong"
    )

  } finally {

    setIsSavingOrder(false)

  }
}

async function updateOrderStatus(
  orderId: string,
  status: string
) {
  try {
    const response = await fetch(
      `${import.meta.env.VITE_API_URL}/orders/${orderId}/status`,
      {
        method: "PATCH",

        credentials: "include",

        headers: {
          "Content-Type":
            "application/json",
        },

        body: JSON.stringify({
          status,
        }),
      }
    )

    const updated =
      await response.json()

      await refreshNotifications()

    setOrders((prev) =>
      prev.map((o) =>
        o.id === updated.id
          ? updated
          : o
      )
    )

    if (
      selectedOrder?.id ===
      updated.id
    ) {
      setSelectedOrder(updated)
      setEditedOrder(updated)
    }

  } catch (error) {
    console.error(error)
  }
}

  async function deleteOrder() {
    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/orders/${deletingOrderId}`,
        {
          method: "DELETE",
  
          credentials: "include",
        }
      )
  
      if (!response.ok) {
        throw new Error(
          "Failed to delete order"
        )
      }
  
      setOrders((prev) =>
        prev.filter(
          (o) =>
            o.id !== deletingOrderId
        )
      )
  
      setSelectedOrder(null)
  
      setShowDeleteModal(false)
  
    } catch (error) {
      console.error(error)
    }
  }

React.useEffect(() => {
  const shouldFetch =
    activePage === "Broadcast" ||
    activePage === "my-games" ||
    activePage === "marketing" ||
    activePage === "notifications"

  if (!shouldFetch) return

  fetchOrders()
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
    orders,
    setOrders,
    isLoadingOrders,
    setIsLoadingOrders,
    isEditingOrder,
    setIsEditingOrder,
    editedOrder,
    setEditedOrder,
    isSavingOrder,
    setIsSavingOrder,
    deletingOrderId,
    setDeletingOrderId,
    fetchOrders,
    createOrder,
    updateOrder,
    updateOrderStatus,
    deleteOrder,
    statsOrders
  }
}