import React from "react"
import ReactDOM from "react-dom"

export type Feedback = {
  id: string
  message: string
  createdAt: string
  updatedAt: string
  authorId: string
  author?: { id: string; firstName: string; lastName: string; position?: string }
  readByMe?: boolean
}

function authorName(f: Feedback) {
  return `${f.author?.firstName ?? ""} ${f.author?.lastName ?? ""}`.trim() || "Unknown"
}
function fmt(d: string) {
  try { return new Date(d).toLocaleString() } catch { return "" }
}

// How long a message must stay in view before it counts as "read".
const SEEN_DELAY_MS = 1500

// Translators AND the order's managers (Producers / PPMs / Admin) can open the
// panel and post. Everyone else gets the read-only hover preview.
function canPostFeedback(user: any): boolean {
  return (
    user?.role === "ADMIN" ||
    user?.position === "TRANSLATOR" ||
    user?.position === "PRODUCER" ||
    user?.position === "POST_PRODUCTION_MANAGER" ||
    user?.position === "EDITOR"
  )
}

const feedbackIcon = (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
  </svg>
)

// Unread badge — counts messages the viewer didn't author and hasn't read.
function CountBadge({ count }: { count: number }) {
  if (!count) return null
  return (
    <span className="absolute -top-1 -right-1 min-w-[16px] h-[16px] px-1 rounded-full bg-[#D6B36A] text-black text-[10px] font-bold leading-none flex items-center justify-center shadow-[0_0_8px_rgba(214,179,106,0.4)] pointer-events-none">
      {count > 99 ? "99+" : count}
    </span>
  )
}

/* Wraps a feedback message and, when it's unread, fires `onSeen(id)` once it has
   stayed in view (inside the scroll container `rootRef`) for 4 continuous
   seconds — so reading a message marks it read. */
function FeedbackEntry({
  id,
  unread,
  onSeen,
  rootRef,
  className,
  style,
  children,
}: {
  id: string
  unread: boolean
  onSeen: (id: string) => void
  rootRef: React.RefObject<HTMLElement | null>
  className?: string
  style?: React.CSSProperties
  children: React.ReactNode
}) {
  const ref = React.useRef<HTMLDivElement>(null)
  const firedRef = React.useRef(false)

  React.useEffect(() => {
    if (!unread || firedRef.current) return
    const el = ref.current
    if (!el) return
    let timer: ReturnType<typeof setTimeout> | null = null
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && entry.intersectionRatio >= 0.6) {
          if (!timer && !firedRef.current) {
            timer = setTimeout(() => {
              firedRef.current = true
              onSeen(id)
            }, SEEN_DELAY_MS)
          }
        } else if (timer) {
          clearTimeout(timer)
          timer = null
        }
      },
      { root: rootRef.current ?? null, threshold: [0, 0.6, 1] }
    )
    obs.observe(el)
    return () => {
      if (timer) clearTimeout(timer)
      obs.disconnect()
    }
  }, [id, unread, onSeen, rootRef])

  return (
    <div ref={ref} className={className} style={style}>
      {children}
    </div>
  )
}

/* ──────────────────────────────────────────────────────────────────────────
   Row button.
   • Everyone → hover shows a preview bubble of the thread.
   • Translators + Producers/PPMs/Admin → clicking opens the full panel to reply.
   • Badge = unread messages (not authored by the viewer).
   ────────────────────────────────────────────────────────────────────────── */
