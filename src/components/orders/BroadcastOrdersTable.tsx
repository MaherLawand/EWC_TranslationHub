import React from "react"

import StatusBadge from "../shared/StatusBadge"

import {
  LANGUAGES,
} from "../../constants/languages"

type Props = {
  orders: any[]
currentUser: any
  setSelectedOrder: (
    order: any
  ) => void

  setEditedOrder: (
    order: any
  ) => void

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
  setSelectedOrder,
  setEditedOrder,
  updateOrderStatus,
  getDeadlineInfo,
  currentUser,
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
  }, [orders])

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

            <th className="text-left px-6 py-5">
              Order
            </th>

            <th className="text-left px-6 py-5">
              Game
            </th>

            <th className="text-left px-6 py-5">
              Languages
            </th>

            <th className="text-left px-6 py-5">
              Format
            </th>

            <th className="text-left px-6 py-5">
              Deadline
            </th>

            <th className="text-left px-6 py-5">
              Status
            </th>

            <th className="text-left px-6 py-5">
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

  ) : paginatedOrders.length === 0 ? (

    <tr>
      <td
        colSpan={7}
        className="py-20 text-center text-zinc-500"
      >
        No orders found
      </td>
    </tr>

  ) : (

    paginatedOrders.map((order) => {

            const broadcast =
              order.broadcast

            return (
              <tr
                key={order.id}
                onClick={() => {
                  setSelectedOrder(order)

                  setEditedOrder(
                    JSON.parse(
                      JSON.stringify(
                        order
                      )
                    )
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
                <td className="px-6 py-6 align-center">

                  <div>

                    <p className="font-semibold text-[#F5F1E8]">
                      {order.title}
                    </p>

                  </div>

                </td>

                {/* GAME */}
                <td className="px-6 py-5 text-zinc-300 align-center">
                  {broadcast?.game
                    ?.name || "-"}
                </td>

                {/* LANGUAGES */}
                <td className="px-6 py-6 align-center">

                  <div className="flex flex-wrap items-center gap-2">

                    <div className="flex flex-wrap gap-1">

                      {broadcast?.sourceLanguage.map(
                        (
                          lang: string
                        ) => (
                          <span
                            key={lang}
                            className="
                              min-w-[34px]
                              h-[28px]
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

                    {broadcast?.targetLanguages.map(
                      (
                        lang: string
                      ) => (
                        <span
                          key={lang}
                          className="
                            min-w-[34px]
                            h-[28px]
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
                <td className="px-6 py-6 align-center">

                  <span
                    className="
                      border
                      border-[#2B2B2B]
                      bg-[#171717]
                      px-3
                      py-1.5
                      rounded-xl
                      text-xs
                      font-semibold
                      tracking-wide
                      text-[#F5F1E8]
                    "
                  >
                    {
                      broadcast?.deliveryFormat
                    }
                  </span>

                </td>

                {/* DEADLINE */}
                <td className="px-6 py-5 text-zinc-300 align-center">

                  {broadcast?.deadlineDate ? (
                    <div>

                      <p>
                        {new Date(
                          broadcast.deadlineDate
                        ).toLocaleDateString()}
                      </p>

                      {(() => {

                        const info =
                          getDeadlineInfo(
                            broadcast.deadlineDate
                          )

                        return (
                          <p
                            className={`text-xs mt-1 ${info.color}`}
                          >
                            {info.text}
                          </p>
                        )
                      })()}

                    </div>
                  ) : (
                    "-"
                  )}

                </td>

{/* STATUS */}
<td className="px-6 py-6 align-center whitespace-nowrap">

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
        className="rounded-xl transition hover:scale-[1.02]"
      >
        <div className="whitespace-nowrap">
          <StatusBadge
            status={order.status}
          />
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
              onClick={(e) => {
                e.stopPropagation()

                updateOrderStatus(
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
              "
            >
              Start Progress
            </button>

            <button
              onClick={(e) => {
                e.stopPropagation()

                updateOrderStatus(
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
            onClick={(e) => {
              e.stopPropagation()

              updateOrderStatus(
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
                <td className="px-6 py-6 align-center">

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
  )
}