import React from "react"

type Props = {
  notifications: any[]
  markNotificationsAsRead: () => void

  setSelectedOrder: (
    order: any
  ) => void

  setEditedOrder: (
    order: any
  ) => void

  orders: any[]

  setActivePage: (
    page: string
  ) => void

  setSearch: (
    value: string
  ) => void

  setStatusFilter: (
    value: string
  ) => void

  setPriorityFilter: (
    value: string
  ) => void

setFormatFilter: (
  value: string[]
) => void

  setSelectedGameFilter: (
    value: string
  ) => void
}

export default function NotificationsPage({
  notifications,
  markNotificationsAsRead,
  setSelectedOrder,
  setEditedOrder,
  orders,
  setActivePage,
  setSearch,
  setStatusFilter,
  setPriorityFilter,
  setFormatFilter,
  setSelectedGameFilter
}: Props) {

  const ITEMS_PER_PAGE = 15

  const [page, setPage] =
    React.useState(1)

  const totalPages =
    Math.ceil(
      notifications.length /
        ITEMS_PER_PAGE
    ) || 1

  const paginatedNotifications =
    notifications.slice(
      (page - 1) *
        ITEMS_PER_PAGE,

      page * ITEMS_PER_PAGE
    )


function getOrderFromNotification(
  notification: any
) {
  return orders.find(
    (order) =>
      order.id ===
      notification.order?.id
  )
}

  return (
    <div
      className="
        rounded-[30px]
        border
        border-[#242424]
        bg-[#0E0E0E]
        overflow-hidden
        shadow-[0_15px_50px_rgba(0,0,0,0.35)]
      "
    >

      {/* HEADER */}
      <div
        className="
          px-7
          py-6
          border-b
          border-[#1F1F1F]
          flex
          items-center
          justify-between
          gap-6
        "
      >

        {/* LEFT */}
        <div>

          <h2
            className="
              text-[24px]
              font-bold
              tracking-tight
              text-[#F5F1E8]
            "
          >
            Notifications
          </h2>

          <p className="text-zinc-500 mt-1 text-sm">
            Recent order activity
          </p>

        </div>

        {/* RIGHT */}
        <button
          type="button"
          onClick={markNotificationsAsRead}
          className="
            h-[46px]
            px-5
            rounded-2xl
            border
            border-[#D6B36A]/20
            bg-[#D6B36A]
            text-black
            text-sm
            font-semibold
            transition-all
            flex
            items-center
            justify-center
            hover:bg-[#E7C989]
            hover:shadow-[0_0_25px_rgba(214,179,106,0.18)]
            active:scale-[0.98]
            flex-shrink-0
          "
        >
          Mark All Read
        </button>

      </div>

      {/* LIST */}
      <div className="divide-y divide-[#1A1A1A]">

        {paginatedNotifications.length ===
        0 ? (
          <div className="p-8 text-zinc-500 text-sm">
            No notifications yet
          </div>
        ) : (
paginatedNotifications.map(
  (notification) => {

    const order =
      getOrderFromNotification(
        notification
      )

    const logo =
      order?.broadcast?.game
        ?.logo

    return (
      <div
        key={notification.id}

        onClick={() => {

  if (!order) return

  // open correct page
  if (
    order.type ===
    "MARKETING"
  ) {

    setActivePage(
      "marketing"
    )

  } else {

    setActivePage(
      "games"
    )

    if (
      order.broadcast?.game?.id
    ) {
      setSelectedGameFilter(
        order.broadcast.game.id
      )
    }
  }

  // autofill filters
  setSearch(order.title || "")

  setStatusFilter(
    order.status
      .replace("_", " ")
  )

  setPriorityFilter(
    order.priority || ""
  )

  setFormatFilter(
  (
    order.broadcast
      ?.deliveryFormats ||

    order.marketing
      ?.deliveryFormats ||

    []
  ).map(
    (format: any) =>
      format.format
  )
)

  // open sidebar
  setSelectedOrder(order)

  setEditedOrder(
    JSON.parse(
      JSON.stringify(order)
    )
  )
}}

        className={`
          px-7
          py-5
          transition-all
          relative
          overflow-hidden
          cursor-pointer

          ${
            !notification.isRead
              ? `
                bg-[linear-gradient(90deg,rgba(214,179,106,0.08),transparent)]
                border-l
                border-[#D6B36A]
              `
              : `
                hover:bg-[#121212]
              `
          }
        `}
      >

        <div className="flex items-start justify-between gap-4">

          {/* LEFT */}
          <div className="flex items-start gap-4 flex-1 min-w-0">

            {/* GAME LOGO */}
            {logo && (
              <div
                className="
                  w-[46px]
                  h-[46px]
                  rounded-2xl
                  border
                  border-[#242424]
                  bg-[#121212]
                  flex
                  items-center
                  justify-center
                  flex-shrink-0
                "
              >

                <img
                  src={logo}
                  alt="Game"
                  className="
                    w-[28px]
                    h-[28px]
                    object-contain
                  "
                />

              </div>
            )}

            {/* CONTENT */}
            <div className="min-w-0 flex-1">

              <p
                className={`
                  font-semibold
                  ${
                    !notification.isRead
                      ? "text-white"
                      : "text-[#F5F1E8]"
                  }
                `}
              >
                {notification.title}
              </p>

              <p
                className={`
                  text-sm
                  mt-2
                  leading-relaxed

                  ${
                    !notification.isRead
                      ? "text-zinc-300"
                      : "text-zinc-400"
                  }
                `}
              >
                {notification.message}
              </p>

              <p
                className={`
                  text-xs
                  mt-4

                  ${
                    !notification.isRead
                      ? "text-[#D6B36A]"
                      : "text-zinc-600"
                  }
                `}
              >
                {new Date(
                  notification.createdAt
                ).toLocaleString()}
              </p>

            </div>

          </div>

          {/* NEW BADGE */}
          {!notification.isRead && (
            <div
              className="
                flex
                items-center
                gap-2
                flex-shrink-0
              "
            >

              <div
                className="
                  px-2.5
                  h-[24px]
                  rounded-full
                  bg-[#D6B36A]
                  text-black
                  text-[10px]
                  font-bold
                  flex
                  items-center
                  justify-center
                  shadow-[0_0_14px_rgba(214,179,106,0.35)]
                "
              >
                NEW
              </div>

            </div>
          )}

        </div>

      </div>
    )
  }
)
        )}

      </div>

      {/* PAGINATION */}
      {notifications.length > 15 && (
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
      )}

    </div>
  )
}