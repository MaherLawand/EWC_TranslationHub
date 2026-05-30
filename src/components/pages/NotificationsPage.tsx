import React from "react"
import { gearWarp } from "../../lib/gearHover"

type Props = {
  notifications: any[]
  markNotificationsAsRead: () => void
  orders: any[]
  navigateToOrder: (notification: any, order: any | null) => void
}

export default function NotificationsPage({
  notifications,
  markNotificationsAsRead,
  orders,
  navigateToOrder,
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


  function getOrderFromNotification(notification: any) {
    return orders.find((order) => order.id === notification.order?.id)
  }

  function renderNotificationLine(notification: any, order: any) {
    const msg = notification.message ?? ""
    const unread = !notification.isRead
    const gold = unread ? "text-gear-gradient" : "text-gear-gradient opacity-50"
    const muted = unread ? "text-zinc-400" : "text-zinc-600"

    // "X has been marked as completed by John Doe"
    const completedMatch = msg.match(/^(.+) has been marked as completed by (.+)$/)
    if (completedMatch) {
      return (
        <>
          <span className={gold}>{completedMatch[1]}</span>
          <span className={muted}> has been marked as completed by </span>
          <span className={gold}>{completedMatch[2]}</span>
        </>
      )
    }

    // "You have been assigned to the marketing/broadcast order: X"
    const assignedMatch = msg.match(/^You have been assigned to the (?:\w+ )?order: (.+)$/)
    if (assignedMatch) {
      return (
        <>
          <span className={gold}>{assignedMatch[1]}</span>
          <span className={muted}> — you have been assigned</span>
        </>
      )
    }

    // 'A source file was added for "X"'
    const sourceMatch = msg.match(/^A source file was added for "(.+)"$/)
    if (sourceMatch) {
      return (
        <>
          <span className={gold}>{sourceMatch[1]}</span>
          <span className={muted}> — source file added</span>
        </>
      )
    }

    // fallback
    const fallbackTitle = order?.title || notification.order?.title || "Order"
    return <><span className={gold}>{fallbackTitle}</span><span className={muted}> — {msg}</span></>
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
          onMouseMove={gearWarp}
          className="
            btn-gear
            h-[46px]
            px-5
            rounded-2xl
            text-sm
            font-semibold
            flex
            items-center
            justify-center
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
          if (!notification.order?.id) return
          navigateToOrder(notification, order ?? null)
        }}

        className={`
          px-7
          py-3
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

        <div className="flex items-center justify-between gap-4">

          {/* LEFT */}
          <div className="flex items-center gap-3 flex-1 min-w-0">

            {/* GAME LOGO */}
            {logo && (
              <div
                className="
                  w-[34px]
                  h-[34px]
                  rounded-xl
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
                  className="w-[20px] h-[20px] object-contain"
                />
              </div>
            )}

            {/* CONTENT */}
            <div className="min-w-0 flex-1">

              <p className="text-sm font-semibold leading-snug">
                {renderNotificationLine(notification, order)}
              </p>

              <p
                className={`
                  text-xs
                  mt-1
                  ${!notification.isRead ? "text-[#D6B36A]/50" : "text-zinc-700"}
                `}
              >
                {new Date(notification.createdAt).toLocaleString()}
              </p>

            </div>

          </div>

          {/* NEW BADGE */}
          {!notification.isRead && (
            <div className="flex-shrink-0">
              <div
                className="
                  gear-fill
                  px-2.5
                  h-[20px]
                  rounded-full
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
                          gear-fill
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