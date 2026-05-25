import React from "react"
import StatusBadge from "../shared/StatusBadge"
import { LANGUAGES } from "../../constants/languages"

type Props = {
  selectedOrder: any
  currentUser: any
  orderDetail: any | null
  isLoadingDetail: boolean
  activePage: string
  setSelectedOrder: (order: any) => void
  setIsEditingOrder: (value: boolean) => void
  setIsEditing: (value: boolean) => void
  setEditingOrderId: (id: string) => void
  setNewOrder: (value: any) => void
  setShowModal: (value: boolean) => void
  showDeleteModal: boolean
  setShowDeleteModal: (value: boolean) => void
  setDeletingOrderId: (id: string) => void
  deleteOrder: () => void
  canManageOrders: boolean
  getDeadlineInfo: (deadlineDate: string) => { text: string; color: string }
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex justify-between items-center gap-4">
      <span className="text-zinc-500 text-base shrink-0">{label}</span>
      <span className="text-[#F5F1E8] text-base font-medium text-right">{children}</span>
    </div>
  )
}

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-[#111111] border border-[#242424] rounded-2xl p-4 space-y-3 ${className}`}>
      {children}
    </div>
  )
}

function SectionLabel({ title }: { title: string }) {
  return (
    <p className="text-xs font-semibold tracking-[0.15em] uppercase text-[#D6B36A] mb-2">
      {title}
    </p>
  )
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
  activePage,
}: Props) {

  const [historyOpen, setHistoryOpen] = React.useState(false)

  const isAdmin = currentUser?.role === "ADMIN"

  const isBroadcastReadOnly =
    activePage === "Broadcast" && currentUser?.department === "MARKETING"

  function getLanguageCode(name: string) {
    return LANGUAGES.find((l) => l.name === name)?.code.toUpperCase() || name.slice(0, 2).toUpperCase()
  }

  function formatUrl(url: string) {
    if (!url) return "#"
    if (url.startsWith("http://") || url.startsWith("https://")) return url
    return `https://${url}`
  }

  const broadcast = orderDetail?.broadcast
  const marketing = orderDetail?.marketing

  return (
    <>
      {/* Backdrop — visible on small screens only, closes sidebar on click */}
      <div
        className="fixed inset-0 z-40 bg-black/60 lg:hidden"
        onClick={() => { setSelectedOrder(null); setIsEditingOrder(false) }}
      />

    <div className="
      fixed inset-y-0 right-0 z-50
      w-full sm:w-[480px]
      lg:relative lg:inset-auto lg:z-auto lg:w-[480px] lg:h-full
      border-l border-[#2A2A2A] bg-[#090909] flex-shrink-0 flex flex-col
    ">

      {/* HEADER — flex-shrink-0 keeps it pinned at top; no sticky needed
          because the body (not the whole sidebar) is the scroll container */}
      <div className="flex-shrink-0 z-40 px-6 pt-6 pb-4 border-b border-[#242424] bg-[#090909]">
        <button
          onClick={() => { setSelectedOrder(null); setIsEditingOrder(false) }}
          className="absolute top-5 right-4 text-zinc-500 hover:text-white transition text-lg leading-none"
        >
          ✕
        </button>

        <h1 className="text-[21px] font-bold tracking-tight text-[#F5F1E8] leading-snug pr-8">
          {selectedOrder.title}
        </h1>

        <div className="mt-3 flex items-center gap-2">
          <StatusBadge status={selectedOrder.status} />
          {selectedOrder.priority && (
            <span className={`px-2.5 py-0.5 rounded-md text-[11px] font-semibold border ${
              selectedOrder.priority === "HIGH"
                ? "bg-red-500/10 border-red-500/20 text-red-400"
                : selectedOrder.priority === "MEDIUM"
                ? "bg-yellow-500/10 border-yellow-500/20 text-[#D6B36A]"
                : "bg-green-500/10 border-green-500/20 text-green-400"
            }`}>
              {selectedOrder.priority}
            </span>
          )}
        </div>
      </div>

      {/* BODY — only this section scrolls; min-h-0 lets flexbox shrink it
          below intrinsic height so the footer stays anchored at the bottom */}
      <div className="flex-1 min-h-0 overflow-y-auto px-6 py-5 space-y-4 pb-4">

        {isLoadingDetail ? (
          <div className="space-y-3 animate-pulse">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-14 bg-[#161616] rounded-2xl border border-[#242424]" />
            ))}
          </div>
        ) : (
          <>

            {/* OVERVIEW — all key-value info in one card */}
            <Card>
              <Row label="Created By">
                {orderDetail?.createdBy
                  ? `${orderDetail.createdBy.firstName} ${orderDetail.createdBy.lastName}`
                  : <span className="text-zinc-600">—</span>}
              </Row>

              <Row label="Type">{selectedOrder.type}</Row>

              <Row label="Date Added">
                {new Date(selectedOrder.dateAdded).toLocaleDateString()}
              </Row>

              {broadcast && (
                <>
                  {broadcast.game?.name && (
                    <Row label="Game">{broadcast.game.name}</Row>
                  )}
                  {broadcast.estimatedMinutes ? (
                    <Row label="Est. Length">{broadcast.estimatedMinutes} min</Row>
                  ) : null}
                  {broadcast.deliveryDate && (
                    <Row label="Source Added On">
                      {new Date(broadcast.deliveryDate).toLocaleDateString()}
                    </Row>
                  )}
                  {broadcast.deadlineDate ? (
                    <Row label="Deadline">
                      <span>
                        {new Date(broadcast.deadlineDate).toLocaleDateString()}
                        <span className="text-[#D6B36A] ml-1.5">
                          {getDeadlineInfo(broadcast.deadlineDate).text}
                        </span>
                      </span>
                    </Row>
                  ) : null}
                </>
              )}

              {marketing && (
                <>
                  {marketing.contentTitle && (
                    <Row label="Content Title">{marketing.contentTitle}</Row>
                  )}
                  {marketing.deadlineDate ? (
                    <Row label="Deadline">
                      <span>
                        {new Date(marketing.deadlineDate).toLocaleDateString()}
                        <span className="text-[#D6B36A] ml-1.5">
                          {getDeadlineInfo(marketing.deadlineDate).text}
                        </span>
                      </span>
                    </Row>
                  ) : null}
                </>
              )}

              {isAdmin && (
                <Row label="Last Edited By">
                  {orderDetail?.lastEditedBy ? (
                    <span>
                      {orderDetail.lastEditedBy.firstName} {orderDetail.lastEditedBy.lastName}
                      {orderDetail.lastEditedAt && (
                        <span className="text-zinc-500 ml-1.5 text-xs">
                          {new Date(orderDetail.lastEditedAt).toLocaleString()}
                        </span>
                      )}
                    </span>
                  ) : <span className="text-zinc-600">—</span>}
                </Row>
              )}
            </Card>

            {/* NOTES — only if present */}
            {orderDetail?.notes && (
              <div>
                <SectionLabel title="Notes" />
                <Card>
                  <p className="text-base text-[#F5F1E8] leading-relaxed whitespace-pre-wrap break-words overflow-hidden">
                    {orderDetail.notes}
                  </p>
                </Card>
              </div>
            )}

            {/* LANGUAGES */}
            {(() => {
              const src = broadcast?.sourceLanguage || marketing?.sourceLanguage || []
              const tgt = broadcast?.targetLanguages || marketing?.targetLanguages || []
              if (!src.length && !tgt.length) return null
              return (
                <div>
                  <SectionLabel title="Languages" />
                  <Card className="py-3 space-y-2">
                    {src.length > 0 && (
                      <div className="flex items-center gap-2">
                        <span className="text-zinc-600 text-sm w-8 shrink-0">From</span>
                        <div className="flex flex-wrap gap-1">
                          {src.map((lang: string) => (
                            <div key={lang} className="group relative">
                              <div className="h-[26px] inline-flex items-center justify-center rounded-full border border-[#2D2D2D] bg-[#1B1B1B] px-2.5 text-xs font-semibold tracking-wide text-white hover:border-[#D6B36A] hover:text-[#D6B36A] transition cursor-default">
                                {getLanguageCode(lang)}
                              </div>
                              <div className="pointer-events-none absolute left-1/2 top-0 z-50 -translate-x-1/2 -translate-y-[115%] opacity-0 group-hover:opacity-100 transition-opacity">
                                <div className="whitespace-nowrap rounded-lg border border-[#2D2D2D] bg-[#121212] px-2.5 py-1 text-[10px] text-[#F5F1E8]">
                                  {lang}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    {tgt.length > 0 && (
                      <div className="flex items-center gap-2">
                        <span className="text-zinc-600 text-sm w-8 shrink-0">To</span>
                        <div className="flex flex-wrap gap-1">
                          {tgt.map((lang: string) => (
                            <div key={lang} className="group relative">
                              <div className="h-[26px] inline-flex items-center justify-center rounded-full border border-[#F5F1E8] bg-[#F5F1E8] px-2.5 text-xs font-bold tracking-wide text-black hover:bg-[#D6B36A] hover:border-[#D6B36A] transition cursor-default">
                                {getLanguageCode(lang)}
                              </div>
                              <div className="pointer-events-none absolute left-1/2 top-0 z-50 -translate-x-1/2 -translate-y-[115%] opacity-0 group-hover:opacity-100 transition-opacity">
                                <div className="whitespace-nowrap rounded-lg border border-[#2D2D2D] bg-[#121212] px-2.5 py-1 text-[10px] text-[#F5F1E8]">
                                  {lang}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </Card>
                </div>
              )
            })()}

            {/* ASSIGNED USERS — marketing only */}
            {marketing && marketing.assignments?.length > 0 && (
              <div>
                <SectionLabel title="Assigned Users" />
                <Card className="space-y-2.5">
                  {marketing.assignments.map((a: any) => (
                    <div key={a.id} className="flex items-center justify-between">
                      <div>
                        <p className="text-[#F5F1E8] text-base font-medium">
                          {a.user.firstName} {a.user.lastName}
                        </p>
                        {a.user.position && (
                          <p className="text-sm text-zinc-500 mt-0.5">
                            {a.user.position.replace(/_/g, " ")}
                          </p>
                        )}
                      </div>
                      <p className="text-sm text-zinc-600">
                        {new Date(a.assignedAt).toLocaleDateString()}
                      </p>
                    </div>
                  ))}
                </Card>
              </div>
            )}

            {/* FILES — source file + SRT combined */}
            {(() => {
              const sourceLink = broadcast?.sourceFileLink || marketing?.sourceFileLink
              const srtLink = broadcast?.srtAvailableLink || marketing?.srtAvailableLink
              if (!sourceLink && !srtLink) return null
              return (
                <div>
                  <SectionLabel title="Files" />
                  <Card className="space-y-3">
                    {sourceLink && (
                      <div className="flex items-start gap-2.5">
                        <img src="/google-drive.png" alt="Drive" className="w-4 h-4 mt-px shrink-0" />
                        <div className="min-w-0">
                          <p className="text-zinc-500 text-sm mb-0.5">Source File</p>
                          <a href={formatUrl(sourceLink)} target="_blank" rel="noopener noreferrer"
                            className="text-[#D6B36A] underline text-base break-all hover:text-[#E7C989] transition">
                            {sourceLink}
                          </a>
                        </div>
                      </div>
                    )}
                    {srtLink && (
                      <div className="flex items-start gap-2.5">
                        <img src="/google-drive.png" alt="Drive" className="w-4 h-4 mt-px shrink-0" />
                        <div className="min-w-0">
                          <p className="text-zinc-500 text-sm mb-0.5">SRT Available</p>
                          <a href={formatUrl(srtLink)} target="_blank" rel="noopener noreferrer"
                            className="text-[#D6B36A] underline text-base break-all hover:text-[#E7C989] transition">
                            {srtLink}
                          </a>
                        </div>
                      </div>
                    )}
                  </Card>
                </div>
              )
            })()}

            {/* DELIVERY ASSETS */}
            {(() => {
              const deliveries = broadcast?.deliveries || marketing?.deliveries || []
              if (!deliveries.length) return null
              return (
                <div>
                  <SectionLabel title="Delivery Assets" />
                  <div className="space-y-2">
                    {deliveries.map((d: any) => (
                      <div key={d.id} className="flex items-start gap-2.5 bg-[#111111] border border-[#242424] rounded-xl px-3 py-2.5">
                        <img src="/google-drive.png" alt="Drive" className="w-4 h-4 mt-px shrink-0" />
                        <div className="min-w-0">
                          <p className="text-[#F5F1E8] text-base font-semibold">{d.language}</p>
                          {d.deliveryLink ? (
                            <a href={formatUrl(d.deliveryLink)} target="_blank" rel="noreferrer"
                              className="text-[#D6B36A] underline text-base break-all mt-0.5 block">
                              {d.deliveryLink}
                            </a>
                          ) : (
                            <p className="text-sm text-zinc-600 mt-0.5">No link yet</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })()}

            {/* EDIT HISTORY — collapsed by default */}
            {isAdmin && orderDetail?.editHistory?.length > 0 && (
              <div>
                <button
                  onClick={() => setHistoryOpen((o) => !o)}
                  className="w-full flex items-center justify-between group py-1"
                >
                  <span className="text-xs font-semibold tracking-[0.15em] uppercase text-[#D6B36A] group-hover:text-[#E7C989] transition">
                    Edit History
                    <span className="ml-1.5 text-[#D6B36A]/50">({orderDetail.editHistory.length})</span>
                  </span>
                  <svg
                    className={`w-3.5 h-3.5 text-zinc-600 group-hover:text-zinc-400 transition-transform duration-200 ${historyOpen ? "rotate-180" : ""}`}
                    fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {historyOpen && (
                  <Card className="mt-2 space-y-2.5">
                    {orderDetail.editHistory.map((edit: any) => (
                      <div key={edit.id} className="flex items-center justify-between border-b border-[#1F1F1F] pb-2.5 last:border-0 last:pb-0">
                        <p className="text-[#F5F1E8] text-base font-medium">
                          {edit.editedBy?.firstName} {edit.editedBy?.lastName}
                        </p>
                        <p className="text-sm text-zinc-500">
                          {new Date(edit.editedAt).toLocaleString()}
                        </p>
                      </div>
                    ))}
                  </Card>
                )}
              </div>
            )}

          </>
        )}
      </div>

      {/* BOTTOM ACTIONS — flex-shrink-0 keeps it anchored at the very bottom
          regardless of how much content is in the body above */}
      {canManageOrders && !isBroadcastReadOnly && (
        <div className="flex-shrink-0 bg-[#0A0A0A] border-t border-[#1F1F1F] px-6 py-4">
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
              className="bg-[#D6B36A] text-black py-2.5 rounded-xl font-semibold text-sm hover:bg-[#E4C27C] transition"
            >
              Edit Order
            </button>

            <button
              onClick={() => {
                setDeletingOrderId(selectedOrder.id)
                setShowDeleteModal(true)
              }}
              className="bg-[#1A1212] border border-red-500/20 text-red-400 py-2.5 rounded-xl font-semibold text-sm hover:bg-red-500/10 transition"
            >
              Delete Order
            </button>
          </div>
        </div>
      )}

    </div>
    </>
  )
}
