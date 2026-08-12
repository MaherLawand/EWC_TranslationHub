// Assign orders to event weeks by DEADLINE, cross-referenced with the game
// schedule (weeklyGames.ts). Shared by the Statistics pages.
//
// A game's scheduled weeks are the only candidates for its orders. When a game
// spans two weeks (e.g. CS2 in weeks 6 & 7), the order's deadline decides which
// one — by nearest week centre. Week centres are learned from the deadlines of
// single-week ("anchor") games, so no calendar dates are hard-coded; it
// self-calibrates per event as long as the deadlines match the schedule.
import { weeksForEvent } from "../constants/weeklyGames"

const norm = (s: string) => (s || "").toLowerCase().replace(/[^a-z0-9]+/g, "")
function median(a: number[]): number {
  const s = [...a].sort((x, y) => x - y)
  const m = Math.floor(s.length / 2)
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2
}
const saneTime = (t: number) => {
  const y = new Date(t).getUTCFullYear()
  return y >= 2000 && y <= 2100
}

export type WeekAssignInput = { id: string; game: string | null; deadline: string | null }

/** Map of order id → event week ("0".."7") or null (no scheduled game). */
export function assignWeeksByDeadline(orders: WeekAssignInput[], event: string): Map<string, string | null> {
  const schedule = weeksForEvent(event)
  const keySets = schedule.map((w) => {
    const s = new Set<string>()
    for (const g of w.games) for (const n of [g.game, g.display, ...(g.aliases ?? [])]) if (n) s.add(norm(n))
    return s
  })
  const weeksForGame = (game: string) => schedule.filter((_, i) => keySets[i].has(norm(game))).map((w) => w.week)

  // Learn a representative date (centre) for each week: prefer deadlines of games
  // that sit in only one week (unambiguous anchors); otherwise use all candidates.
  const anchor: Record<string, number[]> = {}
  const cand: Record<string, number[]> = {}
  for (const o of orders) {
    if (!o.game || !o.deadline) continue
    const t = Date.parse(o.deadline)
    if (Number.isNaN(t) || !saneTime(t)) continue
    const wl = weeksForGame(o.game)
    if (wl.length === 1) (anchor[wl[0]] ||= []).push(t)
    for (const w of wl) (cand[w] ||= []).push(t)
  }
  const centre: Record<string, number> = {}
  for (const w of schedule) {
    if (anchor[w.week]?.length) centre[w.week] = median(anchor[w.week])
    else if (cand[w.week]?.length) centre[w.week] = median(cand[w.week])
  }
  const nearest = (t: number, weeks: string[]) => {
    let best = weeks[0]
    let bd = Infinity
    for (const w of weeks) {
      const c = centre[w]
      if (c == null) continue
      const d = Math.abs(c - t)
      if (d < bd) {
        bd = d
        best = w
      }
    }
    return best
  }

  const map = new Map<string, string | null>()
  for (const o of orders) {
    const wl = o.game ? weeksForGame(o.game) : []
    if (wl.length === 0) {
      map.set(o.id, null)
      continue
    }
    if (wl.length === 1) {
      map.set(o.id, wl[0])
      continue
    }
    const t = o.deadline ? Date.parse(o.deadline) : NaN
    map.set(o.id, Number.isNaN(t) || !saneTime(t) ? wl[0] : nearest(t, wl))
  }
  return map
}
