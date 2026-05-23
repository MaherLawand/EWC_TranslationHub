import React from "react"

import StatusBadge from "../shared/StatusBadge"
import PaginationBar from "../shared/PaginationBar"

import {
  LANGUAGES,
} from "../../constants/languages"

type Props = {
  orders: any[]
  currentUser: any
  page: number
  totalPages: number
  onPageChange: (page: number) => void
  onRowClick: (order: any) => void
  updateOrderStatus: (
    orderId: string,
    status: string
  ) => void
  getDeadlineInfo: (
    deadlineDate: string
  ) => {
    text: string
    color: string
  }
  isLoading?: boolean
}

export default function BroadcastOrdersTable({
  orders,
  page,
  totalPages,
  onPageChange,
  onRowClick,
  updateOrderStatus,
  getDeadlineInfo,
  currentUser,
  isLoading,
}: Props) {

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
  React.useState<string | null>(
    null
  )

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
    <div
      className="
        bg-[radial-gradient(ellipse_at_top,rgba(214,179,106,0.06),transparent_0%)]
        bg-[#0E0E0E]
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
            Broadcast
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
      <div className="table-scroll">
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
              Game
            </th>

            <th className="text-left px-6 py-3">
              Languages
            </th>

            <th className="text-left px-6 py-3">
              Format
            </th>

            <th className="text-left px-6 py-3">
              Deadline
            </th>

            <th className="text-left px-6 py-3">
              Status
            </th>

            <th className="text-left px-6 py-3">
              Priority
            </th>

          </tr>

        </thead>

          <tbody>

  {isLoading ? (

    <tr>
      <td
        colSpan={7}
        className="py-20 text-center text-zinc-500"
      >
        Loading orders...
      </td>
    </tr>

  ) : orders.length === 0 ? (

    <tr>
      <td
        colSpan={7}
        className="py-20 text-center text-zinc-500"
      >
        No orders found
      </td>
    </tr>

  ) : (

    orders.map((order) => {

            const broadcast =
              order.broadcast

              const isUpdating =
  updatingOrderId === order.id

            return (
              <tr
                key={order.id}
                onClick={() => onRowClick(order)}
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

                {/* GAME */}
                <td className="px-6 py-2.5 text-zinc-300 align-center">
                  {broadcast?.game?.name
                    ? broadcast.game.name
                    : <span className="text-zinc-600">—</span>}
                </td>

                {/* LANGUAGES */}
                <td className="px-6 py-2.5 align-center">

                  <div className="flex flex-wrap items-center gap-2">

                    {/* SOURCE */}
                    {broadcast?.sourceLanguage?.length ? (
                      <div className="flex flex-wrap gap-1">
                        {broadcast.sourceLanguage.map((lang: string) => (
                          <span
                            key={lang}
                            className="min-w-[34px] h-[22px] inline-flex items-center justify-center rounded-full border border-[#2D2D2D] bg-[#1A1A1A] text-[#EAEAEA] text-[10px] font-bold tracking-[0.12em] px-2"
                          >
                            {getLanguageCode(lang)}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-zinc-600">—</span>
                    )}

                    <span className="text-zinc-500">→</span>

                    {/* TARGET */}
                    {broadcast?.targetLanguages?.length ? (
                      <div className="flex flex-wrap gap-1">
                        {broadcast.targetLanguages.map((lang: string) => (
                          <span
                            key={lang}
                            className="min-w-[34px] h-[22px] inline-flex items-center justify-center rounded-full bg-[#F5F1E8] text-black text-[10px] font-bold tracking-[0.12em] px-2 shadow-[0_0_15px_rgba(245,241,232,0.08)]"
                          >
                            {getLanguageCode(lang)}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-zinc-600">—</span>
                    )}

                  </div>

                </td>

                {/* FORMAT */}
                <td className="px-6 py-2.5 align-center">

  {!broadcast?.deliveryFormats?.length ? (
    <span className="text-zinc-600">—</span>
  ) : (
  <div className="flex flex-wrap gap-2">

    {broadcast?.deliveryFormats?.map(
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
  )}

</td>

                {/* DEADLINE */}
                <td className="px-6 py-2.5 text-zinc-300 align-center">

                  {broadcast?.deadlineDate ? (
                    <div className="flex items-center gap-2 whitespace-nowrap">
                      <span>
                        {new Date(broadcast.deadlineDate).toLocaleDateString()}
                      </span>
                      {(() => {
                        const info = getDeadlineInfo(broadcast.deadlineDate)
                        return (
                          <span className={`text-xs ${info.color}`}>
                            {info.text}
                          </span>
                        )
                      })()}
                    </div>
                  ) : (
                    <span className="text-zinc-600">—</span>
                  )}

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
                      order.priority ===
                      "HIGH"
                        ? "bg-red-500/10 text-red-400 border-red-500/20"
                        : order.priority ===
                          "MEDIUM"
                        ? "bg-yellow-500/10 text-yellow-400 border-yellow-500/20"
                        : "bg-green-500/10 text-green-400 border-green-500/20"
                    }`}
                  >
                    {order.priority}
                  </span>

                </td>

              </tr>
            )
          })
        )}

        </tbody>

      </table>
      </div>

      {/* PAGINATION */}
      <PaginationBar page={page} totalPages={totalPages} onPageChange={onPageChange} />

    </div>
  )
}