export function FeedbackButton({
  order,
  currentUser,
  onOpen,
  fetchOrderFeedback,
  feedbackRefresh,
  markFeedbackRead,
  onRead,
}: {
  order: any
  currentUser: any
  onOpen: (order: any) => void
  fetchOrderFeedback: (orderId: string) => Promise<Feedback[]>
  feedbackRefresh?: number
  markFeedbackRead?: (ids: string[]) => Promise<void> | void
  onRead?: () => void
}) {
  const canPost = canPostFeedback(currentUser)
  // Unread badge — server provides unreadFeedbackCount per row.
  const unread = order?.unreadFeedbackCount ?? 0
  // Whether the order has ANY feedback (total) — used to fill the icon so you
  // can tell from the outside without hovering, even when nothing is unread.
  const totalFeedback = order?.feedbackCount ?? order?._count?.feedback ?? 0
  const hasFeedback = totalFeedback > 0

  const [hovered, setHovered] = React.useState(false)
  const [items, setItems] = React.useState<Feedback[] | null>(null)
  const [loading, setLoading] = React.useState(false)
  const btnRef = React.useRef<HTMLButtonElement>(null)
  const wrapRef = React.useRef<HTMLDivElement>(null)
  const scrollRef = React.useRef<HTMLDivElement>(null)
  const [pos, setPos] = React.useState<{ top: number; left: number; maxH: number } | null>(null)
  const hideTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null)

  async function load() {
    setLoading(true)
    const data = await fetchOrderFeedback(order.id)
    setItems(Array.isArray(data) ? data : [])
    setLoading(false)
  }

  // Batch messages seen in quick succession, then commit the read receipts
  // and ONLY refresh the unread counts after the write resolves (so the badge
  // doesn't refetch stale unread state mid-write and get stuck).
  const pendingSeen = React.useRef<Set<string>>(new Set())
  const flushTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null)
  const handleSeen = React.useCallback(
    (id: string) => {
      setItems((prev) => (prev ? prev.map((f) => (f.id === id ? { ...f, readByMe: true } : f)) : prev))
      pendingSeen.current.add(id)
      if (flushTimer.current) clearTimeout(flushTimer.current)
      flushTimer.current = setTimeout(async () => {
        const ids = [...pendingSeen.current]
        pendingSeen.current.clear()
        if (ids.length && markFeedbackRead) await markFeedbackRead(ids)
        onRead?.()
      }, 400)
    },
    [markFeedbackRead, onRead]
  )

  function openBubble(e: React.MouseEvent) {
    e.stopPropagation()
    if (hideTimer.current) clearTimeout(hideTimer.current)
    const r = (e.currentTarget as HTMLElement).getBoundingClientRect()
    const BUB_W = 320
    const PAD = 8
    let left = r.right - BUB_W
    if (left + BUB_W > window.innerWidth - PAD) left = window.innerWidth - BUB_W - PAD
    if (left < PAD) left = PAD
    setPos({ top: r.bottom + 6, left, maxH: Math.min(360, window.innerHeight - 2 * PAD) })
    setHovered(true)
    load()
  }
  function closeBubble() {
    hideTimer.current = setTimeout(() => setHovered(false), 120)
  }

  React.useLayoutEffect(() => {
    if (!hovered || !pos) return
    const el = wrapRef.current
    if (!el) return
    const PAD = 8
    const h = el.offsetHeight
    let top = pos.top
    if (top + h > window.innerHeight - PAD) top = window.innerHeight - h - PAD
    if (top < PAD) top = PAD
    el.style.top = `${top}px`
  }, [hovered, pos, items, loading])

  React.useEffect(() => {
    if (hovered) load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [feedbackRefresh])

  React.useEffect(() => {
    if (!hovered) return
    const close = () => setHovered(false)
    const id = window.setTimeout(() => {
      document.addEventListener("click", close)
      document.addEventListener("touchstart", close)
    }, 0)
    return () => {
      window.clearTimeout(id)
      document.removeEventListener("click", close)
      document.removeEventListener("touchstart", close)
    }
  }, [hovered])

  return (
    <>
      <button
        ref={btnRef}
        onMouseEnter={openBubble}
        onMouseLeave={closeBubble}
        onClick={(e) => {
          e.stopPropagation()
          if (canPost) onOpen(order)
          else openBubble(e)
        }}
        title={hasFeedback ? `Feedback (${totalFeedback})` : canPost ? "Add feedback" : "No feedback"}
        className={`relative flex-shrink-0 rounded-lg transition-all p-1.5 hover:scale-110 ${
          hasFeedback
            ? "text-[#D6B36A] hover:bg-[#1A1A1A]"
            : "text-zinc-600 hover:text-[#D6B36A] hover:bg-[#1A1A1A]"
        }`}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="18"
          height="18"
          viewBox="0 0 24 24"
          stroke={canPost ? "url(#fbGrad)" : hasFeedback ? "#D6B36A" : "currentColor"}
          fill={hasFeedback ? (canPost ? "url(#fbGrad)" : "#D6B36A") : "none"}
          fillOpacity={hasFeedback ? 0.95 : 0}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          {canPost && (
            <defs>
              <linearGradient id="fbGrad" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#F0C75E" />
                <stop offset="35%" stopColor="#E89B3A" />
                <stop offset="65%" stopColor="#D9692A" />
                <stop offset="100%" stopColor="#BE3F1E" />
              </linearGradient>
            </defs>
          )}
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
        <CountBadge count={unread} />
      </button>

      {hovered && pos && ReactDOM.createPortal(
        <div
          ref={wrapRef}
          onClick={(e) => e.stopPropagation()}
          onTouchStart={(e) => e.stopPropagation()}
          onMouseEnter={() => { if (hideTimer.current) clearTimeout(hideTimer.current) }}
          onMouseLeave={closeBubble}
          style={{ position: "fixed", top: pos.top, left: pos.left, zIndex: 9999 }}
        >
          <div
            ref={scrollRef}
            style={{ maxHeight: pos.maxH }}
            className="animate-bubble-pop w-[320px] overflow-auto dark-scroll rounded-2xl border border-[#242424] bg-[#0E0E0E] shadow-[0_20px_60px_rgba(0,0,0,0.6)] p-3"
          >
            <p className="text-xs font-semibold tracking-[0.15em] uppercase text-gear-gradient w-fit mb-2">Feedback</p>
            {loading ? (
              <p className="text-sm text-zinc-500 py-2">Loading…</p>
            ) : !items || items.length === 0 ? (
              <p className="text-sm text-zinc-600 py-2">No feedback yet.</p>
            ) : (
              <div className="space-y-2">
                {items.map((f) => {
                  const mine = f.authorId === currentUser?.id
                  const isUnread = !mine && !f.readByMe
                  return (
                    <FeedbackEntry
                      key={f.id}
                      id={f.id}
                      unread={isUnread}
                      onSeen={handleSeen}
                      rootRef={scrollRef}
                      className={`rounded-xl px-3 py-2 border ${
                        isUnread
                          ? "border-[#D6B36A]/50 bg-[#D6B36A]/[0.08]"
                          : "border-[#222] bg-[#141414]"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[#F5F1E8] text-xs font-semibold flex items-center gap-1.5">
                          {isUnread && <span className="w-1.5 h-1.5 rounded-full bg-[#D6B36A]" />}
                          {authorName(f)}
                        </span>
                        <span className="text-[10px] text-zinc-600">{fmt(f.createdAt)}</span>
                      </div>
                      <p className="text-sm text-zinc-300 mt-1 whitespace-pre-wrap break-words">{f.message}</p>
                    </FeedbackEntry>
                  )
                })}
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
   Persistent panel (page-level) — full thread + composer. Highlights unread
   messages and marks them read after they stay in view for 4 seconds.
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
  markFeedbackRead,
  onRead,
}: {
  order: { id: string; title: string } | null
  currentUser: any
  onClose: () => void
  fetchOrderFeedback: (orderId: string) => Promise<Feedback[]>
  createOrderFeedback: (orderId: string, message: string) => Promise<Feedback>
  updateOrderFeedback: (feedbackId: string, message: string) => Promise<Feedback>
  deleteOrderFeedback: (feedbackId: string) => Promise<any>
  feedbackRefresh?: number
  markFeedbackRead?: (ids: string[]) => Promise<void> | void
  onRead?: () => void
}) {
  const [items, setItems] = React.useState<Feedback[]>([])
  const [loading, setLoading] = React.useState(false)
  const [draft, setDraft] = React.useState("")
  const [submitting, setSubmitting] = React.useState(false)
  const [editingId, setEditingId] = React.useState<string | null>(null)
  const [editDraft, setEditDraft] = React.useState("")
  const [savingEdit, setSavingEdit] = React.useState(false)
  const [deletingId, setDeletingId] = React.useState<string | null>(null)
  const threadRef = React.useRef<HTMLDivElement>(null)

  const orderId = order?.id
  const canPost = canPostFeedback(currentUser)

  async function load() {
    if (!orderId) return
    setLoading(true)
    const data = await fetchOrderFeedback(orderId)
    setItems(Array.isArray(data) ? data : [])
    setLoading(false)
  }

  // Batch seen messages, commit read receipts, then refresh counts only after
  // the write resolves (prevents the unread badge from sticking on stale state).
  const pendingSeen = React.useRef<Set<string>>(new Set())
  const flushTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null)
  const handleSeen = React.useCallback(
    (id: string) => {
      setItems((prev) => prev.map((f) => (f.id === id ? { ...f, readByMe: true } : f)))
      pendingSeen.current.add(id)
      if (flushTimer.current) clearTimeout(flushTimer.current)
      flushTimer.current = setTimeout(async () => {
        const ids = [...pendingSeen.current]
        pendingSeen.current.clear()
        if (ids.length && markFeedbackRead) await markFeedbackRead(ids)
        onRead?.()
      }, 400)
    },
    [markFeedbackRead, onRead]
  )

  React.useEffect(() => {
    if (!orderId) return
    setDraft("")
    setEditingId(null)
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderId])

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
      className="fixed inset-0 z-[120] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 animate-overlay-fade"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="animate-feedback-pop bg-[#0C0C0C]/95 border border-white/10 backdrop-blur-2xl rounded-3xl w-full sm:max-w-[560px] shadow-[0_20px_80px_rgba(0,0,0,0.6)] flex flex-col max-h-[90vh]"
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
        <div ref={threadRef} className="flex-1 overflow-auto dark-scroll px-6 py-4 space-y-3">
          {loading && items.length === 0 ? (
            <p className="text-sm text-zinc-500">Loading…</p>
          ) : items.length === 0 ? (
            <p className="text-sm text-zinc-600">No feedback yet. Be the first to add one.</p>
          ) : (
            items.map((f) => {
              const mine = f.authorId === currentUser?.id
              const isEditing = editingId === f.id
              const isUnread = !mine && !f.readByMe
              return (
                <FeedbackEntry
                  key={f.id}
                  id={f.id}
                  unread={isUnread}
                  onSeen={handleSeen}
                  rootRef={threadRef}
                  className={`rounded-2xl px-4 py-3 border ${
                    isUnread
                      ? "border-[#D6B36A]/50 bg-[#D6B36A]/[0.07]"
                      : "border-[#242424] bg-[#111111]"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[#F5F1E8] text-sm font-semibold flex items-center gap-1.5">
                      {isUnread && <span className="w-1.5 h-1.5 rounded-full bg-[#D6B36A]" />}
                      {authorName(f)}
                    </span>
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
                </FeedbackEntry>
              )
            })
          )}
        </div>

        {/* COMPOSER */}
        {canPost && (
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
        )}
      </div>
    </div>,
    document.body
  )
}
