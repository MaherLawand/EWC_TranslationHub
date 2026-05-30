import type React from "react"

/**
 * onMouseMove handler for `.btn-gear` elements.
 * Feeds the cursor position (as a percentage of the element's box) into the
 * `--mx` / `--my` CSS variables so the gradient blobs warp toward the cursor.
 */
export function gearWarp(e: React.MouseEvent<HTMLElement>) {
  const el = e.currentTarget
  const r = el.getBoundingClientRect()
  el.style.setProperty("--mx", `${((e.clientX - r.left) / r.width) * 100}%`)
  el.style.setProperty("--my", `${((e.clientY - r.top) / r.height) * 100}%`)
}
