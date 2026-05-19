import React from "react"
import {
  LANGUAGES,
} from "../../constants/languages"
import StatusBadge from "../shared/StatusBadge"

type Props = {
  orders: any[]
  currentUser: any
  onAssignUsers: (orderId: string, userIds: string[]) => Promise<void>
  setSelectedOrder: (order: any) => void
  setEditedOrder: (order: any) => void
  updateOrderStatus: (orderId: string, status: string) => void
  getDeadlineInfo: (deadlineDate: string) => { text: string; color: string }
  isLoading?: boolean
}

export default function MarketingOrdersTable({
  orders,
  setSelectedOrder,
  setEditedOrder,
  updateOrderStatus,
  currentUser,
  onAssignUsers,
  getDeadlineInfo,
  isLoading,
}: Props) {

  const ITEMS_PER_PAGE = 50
const canUpdateStatus =
  currentUser?.role === "ADMIN" ||

  currentUser?.position ===
    "PRODUCER" ||

  currentUser?.position ===
    "POST_PRODUCTION_MANAGER" ||

  currentUser?.position ===
    "TRANSLATOR" ||
    
  currentUser?.position ===
    "EDITOR"
  const [page, setPage] =
    React.useState(1)

  const totalPages =
    Math.ceil(
      orders.length /
        ITEMS_PER_PAGE
    ) || 1

  const paginatedOrders =
    orders.slice(
      (page - 1) *
        ITEMS_PER_PAGE,

      page * ITEMS_PER_PAGE
    )

  React.useEffect(() => {
    if (page > totalPages) {
      setPage(1)
    }
  }, [orders, totalPages])

  React.useEffect(() => {
  setPage(1)
}, [orders.length])

function getLanguageCode(
  languageName: string
) {
  return (
    LANGUAGES.find(
      (l) =>
        l.name ===
        languageName
    )?.code.toUpperCase() ||
    languageName
      .slice(0, 2)
      .toUpperCase()
  )
}

const [updatingOrderId, setUpdatingOrderId] =
  React.useState<string | null>(null)

const canAssignUsers =
  currentUser?.role === "ADMIN" ||
  (currentUser?.department === "MARKETING" &&
    (currentUser?.position === "PRODUCER" ||
      currentUser?.position === "POST_PRODUCTION_MANAGER"))

const [assigningOrder, setAssigningOrder] =
  React.useState<any>(null)

const [assignSearch, setAssignSearch] =
  React.useState("")

const [selectedUserIds, setSelectedUserIds] =
  React.useState<string[]>([])

const [isSavingAssign, setIsSavingAssign] =
  React.useState(false)

const [searchResults, setSearchResults] =
  React.useState<any[]>([])

const [isSearching, setIsSearching] =
  React.useState(false)

function openAssignModal(order: any) {
  const currentIds: string[] =
    order.marketing?.assignments?.map((a: any) => a.user.id) ?? []
  setSelectedUserIds(currentIds)
  setAssignSearch("")
  setSearchResults([])
  setAssigningOrder(order)
}

function toggleUser(userId: string) {
  setSelectedUserIds((prev) =>
    prev.includes(userId)
      ? prev.filter((id) => id !== userId)
      : [...prev, userId]
  )
}

async function saveAssign() {
  if (isSavingAssign || !assigningOrder) return
  setIsSavingAssign(true)
  try {
    await onAssignUsers(assigningOrder.id, selectedUserIds)
    setAssigningOrder(null)
  } finally {
    setIsSavingAssign(false)
  }
}

React.useEffect(() => {
  if (!assigningOrder) return

  const timer = setTimeout(async () => {
    setIsSearching(true)
    try {
      const params = new URLSearchParams()
      if (assignSearch.trim()) params.set("q", assignSearch.trim())
      const res = await fetch(
        `${import.meta.env.VITE_API_URL}/auth/users/search?${params}`,
        { credentials: "include" }
      )
      if (res.ok) setSearchResults(await res.json())
    } finally {
      setIsSearching(false)
    }
  }, 250)

  return () => clearTimeout(timer)
}, [assignSearch, assigningOrder])

  async function handleUpdateStatus(
  orderId: string,
  status: string
) {
  try {
    setUpdatingOrderId(orderId)

    await updateOrderStatus(
      orderId,
      status
    )
  } finally {
    setUpdatingOrderId(null)
  }
}


  return (
    <>
    <div
      className="
        bg-[radial-gradient(ellipse_90%_70%_at_top,rgba(214,179,106,0.05),transparent_80%),linear-gradient(to_bottom,#111111,#090909)]
        border
        border-[#242424]
        rounded-[32px]
        overflow-hidden
        shadow-[0_0_50px_rgba(0,0,0,0.45)]
        backdrop-blur-xl
      "
    >

      {/* HEADER */}
      <div
        className="
          px-8
          py-6
          border-b
          border-[#242424]
          flex
          items-center
          justify-between
          bg-[#111111]/80
          backdrop-blur-xl
        "
      >

        <div>

          <h3 className="text-lg font-semibold">
            Marketing
          </h3>

        </div>

        <div
          className="
            bg-[#151515]
            border
            border-[#2A2A2A]
            px-4
            py-2
            rounded-2xl
            text-sm
            text-[#D6B36A]
            font-medium
            shadow-[0_0_20px_rgba(214,179,106,0.08)]
          "
        >
          {orders.length} Orders
        </div>

      </div>

      {/* TABLE */}
      <table className="w-full border-separate border-spacing-0">

        <thead
          className="
            bg-[#121212]
            border-b
            border-[#242424]
            text-[#7A7A7A]
            text-[11px]
            uppercase
            tracking-[0.18em]
          "
        >

          <tr>

  <th className="text-left px-6 py-3">
    Order
  </th>

  <th className="text-left px-6 py-3">
    Content
  </th>

  <th className="text-left px-6 py-3">
    Languages
  </th>

  <th className="text-left px-6 py-3">
    Format
  </th>

  <th className="text-left px-6 py-3">
    Status
  </th>

  <th className="text-left px-6 py-3">
    Priority
  </th>

  {canAssignUsers && (
    <th className="text-left px-6 py-3">
      Assign
    </th>
  )}

</tr>

        </thead>

        <tbody>

  {isLoading ? (

    <tr>
      <td
        colSpan={canAssignUsers ? 7 : 6}
        className="py-20 text-center text-zinc-500"
      >
        Loading orders...
      </td>
    </tr>

  ) : paginatedOrders.length === 0 ? (

    <tr>
      <td
        colSpan={canAssignUsers ? 7 : 6}
        className="py-20 text-center text-zinc-500"
      >
        No orders found
      </td>
    </tr>

  ) : (

    paginatedOrders.map((order) => {

            const marketing =
              order.marketing

const isUpdating =
  updatingOrderId === order.id

            return (
             <tr
  key={order.id}
  onClick={() => {
    setSelectedOrder(order)

setEditedOrder(
  structuredClone(order)
)
  }}
  className="
    border-b
    border-[#1F1F1F]
    hover:bg-[rgba(214,179,106,0.03)]
    hover:shadow-[inset_0_0_0_1px_rgba(214,179,106,0.04)]
    cursor-pointer
    transition-all
    duration-300
  "
>

  {/* ORDER */}
  <td className="px-6 py-2.5 align-center">

    <div>

      <p className="font-semibold text-[#F5F1E8]">
        {order.title}
      </p>


    </div>

  </td>

  {/* CONTENT TITLE */}
  <td className="px-6 py-2.5 align-center">

    <div>

      <p className="text-[#F5F1E8] font-medium">
        {
          marketing?.contentTitle ||
          "-"
        }
      </p>

    </div>

  </td>

  {/* LANGUAGES */}
  <td className="px-6 py-2.5 align-center">

    <div className="flex flex-wrap items-center gap-2">

      <div className="flex flex-wrap gap-1">

        {marketing?.sourceLanguage?.map(
          (
            lang: string
          ) => (
            <span
              key={lang}
              className="
                min-w-[34px]
                h-[22px]
                inline-flex
                items-center
                justify-center
                rounded-full
                border
                border-[#2D2D2D]
                bg-[#1A1A1A]
                text-[#EAEAEA]
                text-[10px]
                font-bold
                tracking-[0.12em]
                px-2
              "
            >
              {getLanguageCode(
                lang
              )}
            </span>
          )
        )}

      </div>

      <span className="text-zinc-500">
        →
      </span>

      {marketing?.targetLanguages?.map(
        (
          lang: string
        ) => (
          <span
            key={lang}
            className="
              min-w-[34px]
              h-[22px]
              inline-flex
              items-center
              justify-center
              rounded-full
              bg-[#F5F1E8]
              text-black
              text-[10px]
              font-bold
              tracking-[0.12em]
              px-2
              shadow-[0_0_15px_rgba(245,241,232,0.08)]
            "
          >
            {getLanguageCode(
              lang
            )}
          </span>
        )
      )}

    </div>

  </td>

  {/* FORMAT */}
<td className="px-6 py-2.5 align-center">

  <div className="flex flex-wrap gap-2">

    {marketing?.deliveryFormats?.map(
      (formatItem: any) => (
        <span
          key={formatItem.id}
          className="
            border
            border-[#2B2B2B]
            bg-[#171717]
            px-3
            py-0.5
            rounded-xl
            text-xs
            font-semibold
            tracking-wide
            text-[#F5F1E8]
          "
        >
          {formatItem.format}
        </span>
      )
    )}

  </div>

</td>

{/* STATUS */}
<td className="px-6 py-2.5 align-center whitespace-nowrap">

  {!canUpdateStatus ? (

    <div className="whitespace-nowrap">
      <StatusBadge
        status={order.status}
      />
    </div>

  ) : (

    <div className="relative group/status inline-flex flex-shrink-0">

      <button
  onClick={(e) =>
    e.stopPropagation()
  }
  disabled={isUpdating}
  className="
    rounded-xl
    transition
    hover:scale-[1.02]
    disabled:opacity-60
    disabled:cursor-not-allowed
  "
>
  <div className="whitespace-nowrap">

    {isUpdating ? (

      <div
        className="
          min-w-[110px]
          h-[36px]
          inline-flex
          items-center
          justify-center
          rounded-xl
          border
          border-[#2A2A2A]
          bg-[#171717]
          text-[#D6B36A]
          text-xs
          font-semibold
          animate-pulse
          disabled:opacity-50
disabled:cursor-not-allowed
        "
      >
        Updating...
      </div>

    ) : (

      <StatusBadge
        status={order.status}
      />

    )}

  </div>
</button>

      {/* DROPDOWN */}
      <div
        className="
          absolute
          bottom-full
          left-0
          mb-3
          w-48
          flex
          flex-col
          bg-[#101010]/95
          backdrop-blur-xl
          border
          border-[#242424]
          rounded-2xl
          p-2
          opacity-0
          invisible
          translate-y-2
          group-hover/status:translate-y-0
          group-hover/status:opacity-100
          group-hover/status:visible
          transition-all
          duration-200
          z-[9999]
          shadow-[0_0_40px_rgba(0,0,0,0.55)]
        "
      >

        {order.status ===
          "PENDING" && (
          <>
            <button
            disabled={isUpdating}
              onClick={(e) => {
                e.stopPropagation()

                handleUpdateStatus(
                  order.id,
                  "IN_PROGRESS"
                )
              }}
              className="
                w-full
                text-left
                px-3
                py-2
                rounded-xl
                hover:bg-zinc-800
                text-sm
                transition
                disabled:opacity-50
disabled:cursor-not-allowed
              "
            >
              Start Progress
            </button>

            <button
            disabled={isUpdating}
              onClick={(e) => {
                e.stopPropagation()

                handleUpdateStatus(
                  order.id,
                  "COMPLETED"
                )
              }}
              className="
                w-full
                text-left
                px-3
                py-2
                rounded-xl
                hover:bg-zinc-800
                text-sm
                text-green-400
                transition
                disabled:opacity-50
disabled:cursor-not-allowed
              "
            >
              Mark Completed
            </button>
          </>
        )}

        {order.status ===
          "IN_PROGRESS" && (
          <button
          disabled={isUpdating}
            onClick={(e) => {
              e.stopPropagation()

              handleUpdateStatus(
                order.id,
                "COMPLETED"
              )
            }}
            className="
              w-full
              text-left
              px-3
              py-2
              rounded-xl
              hover:bg-zinc-800
              text-sm
              text-green-400
              transition
              disabled:opacity-50
disabled:cursor-not-allowed
            "
          >
            Mark Completed
          </button>
        )}

        {order.status ===
          "COMPLETED" && (
          <div className="px-3 py-2 text-xs text-zinc-500">
            No actions available
          </div>
        )}

      </div>

    </div>

  )}

</td>

  {/* PRIORITY */}
  <td className="px-6 py-2.5 align-center">

    <span
      className={`px-3 py-1 rounded-lg text-xs font-semibold border ${
        order.priority === "HIGH"
          ? "bg-red-500/10 text-red-400 border-red-500/20"
          : order.priority === "MEDIUM"
          ? "bg-yellow-500/10 text-yellow-400 border-yellow-500/20"
          : "bg-green-500/10 text-green-400 border-green-500/20"
      }`}
    >
      {order.priority}
    </span>

  </td>

  {/* ASSIGN */}
  {canAssignUsers && (
    <td className="px-6 py-2.5 align-center" onClick={(e) => e.stopPropagation()}>
      <button
        onClick={(e) => {
          e.stopPropagation()
          openAssignModal(order)
        }}
        className="text-xs font-semibold text-[#D6B36A] hover:text-[#E4C27C] transition border border-[#D6B36A]/30 hover:border-[#D6B36A]/60 px-3 py-1.5 rounded-xl whitespace-nowrap"
      >
        {order.marketing?.assignments?.length > 0
          ? `Assigned (${order.marketing.assignments.length})`
          : "Assign"}
      </button>
    </td>
  )}

</tr>
            )
          })
        )}

        </tbody>

      </table>

      {/* PAGINATION */}
      <div
  className="
    sticky
    bottom-0
    z-30
    px-7
    py-5
    border-t
    border-[#242424]
    flex
    items-center
    justify-between
    bg-[#101010]/95
    backdrop-blur-xl
  "
>

        <p className="text-sm text-zinc-500">
          Page {page} of {totalPages}
        </p>

        <div className="flex items-center gap-2">

          <button
            disabled={page === 1}
            onClick={() =>
              setPage(page - 1)
            }
            className="
              h-[42px]
              px-4
              rounded-xl
              border
              border-[#2A2A2A]
              bg-[#151515]
              text-sm
              font-medium
              text-zinc-300
              transition-all
              hover:border-[#D6B36A]
              hover:text-white
              disabled:opacity-40
              disabled:cursor-not-allowed
            "
          >
            Previous
          </button>

          {Array.from({
            length: totalPages,
          }).map((_, index) => {

            const pageNumber =
              index + 1

            const active =
              pageNumber === page

            return (
              <button
                key={pageNumber}
                onClick={() =>
                  setPage(pageNumber)
                }
                className={`
                  w-[42px]
                  h-[42px]
                  rounded-xl
                  text-sm
                  font-semibold
                  transition-all

                  ${
                    active
                      ? `
                        bg-[#D6B36A]
                        text-black
                        shadow-[0_0_20px_rgba(214,179,106,0.25)]
                      `
                      : `
                        border
                        border-[#2A2A2A]
                        bg-[#151515]
                        text-zinc-400
                        hover:border-[#D6B36A]
                        hover:text-white
                      `
                  }
                `}
              >
                {pageNumber}
              </button>
            )
          })}

          <button
            disabled={
              page === totalPages
            }
            onClick={() =>
              setPage(page + 1)
            }
            className="
              h-[42px]
              px-4
              rounded-xl
              border
              border-[#2A2A2A]
              bg-[#151515]
              text-sm
              font-medium
              text-zinc-300
              transition-all
              hover:border-[#D6B36A]
              hover:text-white
              disabled:opacity-40
              disabled:cursor-not-allowed
            "
          >
            Next
          </button>

        </div>

      </div>

    </div>

    {/* ASSIGN USERS MODAL */}
    {assigningOrder && (
      <div className="fixed inset-0 bg-black/70 z-[200] flex items-center justify-center">
        <div className="w-[480px] bg-[#0E0E0E] border border-zinc-800 rounded-3xl p-8 flex flex-col max-h-[80vh]">

          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-bold text-[#F5F1E8]">Assign Users</h2>
              <p className="text-sm text-zinc-500 mt-1 truncate max-w-[340px]">{assigningOrder.title}</p>
            </div>
            <button
              onClick={() => setAssigningOrder(null)}
              className="text-zinc-400 hover:text-white transition text-xl flex-shrink-0"
            >
              ✕
            </button>
          </div>

          <input
            value={assignSearch}
            onChange={(e) => setAssignSearch(e.target.value)}
            placeholder="Search users..."
            className="w-full h-[46px] bg-[#171717] border border-[#2A2A2A] rounded-2xl px-4 text-sm text-white outline-none placeholder:text-zinc-600 focus:border-[#D6B36A] mb-4"
          />

          <div className="flex-1 overflow-y-auto space-y-2 min-h-0">
            {isSearching ? (
              <p className="text-sm text-zinc-600 text-center py-4">Searching...</p>
            ) : searchResults.length === 0 ? (
              <p className="text-sm text-zinc-600 text-center py-4">
                {assignSearch.trim() ? "No users found" : "Type to search users"}
              </p>
            ) : (
              searchResults.map((user: any) => {
                const isSelected = selectedUserIds.includes(user.id)
                return (
                  <button
                    key={user.id}
                    onClick={() => toggleUser(user.id)}
                    className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl border transition text-left ${
                      isSelected
                        ? "bg-[#D6B36A]/10 border-[#D6B36A]/40"
                        : "bg-[#111111] border-[#242424] hover:border-[#3A3A3A]"
                    }`}
                  >
                    <div>
                      <p className={`font-medium text-sm ${isSelected ? "text-[#D6B36A]" : "text-[#F5F1E8]"}`}>
                        {user.firstName} {user.lastName}
                      </p>
                      {user.position && (
                        <p className="text-xs text-zinc-500 mt-0.5">
                          {user.position.replace(/_/g, " ")}
                        </p>
                      )}
                    </div>
                    {isSelected && (
                      <span className="text-[#D6B36A] text-lg">✓</span>
                    )}
                  </button>
                )
              })
            )}
          </div>

          <div className="grid grid-cols-2 gap-3 mt-6">
            <button
              onClick={() => setAssigningOrder(null)}
              className="bg-zinc-900 border border-zinc-800 py-3 rounded-2xl font-semibold hover:bg-zinc-800 transition"
            >
              Cancel
            </button>
            <button
              onClick={saveAssign}
              disabled={isSavingAssign}
              className="bg-[#D6B36A] text-black py-3 rounded-2xl font-semibold hover:bg-[#E4C27C] transition disabled:opacity-50"
            >
              {isSavingAssign ? "Saving..." : `Save (${selectedUserIds.length})`}
            </button>
          </div>

        </div>
      </div>
    )}
    </>
  )
}