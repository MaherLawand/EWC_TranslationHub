import React from "react"

/**
 * An always-visible horizontal scrollbar fixed to the bottom of the viewport,
 * aligned to (and driving) a wide table's horizontal scroll. Because it's
 * `position: fixed`, it sits at the true bottom of the screen regardless of how
 * tall the table is or where the page is scrolled.
 */
export default function StickyScrollbar({
  targetRef,
}: {
  targetRef: React.RefObject<HTMLElement | null>
}) {
  const barRef = React.useRef<HTMLDivElement>(null)
  const [rect, setRect] = React.useState({ left: 0, width: 0, show: false })
  const [scrollWidth, setScrollWidth] = React.useState(0)
  const lastRef = React.useRef({ left: 0, width: 0, show: false, scrollWidth: 0 })

  React.useEffect(() => {
    const target = targetRef.current
    const bar = barRef.current
    if (!target || !bar) return

    const measure = () => {
      const r = target.getBoundingClientRect()
      const next = {
        left: Math.round(r.left),
        width: Math.round(r.width),
        show: target.scrollWidth > target.clientWidth + 1,
        scrollWidth: target.scrollWidth,
      }
      const prev = lastRef.current
      // Skip re-render when nothing that affects the bar changed (e.g. plain
      // vertical scroll), so scroll handlers stay cheap.
      if (next.left !== prev.left || next.width !== prev.width || next.show !== prev.show || next.scrollWidth !== prev.scrollWidth) {
        lastRef.current = next
        setRect({ left: next.left, width: next.width, show: next.show })
        setScrollWidth(next.scrollWidth)
      }
      bar.scrollLeft = target.scrollLeft
    }
    measure()

    // Two-way horizontal scroll sync (re-entrancy guarded).
    let lock = false
    const onTarget = () => { if (lock) return; lock = true; bar.scrollLeft = target.scrollLeft; lock = false }
    const onBar = () => { if (lock) return; lock = true; target.scrollLeft = bar.scrollLeft; lock = false }
    target.addEventListener("scroll", onTarget, { passive: true })
    bar.addEventListener("scroll", onBar, { passive: true })

    // Reposition/resize when the layout, table, or page scroll changes.
    const ro = new ResizeObserver(measure)
    ro.observe(target)
    if (target.firstElementChild) ro.observe(target.firstElementChild)
    window.addEventListener("resize", measure)
    window.addEventListener("scroll", measure, true) // capture: catches any ancestor scroll

    return () => {
      target.removeEventListener("scroll", onTarget)
      bar.removeEventListener("scroll", onBar)
      ro.disconnect()
      window.removeEventListener("resize", measure)
      window.removeEventListener("scroll", measure, true)
    }
  }, [targetRef])

  return (
    <div
      ref={barRef}
      className="sticky-hscroll"
      style={{
        position: "fixed",
        bottom: 0,
        left: rect.left,
        width: rect.width,
        zIndex: 40,
        display: rect.show ? "block" : "none",
      }}
      aria-hidden
    >
      {/* Spacer matches the table's full scroll width so the thumb is correct. */}
      <div style={{ width: scrollWidth, height: 1 }} />
    </div>
  )
}
