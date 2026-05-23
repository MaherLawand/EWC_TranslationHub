import React from "react"
import StatusBadge from "../shared/StatusBadge"
import SectionTitle from "../shared/SectionTitle"
import { LANGUAGES } from "../../constants/languages"

type Props = {
  selectedOrder: any
  currentUser: any
  orderDetail: any | null
  isLoadingDetail: boolean
  activePage: string

  setSelectedOrder: (
    order: any
  ) => void

  setIsEditingOrder: (
    value: boolean
  ) => void

  setIsEditing: (
    value: boolean
  ) => void

  setEditingOrderId: (
    id: string
  ) => void

  setNewOrder: (
    value: any
  ) => void

  setShowModal: (
    value: boolean
  ) => void

  showDeleteModal: boolean

  setShowDeleteModal: (
    value: boolean
  ) => void

  setDeletingOrderId: (
    id: string
  ) => void

  deleteOrder: () => void
  canManageOrders: boolean
  getDeadlineInfo: (
    deadlineDate: string
  ) => {
    text: string
    color: string
  }
}

export default function OrderDetailsSidebar({
  selectedOrder,
  orderDetail,
  isLoadingDetail,
  currentUser,
  setSelectedOrder,
  setIsEditingOrder,
  setIsEditing,
  setEditingOrderId,
  setNewOrder,
  setShowModal,
  showDeleteModal,
  setShowDeleteModal,
  setDeletingOrderId,
  deleteOrder,
  canManageOrders,
  getDeadlineInfo,
  activePage
}: Props) {

  function getLanguageCode(languageName: string) {
    return (
      LANGUAGES.find((l) => l.name === languageName)?.code.toUpperCase() ||
      languageName.slice(0, 2).toUpperCase()
    )
  }

  const isAdmin = currentUser?.role === "ADMIN"

  const [historyOpen, setHistoryOpen] = React.useState(false)

  function formatUrl(url: string) {
    if (!url) return "#"
    if (url.startsWith("http://") || url.startsWith("https://")) return url
    return `https://${url}`
  }

  const isBroadcastReadOnly =
    activePage === "Broadcast" &&
    currentUser?.department === "MARKETING"

  return (
<div className="w-[520px] border-l border-[#2A2A2A] bg-[#090909] overflow-auto flex-shrink-0">
      <div className="px-8">

{/* HEADER */}
<div
  className="
    sticky
    top-0
    z-40
    mb-8
    border-b
    border-[#242424]
    pb-6
    pt-8
    bg-[#090909]/95
    backdrop-blur-xl
  "
>

  {/* CLOSE */}
  <button
    onClick={() => {
      setSelectedOrder(null)
      setIsEditingOrder(false)
    }}
    className="absolute top-8 right-5 text-zinc-400 hover:text-white transition text-xl"
  >
    ✕
  </button>

  {/* TITLE */}
  <h1 className="text-[20px] font-bold tracking-tight text-[#F5F1E8] leading-tight max-w-[280px]">
    {selectedOrder.title}
  </h1>

  {/* STATUS */}
  <div className="mt-5 flex items-center gap-3">

    <StatusBadge
      status={selectedOrder.status}
    />

    {selectedOrder.priority && (
      <div
        className={`px-3 py-1 rounded-lg text-[11px] font-semibold border ${
          selectedOrder.priority === "HIGH"
            ? "bg-red-500/10 border-red-500/20 text-red-400"
            : selectedOrder.priority === "MEDIUM"
            ? "bg-yellow-500/10 border-yellow-500/20 text-[#D6B36A]"
            : "bg-green-500/10 border-green-500/20 text-green-400"
        }`}
      >
        {selectedOrder.priority}
      </div>
    )}

  </div>

</div>

        {/* BODY — shows skeleton while detail is loading */}
        {isLoadingDetail ? (
          <div className="space-y-4 mt-2 animate-pulse pb-10">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-16 bg-[#161616] rounded-[20px] border border-[#242424]" />
            ))}
          </div>
        ) : (
        <>

        {/* GENERAL */}
        <div className="mb-10">

          <SectionTitle title="General" />

          <div className="bg-[radial-gradient(circle_at_top,rgba(214,179,106,0.08),transparent_60%)] bg-[#111111] border border-[#242424] rounded-[28px] p-6 shadow-[0_0_40px_rgba(0,0,0,0.45)] space-y-5">

  <div className="flex justify-between items-center">
    <p className="text-zinc-500 text-sm">Created By</p>
    <p className="text-[#F5F1E8] font-medium">
      {orderDetail?.createdBy
        ? `${orderDetail.createdBy.firstName} ${orderDetail.createdBy.lastName}`
        : <span className="text-zinc-600">—</span>}
    </p>
  </div>

  <div className="flex justify-between items-center">
    <p className="text-zinc-500 text-sm">Type</p>
    <p className="text-[#F5F1E8] font-medium">{selectedOrder.type}</p>
  </div>

  <div className="flex justify-between items-center">
    <p className="text-zinc-500 text-sm">Date Added</p>
    <p className="text-[#F5F1E8] font-medium">
      {new Date(selectedOrder.dateAdded).toLocaleDateString()}
    </p>
  </div>

  {isAdmin && (
    <div className="flex justify-between items-center">
      <p className="text-zinc-500 text-sm">Last Edited By</p>
      <div className="text-right">
        <p className="text-[#F5F1E8] font-medium">
          {orderDetail?.lastEditedBy
            ? `${orderDetail.lastEditedBy.firstName} ${orderDetail.lastEditedBy.lastName}`
            : <span className="text-zinc-600">—</span>}
        </p>
        {orderDetail?.lastEditedAt && (
          <p className="text-xs text-zinc-500 mt-1">
            {new Date(orderDetail.lastEditedAt).toLocaleString()}
          </p>
        )}
      </div>
    </div>
  )}

</div>

        </div>

        {/* NOTES */}
        <div className="mb-10">

          <SectionTitle title="Notes" />

          <div className="bg-[radial-gradient(circle_at_top,rgba(214,179,106,0.08),transparent_60%)] bg-[#111111] border border-[#242424] rounded-[28px] p-6 shadow-[0_0_40px_rgba(0,0,0,0.45)]">
            {orderDetail?.notes ? (
              <p className="text-sm text-[#F5F1E8] leading-relaxed whitespace-pre-wrap">
                {orderDetail.notes}
              </p>
            ) : (
              <p className="text-sm text-zinc-600">No notes added</p>
            )}
          </div>

        </div>

        {/* EDIT HISTORY */}
{isAdmin && orderDetail?.editHistory?.length > 0 && (
  <div className="mb-10">

    <button
      onClick={() => setHistoryOpen((o) => !o)}
      className="w-full flex items-center justify-between mb-4 group"
    >
      <span className="text-[11px] font-semibold tracking-[0.15em] uppercase text-zinc-500 group-hover:text-zinc-400 transition">
        Edit History
        <span className="ml-2 text-zinc-600">({orderDetail.editHistory.length})</span>
      </span>
      <svg
        className={`w-4 h-4 text-zinc-600 group-hover:text-zinc-400 transition-transform duration-200 ${historyOpen ? "rotate-180" : ""}`}
        fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
      </svg>
    </button>

    {historyOpen && (
      <div className="bg-[radial-gradient(circle_at_top,rgba(214,179,106,0.08),transparent_60%)] bg-[#111111] border border-[#242424] rounded-[28px] p-6 shadow-[0_0_40px_rgba(0,0,0,0.45)] space-y-4">
        {orderDetail.editHistory.map((edit: any) => (
          <div
            key={edit.id}
            className="flex items-center justify-between border-b border-[#1F1F1F] pb-4 last:border-0 last:pb-0"
          >
            <div>
              <p className="text-[#F5F1E8] font-medium">
                {edit.editedBy?.firstName} {edit.editedBy?.lastName}
              </p>
              <p className="text-xs text-zinc-500 mt-1">Edited order</p>
            </div>
            <p className="text-sm text-zinc-400">
              {new Date(edit.editedAt).toLocaleString()}
            </p>
          </div>
        ))}
      </div>
    )}

  </div>
)}

{/* BROADCAST */}
{orderDetail?.broadcast && (
  <>
    {/* BASIC INFO */}
    <div className="mt-10">

      <SectionTitle title="Basic Information" />

      <div className="bg-[radial-gradient(circle_at_top,rgba(214,179,106,0.08),transparent_60%)] bg-[#111111] border border-[#242424] rounded-[28px] p-6 shadow-[0_0_40px_rgba(0,0,0,0.45)] space-y-5">

  <div className="flex justify-between items-center">
    <p className="text-zinc-500 text-sm">Game</p>
    <p className="text-[#F5F1E8] font-medium">
      {orderDetail.broadcast?.game?.name
        ? orderDetail.broadcast.game.name
        : <span className="text-zinc-600">—</span>}
    </p>
  </div>

  <div className="flex justify-between items-center">
    <p className="text-zinc-500 text-sm">Estimated Length</p>
    <p className="text-[#F5F1E8] font-medium">
      {orderDetail.broadcast?.estimatedMinutes
        ? `${orderDetail.broadcast.estimatedMinutes} minutes`
        : <span className="text-zinc-600">—</span>}
    </p>
  </div>

</div>

    </div>

{/* TRANSLATION DETAILS */}
<div className="mt-10">

  <SectionTitle title="Translation Details" />

  <div className="bg-[radial-gradient(circle_at_top,rgba(214,179,106,0.08),transparent_60%)] bg-[#111111] border border-[#242424] rounded-[28px] p-6 shadow-[0_0_40px_rgba(0,0,0,0.45)] space-y-6">

{/* TRANSLATED FROM */}
<div className="flex flex-col gap-3">

  <p className="text-zinc-500 text-sm">Translated From</p>

  {!orderDetail.broadcast?.sourceLanguage?.length ? (
    <span className="text-zinc-600 text-sm">—</span>
  ) : (
  <div className="flex flex-wrap gap-2">

    {orderDetail.broadcast?.sourceLanguage?.map((lang: string) => (
      <div key={lang} className="group relative">
        <div className="min-w-[46px] h-[34px] inline-flex items-center justify-center rounded-full border border-[#2D2D2D] bg-[#1B1B1B] px-3 text-xs font-semibold tracking-wide text-white transition hover:border-[#D6B36A] hover:text-[#D6B36A]">
          {getLanguageCode(lang)}
        </div>
        <div className="pointer-events-none absolute left-1/2 top-0 z-50 -translate-x-1/2 -translate-y-[115%] opacity-0 transition-all duration-200 group-hover:opacity-100">
          <div className="whitespace-nowrap rounded-xl border border-[#2D2D2D] bg-[#121212] px-3 py-1.5 text-xs font-medium text-[#F5F1E8] shadow-[0_0_20px_rgba(0,0,0,0.45)]">
            {lang}
          </div>
        </div>
      </div>
    ))}

  </div>
  )}

</div>

{/* TRANSLATED TO */}
<div className="flex flex-col gap-3">

  <p className="text-zinc-500 text-sm">To Be Translated To</p>

  {!orderDetail.broadcast?.targetLanguages?.length ? (
    <span className="text-zinc-600 text-sm">—</span>
  ) : (
  <div className="flex flex-wrap gap-2">

    {orderDetail.broadcast?.targetLanguages?.map((lang: string) => (
      <div key={lang} className="group relative">
        <div className="min-w-[46px] h-[34px] inline-flex items-center justify-center rounded-full border border-[#F5F1E8] bg-[#F5F1E8] px-3 text-xs font-bold tracking-wide text-black transition hover:bg-[#D6B36A] hover:border-[#D6B36A]">
          {getLanguageCode(lang)}
        </div>
        <div className="pointer-events-none absolute left-1/2 top-0 z-50 -translate-x-1/2 -translate-y-[115%] opacity-0 transition-all duration-200 group-hover:opacity-100">
          <div className="whitespace-nowrap rounded-xl border border-[#2D2D2D] bg-[#121212] px-3 py-1.5 text-xs font-medium text-[#F5F1E8] shadow-[0_0_20px_rgba(0,0,0,0.45)]">
            {lang}
          </div>
        </div>
      </div>
    ))}

  </div>
  )}

</div>

  </div>

</div>

{/* DELIVERY FORMATS */}
{/* <div className="mt-10">

  <SectionTitle title="Delivery Formats" />

  <div className="bg-[radial-gradient(circle_at_top,rgba(214,179,106,0.08),transparent_60%)] bg-[#111111] border border-[#242424] rounded-[28px] p-6 shadow-[0_0_40px_rgba(0,0,0,0.45)] space-y-5">

    {orderDetail.broadcast?.deliveryFormats?.map((formatItem: any) => (
      <div key={formatItem.id} className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <img src="/google-drive.png" alt="Drive" className="w-5 h-5 mt-[2px]" />
          <div>
            <p className="text-zinc-500 text-sm">{formatItem.format}</p>
            {formatItem.deliveryLink ? (
              <a href={formatUrl(formatItem.deliveryLink)} target="_blank" rel="noreferrer" className="text-[#D6B36A] underline text-sm break-all mt-1 block">
                {formatItem.deliveryLink}
              </a>
            ) : (
              <p className="text-zinc-600 text-sm mt-1">No link added</p>
            )}
          </div>
        </div>
      </div>
    ))}

  </div>

</div> */}

{/* DATES */}
<div className="mt-10">

  <SectionTitle title="Dates" />

  <div className="bg-[radial-gradient(circle_at_top,rgba(214,179,106,0.08),transparent_60%)] bg-[#111111] border border-[#242424] rounded-[28px] p-6 shadow-[0_0_40px_rgba(0,0,0,0.45)] space-y-6">

    <div className="flex justify-between items-start">
      <div className="flex items-start gap-3">
        <div className="mt-[2px] text-[#D6B36A]">
          <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        </div>
        <p className="text-zinc-500 text-sm">Source Will Be Added On</p>
      </div>
      <p className="text-[#F5F1E8] font-medium">
        {orderDetail.broadcast?.deliveryDate
          ? new Date(orderDetail.broadcast.deliveryDate).toLocaleDateString()
          : <span className="text-zinc-600">—</span>}
      </p>
    </div>

    <div className="flex justify-between items-start">
      <div className="flex items-start gap-3">
        <div className="mt-[2px] text-[#D6B36A]">
          <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        </div>
        <p className="text-zinc-500 text-sm">Deadline</p>
      </div>
      <div className="text-right">
        {orderDetail.broadcast?.deadlineDate ? (
          <>
            <p className="text-[#F5F1E8] font-medium">
              {new Date(orderDetail.broadcast.deadlineDate).toLocaleDateString()}
            </p>
            <p className="text-[#D6B36A] text-sm font-semibold mt-1">
              {getDeadlineInfo(orderDetail.broadcast.deadlineDate).text}
            </p>
          </>
        ) : (
          <span className="text-zinc-600">—</span>
        )}
      </div>
    </div>

  </div>

</div>

    {/* SRT AVAILABLE LINK — broadcast */}
    {orderDetail.broadcast?.srtAvailableLink && (
      <div className="mt-10">

        <SectionTitle title="SRT Available Link" />

        <div className="bg-[radial-gradient(circle_at_top,rgba(214,179,106,0.08),transparent_60%)] bg-[#111111] border border-[#242424] rounded-[28px] p-6 shadow-[0_0_40px_rgba(0,0,0,0.45)]">
          <div className="flex items-start gap-3">
            <img src="/google-drive.png" alt="Link" className="w-5 h-5 mt-[2px]" />
            <div className="flex-1 min-w-0">
              <a
                href={formatUrl(orderDetail.broadcast.srtAvailableLink)}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#D6B36A] underline text-sm break-all"
              >
                {orderDetail.broadcast.srtAvailableLink}
              </a>
            </div>
          </div>
        </div>

      </div>
    )}

    {/* SOURCE FILE */}
    <div className="mt-10">

      <SectionTitle title="Source File" />

      <div className="bg-[radial-gradient(circle_at_top,rgba(214,179,106,0.08),transparent_60%)] bg-[#111111] border border-[#242424] rounded-[28px] p-6 shadow-[0_0_40px_rgba(0,0,0,0.45)] space-y-5">

  <div className="flex items-start justify-between gap-4">
    <div className="flex items-start gap-3">
      <img src="/google-drive.png" alt="Drive" className="w-5 h-5 mt-[2px]" />
      <div>
        <p className="text-zinc-500 text-sm">Source File</p>
        {orderDetail.broadcast?.sourceFileLink ? (
          <a href={formatUrl(orderDetail.broadcast.sourceFileLink)} target="_blank" rel="noreferrer" className="text-[#D6B36A] underline text-sm break-all mt-1 block">
            {orderDetail.broadcast.sourceFileLink}
          </a>
        ) : (
          <p className="text-zinc-600 text-sm mt-1">No file added</p>
        )}
      </div>
    </div>
  </div>

</div>

    </div>



    {/* DELIVERIES */}
    <div className="mt-10">

      <SectionTitle title="Delivery Assets" />

      {!orderDetail.broadcast?.deliveries?.length ? (
        <div className="bg-[#111111] border border-[#242424] rounded-[28px] p-5 text-sm text-zinc-600">
          No delivery assets added yet
        </div>
      ) : (
        <div className="space-y-4">
          {orderDetail.broadcast.deliveries.map((delivery: any) => (
            <div key={delivery.id} className="bg-[radial-gradient(circle_at_top,rgba(214,179,106,0.06),transparent_60%)] bg-[#111111] border border-[#242424] rounded-[24px] p-5 shadow-[0_0_30px_rgba(0,0,0,0.35)]">
              <div className="flex items-start gap-3">
                <img src="/google-drive.png" alt="Drive" className="w-5 h-5 mt-[2px]" />
                <div>
                  <p className="text-[#F5F1E8] font-semibold">{delivery.language}</p>
                  {delivery.deliveryLink ? (
                    <a href={formatUrl(delivery.deliveryLink)} target="_blank" rel="noreferrer" className="text-[#D6B36A] underline text-sm break-all mt-1 block">
                      {delivery.deliveryLink}
                    </a>
                  ) : (
                    <p className="text-sm text-zinc-600 mt-1">No delivery link added yet</p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

    </div>

  </>
)}

{/* MARKETING */}
{orderDetail?.marketing && (
  <>

    {/* ASSIGNED USERS */}
    <div className="mt-10">

      <SectionTitle title="Assigned Users" />

      {orderDetail.marketing.assignments?.length > 0 ? (
        <div className="bg-[radial-gradient(circle_at_top,rgba(214,179,106,0.08),transparent_60%)] bg-[#111111] border border-[#242424] rounded-[28px] p-6 shadow-[0_0_40px_rgba(0,0,0,0.45)] space-y-4">
          {orderDetail.marketing.assignments.map((assignment: any) => (
            <div key={assignment.id} className="flex items-center justify-between">
              <div>
                <p className="text-[#F5F1E8] font-medium text-sm">
                  {assignment.user.firstName} {assignment.user.lastName}
                </p>
                {assignment.user.position && (
                  <p className="text-xs text-zinc-500 mt-0.5">
                    {assignment.user.position.replace(/_/g, " ")}
                  </p>
                )}
              </div>
              <p className="text-xs text-zinc-600">
                {new Date(assignment.assignedAt).toLocaleDateString()}
              </p>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-[#111111] border border-[#242424] rounded-[28px] p-5 text-sm text-zinc-600">
          No users assigned yet
        </div>
      )}

    </div>

    {/* BASIC INFORMATION */}
    <div className="mt-10">

      <SectionTitle title="Basic Information" />

      <div className="bg-[radial-gradient(circle_at_top,rgba(214,179,106,0.08),transparent_60%)] bg-[#111111] border border-[#242424] rounded-[28px] p-6 shadow-[0_0_40px_rgba(0,0,0,0.45)] space-y-5">

        <div className="flex justify-between items-center">
          <p className="text-zinc-500 text-sm">Content Title</p>
          <p className="text-[#F5F1E8] font-medium">
            {orderDetail.marketing?.contentTitle
              ? orderDetail.marketing.contentTitle
              : <span className="text-zinc-600">—</span>}
          </p>
        </div>

      </div>

    </div>

    {/* TRANSLATION DETAILS */}
    <div className="mt-10">

      <SectionTitle title="Translation Details" />

      <div className="bg-[radial-gradient(circle_at_top,rgba(214,179,106,0.08),transparent_60%)] bg-[#111111] border border-[#242424] rounded-[28px] p-6 shadow-[0_0_40px_rgba(0,0,0,0.45)] space-y-6">

        <div className="flex flex-col gap-3">
          <p className="text-zinc-500 text-sm">Translated From</p>
          {!orderDetail.marketing?.sourceLanguage?.length ? (
            <span className="text-zinc-600 text-sm">—</span>
          ) : (
            <div className="flex flex-wrap gap-2">
              {orderDetail.marketing.sourceLanguage.map((lang: string) => (
                <div key={lang} className="min-w-[46px] h-[34px] inline-flex items-center justify-center rounded-full border border-[#2D2D2D] bg-[#1B1B1B] px-3 text-xs font-semibold tracking-wide text-white">
                  {getLanguageCode(lang)}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex flex-col gap-3">
          <p className="text-zinc-500 text-sm">To Be Translated To</p>
          {!orderDetail.marketing?.targetLanguages?.length ? (
            <span className="text-zinc-600 text-sm">—</span>
          ) : (
            <div className="flex flex-wrap gap-2">
              {orderDetail.marketing.targetLanguages.map((lang: string) => (
                <div key={lang} className="min-w-[46px] h-[34px] inline-flex items-center justify-center rounded-full border border-[#F5F1E8] bg-[#F5F1E8] px-3 text-xs font-bold tracking-wide text-black">
                  {getLanguageCode(lang)}
                </div>
              ))}
            </div>
          )}
        </div>

      </div>

    </div>

{/* DELIVERY FORMATS */}
{/* <div className="mt-10">

  <SectionTitle title="Delivery Formats" />

  <div className="bg-[radial-gradient(circle_at_top,rgba(214,179,106,0.08),transparent_60%)] bg-[#111111] border border-[#242424] rounded-[28px] p-6 shadow-[0_0_40px_rgba(0,0,0,0.45)] space-y-5">

    {orderDetail.marketing?.deliveryFormats?.map((formatItem: any) => (
      <div key={formatItem.id} className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <img src="/google-drive.png" alt="Drive" className="w-5 h-5 mt-[2px]" />
          <div>
            <p className="text-zinc-500 text-sm">{formatItem.format}</p>
            {formatItem.deliveryLink ? (
              <a href={formatUrl(formatItem.deliveryLink)} target="_blank" rel="noreferrer" className="text-[#D6B36A] underline text-sm break-all mt-1 block">
                {formatItem.deliveryLink}
              </a>
            ) : (
              <p className="text-zinc-600 text-sm mt-1">No link added</p>
            )}
          </div>
        </div>
      </div>
    ))}

  </div>

</div> */}

    {/* DATES — marketing */}
    <div className="mt-10">

      <SectionTitle title="Dates" />

      <div className="bg-[radial-gradient(circle_at_top,rgba(214,179,106,0.08),transparent_60%)] bg-[#111111] border border-[#242424] rounded-[28px] p-6 shadow-[0_0_40px_rgba(0,0,0,0.45)]">
        <div className="flex justify-between items-start">
          <div className="flex items-start gap-3">
            <div className="mt-[2px] text-[#D6B36A]">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <p className="text-zinc-500 text-sm">Deadline</p>
          </div>
          <div className="text-right">
            {orderDetail.marketing?.deadlineDate ? (
              <>
                <p className="text-[#F5F1E8] font-medium">
                  {new Date(orderDetail.marketing.deadlineDate).toLocaleDateString()}
                </p>
                <p className="text-[#D6B36A] text-sm font-semibold mt-1">
                  {getDeadlineInfo(orderDetail.marketing.deadlineDate).text}
                </p>
              </>
            ) : (
              <span className="text-zinc-600">—</span>
            )}
          </div>
        </div>
      </div>

    </div>

    {/* SRT AVAILABLE LINK — marketing */}
    {orderDetail.marketing?.srtAvailableLink && (
      <div className="mt-10">

        <SectionTitle title="SRT Available Link" />

        <div className="bg-[radial-gradient(circle_at_top,rgba(214,179,106,0.08),transparent_60%)] bg-[#111111] border border-[#242424] rounded-[28px] p-6 shadow-[0_0_40px_rgba(0,0,0,0.45)]">
          <div className="flex items-start gap-3">
            <img src="/google-drive.png" alt="Link" className="w-5 h-5 mt-[2px]" />
            <div className="flex-1 min-w-0">
              <a
                href={formatUrl(orderDetail.marketing.srtAvailableLink)}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#D6B36A] underline text-sm break-all"
              >
                {orderDetail.marketing.srtAvailableLink}
              </a>
            </div>
          </div>
        </div>

      </div>
    )}

    {/* SOURCE FILE */}
    <div className="mt-10">

      <SectionTitle title="Source File" />

      <div className="bg-[radial-gradient(circle_at_top,rgba(214,179,106,0.08),transparent_60%)] bg-[#111111] border border-[#242424] rounded-[28px] p-6 shadow-[0_0_40px_rgba(0,0,0,0.45)]">

        <div className="flex items-start gap-4">
          <img src="/google-drive.png" alt="Drive" className="w-5 h-5 mt-[2px]" />
          <div className="flex-1 min-w-0">
            <p className="text-zinc-500 text-sm">Source File</p>
            {orderDetail.marketing?.sourceFileLink ? (
              <a href={formatUrl(orderDetail.marketing.sourceFileLink)} target="_blank" rel="noopener noreferrer" className="mt-2 block text-sm text-[#D6B36A] hover:text-[#E7C989] underline transition-colors break-all">
                {orderDetail.marketing.sourceFileLink}
              </a>
            ) : (
              <p className="text-zinc-600 text-sm mt-1">No file added</p>
            )}
          </div>
        </div>

      </div>

    </div>



    {/* DELIVERY ASSETS */}
    <div className="mt-10">

      <SectionTitle title="Delivery Assets" />

      {!orderDetail.marketing?.deliveries?.length ? (
        <div className="bg-[#111111] border border-[#242424] rounded-[28px] p-5 text-sm text-zinc-600">
          No delivery assets added yet
        </div>
      ) : (
        <div className="space-y-4">
          {orderDetail.marketing.deliveries.map((delivery: any) => (
            <div key={delivery.id} className="bg-[radial-gradient(circle_at_top,rgba(214,179,106,0.06),transparent_60%)] bg-[#111111] border border-[#242424] rounded-[24px] p-5 shadow-[0_0_30px_rgba(0,0,0,0.35)]">
              <div className="flex items-start gap-3">
                <img src="/google-drive.png" alt="Drive" className="w-5 h-5 mt-[2px]" />
                <div>
                  <p className="text-[#F5F1E8] font-semibold">{delivery.language}</p>
                  {delivery.deliveryLink ? (
                    <a href={formatUrl(delivery.deliveryLink)} target="_blank" rel="noreferrer" className="text-[#D6B36A] underline text-sm break-all mt-1 block">
                      {delivery.deliveryLink}
                    </a>
                  ) : (
                    <p className="text-sm text-zinc-600 mt-1">No delivery link added yet</p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

    </div>

  </>
)}

        </> /* end isLoadingDetail else */
        )} {/* end isLoadingDetail ternary */}

      </div>

      {/* BOTTOM ACTIONS */}
<div className="sticky bottom-0 left-0 right-0 bg-[#0A0A0A] border-t border-zinc-800 p-6 mt-10">
{canManageOrders && !isBroadcastReadOnly && (
  <div className="grid grid-cols-2 gap-3">

    <button
      onClick={() => {
        if (!orderDetail) return
        setIsEditing(true)
        setEditingOrderId(orderDetail.id)
        setNewOrder({
          title: orderDetail.title,
          contentTitle: orderDetail.marketing?.contentTitle || "",
          game: orderDetail.broadcast?.gameId || "",
          type: orderDetail.type,
          event: orderDetail.event || "EWC",
          status: orderDetail.status,
          priority: orderDetail.priority,
          sourceLanguage:
            orderDetail.type === "MARKETING"
              ? orderDetail.marketing?.sourceLanguage || []
              : orderDetail.broadcast?.sourceLanguage || [],
          targetLanguages:
            orderDetail.type === "MARKETING"
              ? orderDetail.marketing?.targetLanguages || []
              : orderDetail.broadcast?.targetLanguages || [],
          deliveryFormats:
            orderDetail.type === "MARKETING"
              ? orderDetail.marketing?.deliveryFormats?.map((f: any) => ({ id: f.id, format: f.format, deliveryLink: f.deliveryLink || "" })) || []
              : orderDetail.broadcast?.deliveryFormats?.map((f: any) => ({ id: f.id, format: f.format, deliveryLink: f.deliveryLink || "" })) || [],
          deadline:
            orderDetail.type === "MARKETING"
              ? orderDetail.marketing?.deadlineDate?.split("T")[0] || ""
              : orderDetail.broadcast?.deadlineDate?.split("T")[0] || "",
          deliveryDate: orderDetail.broadcast?.deliveryDate?.split("T")[0] || "",
          sourceFileLink:
            orderDetail.type === "MARKETING"
              ? orderDetail.marketing?.sourceFileLink || ""
              : orderDetail.broadcast?.sourceFileLink || "",
          srtAvailableLink:
            orderDetail.type === "MARKETING"
              ? orderDetail.marketing?.srtAvailableLink || ""
              : orderDetail.broadcast?.srtAvailableLink || "",
          notes: orderDetail.notes || "",
          estimatedMinutes: String(orderDetail.broadcast?.estimatedMinutes || ""),
          deliveries:
            orderDetail.type === "MARKETING"
              ? orderDetail.marketing?.deliveries?.map((d: any) => ({ id: d.id, language: d.language, deliveryLink: d.deliveryLink || "" })) || []
              : orderDetail.broadcast?.deliveries?.map((d: any) => ({ id: d.id, language: d.language, deliveryLink: d.deliveryLink || "" })) || [],
        })
        setShowModal(true)
      }}
      className="bg-[#D6B36A] text-black py-3 rounded-2xl font-semibold hover:bg-[#E4C27C] transition"
    >
      Edit Order
    </button>

    <button
      onClick={() => {
        setDeletingOrderId(selectedOrder.id)
        setShowDeleteModal(true)
      }}
      className="bg-[#1A1212] border border-red-500/20 text-red-400 py-3 rounded-2xl font-semibold hover:bg-red-500/10 transition"
    >
      Delete Order
    </button>

  </div>
)}
</div>

    </div>
  )
}
