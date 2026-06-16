import React from "react"
import ReactDOM from "react-dom"
import { LANGUAGES } from "../../constants/languages"

// O(1) name → code lookup.
const LANG_CODE_MAP = new Map(LANGUAGES.map((l) => [l.name, l.code.toUpperCase()]))
function code(name: string) {
  return LANG_CODE_MAP.get(name) ?? name.slice(0, 2).toUpperCase()
}

// How many pills to show before collapsing the rest into a "+N" badge.
const MAX_VISIBLE = 2

// A single language pill. Keeps the brand gradient hover effect (gear-hover-*)
// and shows the full language name in a tooltip on hover — inside or outside.
function Pill({ name, variant }: { name: string; variant: "source" | "target" }) {
  const cls =
    variant === "source"
      ? "gear-hover-text border border-[#2D2D2D] bg-[#1A1A1A] text-[#EAEAEA]"
      : "gear-hover-fill bg-[#F5F1E8] text-black shadow-[0_0_15px_rgba(245,241,232,0.08)]"
  return (
    <div className="group/pill relative">
      <div className={`min-w-[34px] h-[22px] inline-flex items-center justify-center rounded-full text-[10px] font-bold tracking-[0.12em] px-2 transition cursor-default ${cls}`}>
        {code(name)}
      </div>
      <div className="pointer-events-none absolute left-1/2 top-0 z-[60] -translate-x-1/2 -translate-y-[115%] opacity-0 group-hover/pill:opacity-100 transition-opacity">
        <div className="whitespace-nowrap rounded-lg border border-[#2D2D2D] bg-[#121212] px-2.5 py-1 text-[10px] text-[#F5F1E8]">
          {name}
        </div>
      </div>
    </div>
  )
}

// Renders up to MAX_VISIBLE pills + a "+N" badge whose hover popover (portaled
// to escape the table overflow) lists every language with the same animation
// and per-pill hover behaviour.
function LangGroup({
  langs,
  variant,
  label,
}: {
  langs: string[]
  variant: "source" | "target"
  label: string
}) {
  const visible = langs.slice(0, MAX_VISIBLE)
  const hiddenCount = Math.max(0, langs.length - MAX_VISIBLE)

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

  return (
    <div className="flex flex-nowrap items-center gap-1">
      {visible.map((l) => <Pill key={l} name={l} variant={variant} />)}

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
                  {label} ({langs.length})
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {langs.map((l) => <Pill key={l} name={l} variant={variant} />)}
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

export default function LanguagesCell({
  source,
  target,
}: {
  source?: string[]
  target?: string[]
}) {
  const src = source ?? []
  const tgt = target ?? []

  return (
    <div className="flex flex-nowrap items-center gap-2">
      {src.length ? (
        <LangGroup langs={src} variant="source" label="Sources" />
      ) : (
        <span className="text-zinc-600">—</span>
      )}

      <span className="text-zinc-500">→</span>

      {tgt.length ? (
        <LangGroup langs={tgt} variant="target" label="Targets" />
      ) : (
        <span className="text-zinc-600">—</span>
      )}
    </div>
  )
}
