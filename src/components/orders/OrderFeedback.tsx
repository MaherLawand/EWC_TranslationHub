import React from "react"
import ReactDOM from "react-dom"

export type Feedback = {
  id: string
  message: string
  createdAt: string
  updatedAt: string
  authorId: string
  author?: { id: string; firstName: string; lastName: string; position?: string }
}

function authorName(f: Feedback) {
  return `${f.author?.firstName ?? ""} ${f.author?.lastName ?? ""}`.trim() || "Unknown"
}
function fmt(d: string) {
  try { return new Date(d).toLocaleString() } catch { return "" }
}

const feedbackIcon = (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
  </svg>
)

// Small count badge shown at the top-right of the feedback button.
function CountBadge({ count }: { count: number }) {
  if (!count) return null
  return (
    <span className="absolute -top-1 -right-1 min-w-[16px] h-[16px] px-1 rounded-full bg-[#D6B36A] text-black text-[10px] font-bold leading-none flex items-center justify-center shadow-[0_0_8px_rgba(214,179,106,0.4)] pointer-events-none">
      {count > 99 ? "99+" : count}
    </span>
  )
}

/* ──────────────────────────────────────────────────────────────────────────
   Row button.
   • Translators  → clickable; opens the persistent panel (onOpen).
   • Everyone else → not clickable; hover shows a read-only bubble of feedback.
   ────────────────────────────────────────────────────────────────────────── */
