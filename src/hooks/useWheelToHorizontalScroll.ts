import { useEffect, useRef } from "react"

/**
 * Attaches a wheel listener to the returned ref so that vertical mouse-wheel
 * delta is redirected to horizontal scroll — but only when the container is
 * actually horizontally scrollable. Native horizontal trackpad/touch-pad
 * gestures pass through unchanged (deltaX !== 0).
 */
export function useWheelToHorizontalScroll<T extends HTMLElement>() {
  const ref = useRef<T>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    function onWheel(e: WheelEvent) {
      if (!el) return
      // Let native horizontal scroll (trackpad swipe) pass through
      if (e.deltaX !== 0) return
      // Only intercept when there is overflow to scroll into
      if (el.scrollWidth <= el.clientWidth) return

      e.preventDefault()
      el.scrollLeft += e.deltaY
    }

    el.addEventListener("wheel", onWheel, { passive: false })
    return () => el.removeEventListener("wheel", onWheel)
  }, [])

  return ref
}
