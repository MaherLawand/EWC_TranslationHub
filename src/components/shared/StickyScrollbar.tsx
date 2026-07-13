import React from "react"

/**
 * An always-visible horizontal scrollbar that sticks to the bottom of the
 * scrollable viewport. It mirrors (and drives) the horizontal scroll of a target
 * element — used for wide tables so the drag handle stays on screen even when the
 * table is taller than the viewport.
 *
 * Render it as a SIBLING right after the scroll target's card (not inside it, so
 * an `overflow-hidden` card can't clip the sticky element).
 */
export default function StickyScrollbar({
  targetRef,
}: {
  targetRef: React.RefObject<HTMLElement | null>
}) {
  const barRef = React.useRef<HTMLDivElement>(null)
  const [width, setWidth] = React.useState(0)
  const [show, setShow] = React.useState(false)

  React.useEffect(() => {
    const target = targetRef.current
    const bar = barRef.current
    if (!target || !bar) return

    const update = () => {
      setWidth(target.scrollWidth)
      setShow(target.scrollWidth > target.clientWidth + 1)
      bar.scrollLeft = target.scrollLeft
    }
    update()

    // Two-way scroll sync with a re-entrancy guard.
    let lock = false
    const onTarget = () => { if (lock) return; lock = true; bar.scrollLeft = target.scrollLeft; lock = false }
    const onBar = () => { if (lock) return; lock = true; target.scrollLeft = bar.scrollLeft; lock = false }
    target.addEventListener("scroll", onTarget, { passive: true })
    bar.addEventListener("scroll", onBar, { passive: true })

    // Recompute width/overflow when the table or viewport resizes.
    const ro = new ResizeObserver(update)
    ro.observe(target)
    if (target.firstElementChild) ro.observe(target.firstElementChild)
    window.addEventListener("resize", update)

    return () => {
      target.removeEventListener("scroll", onTarget)
      bar.removeEventListener("scroll", onBar)
      ro.disconnect()
      window.removeEventListener("resize", update)
    }
  }, [targetRef])

  return (
    <div
      ref={barRef}
      className="sticky-hscroll"
      style={{ position: "sticky", bottom: 0, zIndex: 20, display: show ? "block" : "none" }}
      aria-hidden
    >
      {/* Spacer matches the table's full width so the thumb size/position is correct. */}
      <div style={{ width, height: 1 }} />
    </div>
  )
}