export function FeedbackButton({
  order,
  currentUser,
  onOpen,
  fetchOrderFeedback,
  feedbackRefresh,
}: {
  order: any
  currentUser: any
  onOpen: (order: any) => void
  fetchOrderFeedback: (orderId: string) => Promise<Feedback[]>
  feedbackRefresh?: number
}) {
  const isTranslator = currentUser?.position === "TRANSLATOR"
  // List rows arrive raw from the server (carry _count.feedback); mapped rows
  // carry feedbackCount. Support both.
  const count = order?.feedbackCount ?? order?._count?.feedback ?? 0

  // Manager hover bubble state
  const [hovered, setHovered] = React.useState(false)
  const [items, setItems] = React.useState<Feedback[] | null>(null)
  const [loading, setLoading] = React.useState(false)
  const btnRef = React.useRef<HTMLButtonElement>(null)
  const [pos, setPos] = React.useState<{ top: number; right: number } | null>(null)
  const hideTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null)

  async function load() {
    setLoading(true)
    const data = await fetchOrderFeedback(order.id)
    setItems(Array.isArray(data) ? data : [])
    setLoading(false)
  }

  function openBubble(e: React.MouseEvent) {
    if (hideTimer.current) clearTimeout(hideTimer.current)
    const r = (e.currentTarget as HTMLElement).getBoundingClientRect()
    // Anchor the bubble above-LEFT of the button so it never clips the screen edge.
    setPos({ top: r.top, right: window.innerWidth - r.left })
    setHovered(true)
    load()
  }
  function closeBubble() {
    hideTimer.current = setTimeout(() => setHovered(false), 120)
  }

  // If feedback changes elsewhere while the bubble is open, refresh it.
  React.useEffect(() => {
    if (hovered) load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [feedbackRefresh])

  if (isTranslator) {
    return (
      <button
        onClick={(e) => { e.stopPropagation(); onOpen(order) }}
        title="Feedback"
        className="relative flex-shrink-0 p-1.5 rounded-lg transition-all hover:bg-[#1A1A1A] hover:scale-110"
      >
        {/* Gradient icon → signals it's interactive for translators */}
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="url(#fbGrad)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <defs>
            <linearGradient id="fbGrad" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#F0C75E" />
              <stop offset="35%" stopColor="#E89B3A" />
              <stop offset="65%" stopColor="#D9692A" />
              <stop offset="100%" stopColor="#BE3F1E" />
            </linearGradient>
          </defs>
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
        <CountBadge count={count} />
      </button>
    )
  }

  // Manager / admin: view-only on hover.
  return (
    <>
      <button
        ref={btnRef}
        onClick={(e) => e.stopPropagation()}
        onMouseEnter={openBubble}
        onMouseLeave={closeBubble}
        title="View feedback"
        className="relative flex-shrink-0 p-1 rounded-md transition-all text-zinc-500 hover:text-[#D6B36A] hover:bg-[#1A1A1A] cursor-default"
      >
        {feedbackIcon}
        <CountBadge count={count} />
      </button>

      {hovered && pos && ReactDOM.createPortal(
        // Outer wrapper owns the positioning transform (translateY(-100%));
        // inner bubble owns the pop animation so the two transforms don't clash.
        <div
          onMouseEnter={() => { if (hideTimer.current) clearTimeout(hideTimer.current) }}
          onMouseLeave={closeBubble}
          style={{ position: "fixed", top: pos.top, right: pos.right + 8, zIndex: 9999, transform: "translateY(-100%)" }}
        >
          <div className="animate-bubble-pop w-[320px] max-h-[360px] overflow-auto dark-scroll rounded-2xl border border-[#242424] bg-[#0E0E0E] shadow-[0_20px_60px_rgba(0,0,0,0.6)] p-3">
            <p className="text-xs font-semibold tracking-[0.15em] uppercase text-gear-gradient w-fit mb-2">Feedback</p>
            {loading ? (
              <p className="text-sm text-zinc-500 py-2">Loading…</p>
            ) : !items || items.length === 0 ? (
              <p className="text-sm text-zinc-600 py-2">No feedback yet.</p>
            ) : (
              <div className="space-y-2">
                {items.map((f, i) => (
                  <div
                    key={f.id}
                    className="animate-fb-item bg-[#141414] border border-[#222] rounded-xl px-3 py-2"
                    style={{ animationDelay: `${120 + i * 80}ms` }}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[#F5F1E8] text-xs font-semibold">{authorName(f)}</span>
                      <span className="text-[10px] text-zinc-600">{fmt(f.createdAt)}</span>
                    </div>
                    <p className="text-sm text-zinc-300 mt-1 whitespace-pre-wrap break-words">{f.message}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>,
        document.body
      )}
    </>
  )
}

/* ──────────────────────────────────────────────────────────────────────────
   Persistent panel (rendered at the page level, NOT inside a table row) so a
   list refresh never unmounts it or clears the translator's draft.
   ────────────────────────────────────────────────────────────────────────── */
export function FeedbackPanel({
  order,
  currentUser,
  onClose,
  fetchOrderFeedback,
  createOrderFeedback,
  updateOrderFeedback,
  deleteOrderFeedback,
  feedbackRefresh,
}: {
  order: { id: string; title: string } | null
  currentUser: any
  onClose: () => void
  fetchOrderFeedback: (orderId: string) => Promise<Feedback[]>
  createOrderFeedback: (orderId: string, message: string) => Promise<Feedback>
  updateOrderFeedback: (feedbackId: string, message: string) => Promise<Feedback>
  deleteOrderFeedback: (feedbackId: string) => Promise<any>
  feedbackRefresh?: number
}) {
  const [items, setItems] = React.useState<Feedback[]>([])
  const [loading, setLoading] = React.useState(false)
  const [draft, setDraft] = React.useState("")
  const [submitting, setSubmitting] = React.useState(false)
  const [editingId, setEditingId] = React.useState<string | null>(null)
  const [editDraft, setEditDraft] = React.useState("")
  const [savingEdit, setSavingEdit] = React.useState(false)
  const [deletingId, setDeletingId] = React.useState<string | null>(null)

  const orderId = order?.id

  async function load() {
    if (!orderId) return
    setLoading(true)
    const data = await fetchOrderFeedback(orderId)
    setItems(Array.isArray(data) ? data : [])
    setLoading(false)
  }

  // Load when the panel opens for a (new) order. Reset draft only on order change.
  React.useEffect(() => {
    if (!orderId) return
    setDraft("")
    setEditingId(null)
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderId])

  // Live refresh from socket — re-fetch the thread but DON'T touch the draft.
  React.useEffect(() => {
    if (orderId) load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [feedbackRefresh])

  if (!order) return null

  async function submit() {
    const msg = draft.trim()
    if (!msg || submitting || !orderId) return
    setSubmitting(true)
    try {
      const created = await createOrderFeedback(orderId, msg)
      setItems((prev) => [...prev, created])
      setDraft("")
    } catch { /* toast handled in hook */ }
    finally { setSubmitting(false) }
  }

  async function saveEdit(id: string) {
    const msg = editDraft.trim()
    if (!msg || savingEdit) return
    setSavingEdit(true)
    try {
      const updated = await updateOrderFeedback(id, msg)
      setItems((prev) => prev.map((f) => (f.id === id ? updated : f)))
      setEditingId(null)
    } catch { /* toast handled */ }
    finally { setSavingEdit(false) }
  }

  async function remove(id: string) {
    if (deletingId) return
    setDeletingId(id)
    try {
      await deleteOrderFeedback(id)
      setItems((prev) => prev.filter((f) => f.id !== id))
    } catch { /* toast handled */ }
    finally { setDeletingId(null) }
  }

  return ReactDOM.createPortal(
    <div
      className="fixed inset-0 z-[120] bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-overlay-fade"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="animate-feedback-pop bg-[#0C0C0C]/95 border border-white/10 backdrop-blur-2xl rounded-t-3xl sm:rounded-3xl w-full sm:max-w-[560px] shadow-[0_20px_80px_rgba(0,0,0,0.6)] flex flex-col max-h-[90vh]"
      >
        {/* HEADER */}
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-white/10 flex-shrink-0">
          <div className="min-w-0">
            <p className="text-xs font-semibold tracking-[0.18em] uppercase text-[#D6B36A]/70 mb-1">Feedback</p>
            <h2 className="text-lg font-bold text-gear-gradient w-fit truncate max-w-[420px]">{order.title}</h2>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-white/10 border border-white/10 text-zinc-300 hover:text-white hover:bg-white/20 transition text-sm"
          >
            ✕
          </button>
        </div>

        {/* THREAD */}
        <div className="flex-1 overflow-auto dark-scroll px-6 py-4 space-y-3">
          {loading && items.length === 0 ? (
            <p className="text-sm text-zinc-500">Loading…</p>
          ) : items.length === 0 ? (
            <p className="text-sm text-zinc-600">No feedback yet. Be the first to add one.</p>
          ) : (
            items.map((f) => {
              const mine = f.authorId === currentUser?.id
              const isEditing = editingId === f.id
              return (
                <div key={f.id} className="bg-[#111111] border border-[#242424] rounded-2xl px-4 py-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[#F5F1E8] text-sm font-semibold">{authorName(f)}</span>
                    <span className="text-[11px] text-zinc-600">
                      {fmt(f.createdAt)}{f.updatedAt !== f.createdAt ? " (edited)" : ""}
                    </span>
                  </div>

                  {isEditing ? (
                    <div className="mt-2">
                      <textarea
                        value={editDraft}
                        onChange={(e) => setEditDraft(e.target.value)}
                        rows={3}
                        className="w-full bg-[#1A1A1A] border border-white/15 rounded-xl px-3 py-2 text-sm text-[#F5F1E8] outline-none focus:border-[#D6B36A] resize-none"
                      />
                      <div className="flex gap-2 mt-2">
                        <button
                          onClick={() => saveEdit(f.id)}
                          disabled={savingEdit || !editDraft.trim()}
                          className="px-3 py-1.5 rounded-lg text-xs font-semibold gear-fill text-black disabled:opacity-50 disabled:cursor-wait"
                        >
                          {savingEdit ? "Saving…" : "Save"}
                        </button>
                        <button
                          onClick={() => setEditingId(null)}
                          disabled={savingEdit}
                          className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-white/5 border border-white/15 text-zinc-300 hover:text-white disabled:opacity-50"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <p className="text-sm text-zinc-300 mt-1.5 whitespace-pre-wrap break-words">{f.message}</p>
                      {mine && (
                        <div className="flex gap-2 mt-2.5">
                          <button
                            onClick={() => { setEditingId(f.id); setEditDraft(f.message) }}
                            disabled={deletingId === f.id}
                            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold border border-[#D6B36A]/40 bg-[#D6B36A]/10 text-[#E8C77E] hover:bg-[#D6B36A]/20 hover:border-[#D6B36A]/70 transition disabled:opacity-40"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M12 20h9" />
                              <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => remove(f.id)}
                            disabled={deletingId === f.id}
                            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold border border-red-500/40 bg-red-500/10 text-red-300 hover:bg-red-500/20 hover:border-red-500/70 transition disabled:opacity-50 disabled:cursor-wait"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="3 6 5 6 21 6" />
                              <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                              <path d="M10 11v6M14 11v6" />
                              <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
                            </svg>
                          </button>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )
            })
          )}
        </div>

        {/* COMPOSER */}
        <div className="border-t border-white/10 bg-white/[0.02] p-4 flex-shrink-0">
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Write feedback…"
            rows={3}
            className="w-full bg-[#1A1A1A] border border-white/15 rounded-xl px-3 py-2.5 text-sm text-[#F5F1E8] outline-none focus:border-[#D6B36A] resize-none placeholder:text-zinc-600"
          />
          <div className="flex justify-end mt-2">
            <button
              onClick={submit}
              disabled={!draft.trim() || submitting}
              className="px-5 py-2.5 rounded-xl font-semibold text-sm gear-fill text-black disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {submitting ? "Adding…" : "Add feedback"}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  )
}
