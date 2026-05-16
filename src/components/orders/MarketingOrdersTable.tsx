import React from "react"

import StatusBadge from "../shared/StatusBadge"

type Props = {
  orders: any[]

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
}

export default function MarketingOrdersTable({
  orders,
  setSelectedOrder,
  setEditedOrder,
  updateOrderStatus,
}: Props) {

  const ITEMS_PER_PAGE = 6

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

  return (
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

            <th className="text-left px-6 py-5">
              Order
            </th>

            <th className="text-left px-6 py-5">
              Format
            </th>

            <th className="text-left px-6 py-5">
              Source File
            </th>

            <th className="text-left px-6 py-5">
              Delivered Link
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

          {paginatedOrders.map(
            (order) => {

            const marketing =
              order.marketing

            return (
              <tr
                key={order.id}
                onClick={() => {
                  setSelectedOrder(order)

                  setEditedOrder(
                    JSON.parse(
                      JSON.stringify(order)
                    )
                  )
                }}
                className="
                  border-b
                  border-[#1F1F1F]
                  hover:bg-[rgba(214,179,106,0.03)]
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

                    <p className="text-sm text-zinc-500 mt-1">
                      {order.id}
                    </p>

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
                      marketing?.deliveryFormat
                    }
                  </span>

                </td>

                {/* SOURCE FILE */}
                <td className="px-6 py-6 align-center">

                  {marketing?.sourceFileLink ? (
                    <a
                      href={
                        marketing.sourceFileLink
                      }
                      target="_blank"
                      rel="noreferrer"
                      onClick={(e) =>
                        e.stopPropagation()
                      }
                      className="
                        text-[#D6B36A]
                        text-sm
                        underline
                        break-all
                        hover:text-[#E7C987]
                        transition
                      "
                    >
                      Source File
                    </a>
                  ) : (
                    <span className="text-zinc-600">
                      -
                    </span>
                  )}

                </td>

                {/* DELIVERED LINK */}
                <td className="px-6 py-6 align-center">

                  {marketing?.deliveredLink ? (
                    <a
                      href={
                        marketing.deliveredLink
                      }
                      target="_blank"
                      rel="noreferrer"
                      onClick={(e) =>
                        e.stopPropagation()
                      }
                      className="
                        text-[#D6B36A]
                        text-sm
                        underline
                        break-all
                        hover:text-[#E7C987]
                        transition
                      "
                    >
                      Delivered File
                    </a>
                  ) : (
                    <span className="text-zinc-600">
                      -
                    </span>
                  )}

                </td>

                {/* STATUS */}
                <td className="px-6 py-6 align-center">

                  <div className="relative w-fit">

                    <button
                      onClick={(e) =>
                        e.stopPropagation()
                      }
                      className="rounded-xl transition hover:scale-[1.02]"
                    >
                      <StatusBadge
                        status={order.status}
                      />
                    </button>

                  </div>

                </td>

                {/* PRIORITY */}
                <td className="px-6 py-6 align-center">

                  <span
                    className={`px-3 py-1 rounded-lg text-xs font-semibold border ${
                      order.priority === "HIGH"
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
          })}

        </tbody>

      </table>

      {/* PAGINATION */}
      <div
        className="
          px-7
          py-5
          border-t
          border-[#242424]
          flex
          items-center
          justify-between
          bg-[#101010]
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