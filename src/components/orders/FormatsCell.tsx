import React from "react"
import ReactDOM from "react-dom"

// How many format chips to show before collapsing the rest into a "+N" badge.
const MAX_VISIBLE = 2

// A single delivery-format chip.
function Chip({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center shrink-0 whitespace-nowrap border border-[#2B2B2B] bg-[#171717] px-3 py-0.5 rounded-xl text-xs font-semibold tracking-wide text-[#F5F1E8] leading-none">
      {label}
    </span>
  )
}

// Renders up to MAX_VISIBLE chips + a "+N" badge whose hover popover (portaled
// to escape the table overflow) lists every format — same logic/animation as
// the languages "+N" group.
export default function FormatsCell({ formats }: { formats: string[] }) {
  const list = formats ?? []

  const visible = list.slice(0, MAX_VISIBLE)
  const hiddenCount = Math.max(0, list.length - MAX_VISIBLE)

  const [open, setOpen] = React.useState(false)
  const [pos, setPos] = React.useState<{ top: number; right: number } | null>(null)
  const hideTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null)

  function openPop(e: React.MouseEvent) {
    if (hideTimer.current) clearTimeout(hideTimer.current)
    const r = (e.currentTarget as HTMLElement).getBoundingClientRect()
    setPos({ top: r.top, right: window.innerWidth - r.right })
    setOpen(true)
  }
  function closePop() {
    hideTimer.current = setTimeout(() => setOpen(false), 120)
  }
  function keepPop() {
    if (hideTimer.current) clearTimeout(hideTimer.current)
  }

  if (!list.length) return <span className="text-zinc-600">—</span>

  return (
    <div className="flex flex-nowrap items-center gap-2">
      {visible.map((f, i) => <Chip key={i} label={f} />)}

      {hiddenCount > 0 && (
        <>
          <button
            type="button"
            onClick={(e) => e.stopPropagation()}
            onMouseEnter={openPop}
            onMouseLeave={closePop}
            className="min-w-[34px] h-[22px] inline-flex items-center justify-center rounded-full border border-[#D6B36A]/40 bg-[#D6B36A]/10 text-gear-gradient text-[10px] font-bold px-2 cursor-default hover:border-[#D6B36A]/70 transition"
          >
            +{hiddenCount}
          </button>

          {open && pos && ReactDOM.createPortal(
            <div
              onMouseEnter={keepPop}
              onMouseLeave={closePop}
              style={{ position: "fixed", top: pos.top, right: pos.right + 8, zIndex: 9999, transform: "translateY(-100%)" }}
            >
              <div className="animate-bubble-pop w-[230px] rounded-xl border border-[#2D2D2D] bg-[#121212] px-3 py-2.5 shadow-[0_12px_40px_rgba(0,0,0,0.55)]">
                <p className="text-[13px] font-bold tracking-[0.12em] uppercase text-gear-gradient mb-2.5">
                  Formats ({list.length})
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {list.map((f, i) => <Chip key={i} label={f} />)}
                </div>
              </div>
            </div>,
            document.body
          )}
        </>
      )}
    </div>
  )
}
