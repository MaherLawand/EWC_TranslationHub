// ── ADMIN DAILY REPORT — VIEW ONLY (removable feature) ──
//
// Read-only late/early "daily report" for ALL admins, inside Statistics. Driven
// straight from DB timestamps (no CSV, no writes). One row per In-Progress /
// Completed order for the event, with the same delay + duration maths as
// server/prisma/scripts/daily-report-google-sheets.ts (getDelay / durations), and
// week + day filters on top. The CSV upload that writes to Google Sheets is a
// separate, owner-only page (DailyReportPage, in the sidebar).
//
// WEEK is the event week (from the game schedule, same as the Weekly Breakdown —
// shared games spread by deadline order). DAY buckets by the order's most recent
// activity timestamp (completed → in-progress → ready), UTC.
//
// To remove: delete this file + its use in StatisticsPage.tsx (the server
// /analytics/delivery route + controller can stay or go with it).
import React from "react"
import { toast } from "react-toastify"
import Select from "react-select"
import { api } from "../../lib/api"
import { weeksForEvent } from "../../constants/weeklyGames"
import { darkSelectStyles } from "../../lib/selectStyles"

const UTC_DAY_MS = 24 * 60 * 60 * 1000
const H = 60 * 60 * 1000
// Report rule: RAW/ASAP only counts as delayed past 2h from source-added.
const RAW_THRESHOLD_MS = 2 * H
const MINOR_DELAY_MAX_HOURS = 1

const CATEGORY_INFO: Record<string, { label: string; hours: number | "ASAP" }> = {
  RAW: { label: "Raw", hours: "ASAP" },
  OPENER: { label: "Opener", hours: 2 },
  HYPE_PROMO: { label: "Hype Promo", hours: 4 },
  ENGAGEMENT: { label: "Engagement", hours: 5 },
  LONG_FORM: { label: "Long Form", hours: 8 },
  EXPLAINER: { label: "Explainer", hours: 12 },
}

type Order = {
  id: string
  title: string
  type: string
  event: string
  priority: string
  status: string
  game: string | null
  contentCategory: string | null
  deliveryFormat: string
  deadline: string | null
  deadlineHasTime: boolean
  readyAt: string | null
  inProgressAt: string | null
  completedAt: string | null
  createdBy: string
  completedBy: string
  notifyPositions: string[]
  assignedTo: string[]
}
type ApiResponse = { generatedAt: string; event: string; orders: Order[] }
type Delay = { hours: number; kind: "late" | "overdue" | "early" | "left" } | null

const norm = (s: string) => (s || "").toLowerCase().replace(/[^a-z0-9]+/g, "")

/** Same rule as the sheet report. */
function getDelay(o: Order): Delay {
  let targetMs: number
  if (o.contentCategory === "RAW") {
    if (!o.readyAt) return null
    targetMs = Date.parse(o.readyAt) + RAW_THRESHOLD_MS
  } else {
    if (!o.deadline) return null
    const stored = Date.parse(o.deadline)
    if (Number.isNaN(stored)) return null
    targetMs = o.deadlineHasTime ? stored : stored + UTC_DAY_MS - 1
  }
  if (o.completedAt) {
    const c = Date.parse(o.completedAt)
    if (Number.isNaN(c)) return null
    const diff = c - targetMs
    if (diff > 0) return { hours: diff / H, kind: "late" }
    if (diff < 0) return { hours: -diff / H, kind: "early" }
    return null
  }
  const diff = Date.now() - targetMs
  if (diff > 0) return { hours: diff / H, kind: "overdue" }
  if (diff < 0) return { hours: -diff / H, kind: "left" }
  return null
}

function amountLabel(hours: number): string {
  const totalMin = Math.round(hours * 60)
  const h = Math.floor(totalMin / 60)
  const m = totalMin % 60
  return h ? (m ? `${h}h ${m}m` : `${h}h`) : `${m}m`
}
function durationLabel(fromIso: string | null, toIso: string | null): string {
  if (!fromIso || !toIso) return ""
  const ms = Date.parse(toIso) - Date.parse(fromIso)
  if (Number.isNaN(ms) || ms < 0) return ""
  return amountLabel(ms / H)
}
function timeToDeliver(o: Order): string {
  if (!o.readyAt || !o.deadline) return ""
  const readyMs = Date.parse(o.readyAt)
  const stored = Date.parse(o.deadline)
  if (Number.isNaN(readyMs) || Number.isNaN(stored)) return ""
  const deadlineMs = o.deadlineHasTime ? stored : stored + UTC_DAY_MS - 1
  const ms = deadlineMs - readyMs
  return ms < 0 ? "" : amountLabel(ms / H)
}
function expectedDelivery(cat: string | null): string {
  if (!cat || !(cat in CATEGORY_INFO)) return ""
  const hours = CATEGORY_INFO[cat].hours === "ASAP" ? 2 : (CATEGORY_INFO[cat].hours as number)
  return `Within ${hours}h`
}

/** UTC "Mon D, HH:mm". */
function fmtTs(iso: string | null): string {
  if (!iso) return "—"
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return "—"
  const y = d.getUTCFullYear()
  if (y < 2000 || y > 2100) return "—" // guard corrupt dates
  return d.toLocaleString("en-US", { timeZone: "UTC", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", hour12: false })
}
/** UTC day key of the order's most recent activity. */
function dayKey(o: Order): string | null {
  const iso = o.completedAt || o.inProgressAt || o.readyAt
  if (!iso) return null
  const d = new Date(iso)
  const y = d.getUTCFullYear()
  if (Number.isNaN(d.getTime()) || y < 2000 || y > 2100) return null
  return d.toISOString().slice(0, 10)
}
const dayLabelFor = (key: string) =>
  new Date(key + "T00:00:00Z").toLocaleDateString("en-US", { timeZone: "UTC", month: "short", day: "numeric", year: "numeric" })

const PAGE_SIZE = 50

export default function DailyReportView({ event = "EWC", kind = "broadcast" }: { event?: string; kind?: "broadcast" | "marketing" }) {
  const [data, setData] = React.useState<ApiResponse | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [weekFilter, setWeekFilter] = React.useState<string>("all")
  const [dayFilter, setDayFilter] = React.useState<string>("all")
  const [gameFilter, setGameFilter] = React.useState<string>("all")
  const [delayFilter, setDelayFilter] = React.useState<string>("all") // all | late | early | ontime
  const [search, setSearch] = React.useState("")
  const [page, setPage] = React.useState(0)
  const [selected, setSelected] = React.useState<{ o: Order; week: string | null; delay: Delay } | null>(null)

  const load = React.useCallback(async () => {
    setLoading(true)
    try {
      const res = await api.get(`/analytics/delivery?event=${encodeURIComponent(event)}`)
      setData(res.data)
    } catch {
      toast.error("Could not load the daily report")
    } finally {
      setLoading(false)
    }
  }, [event])

  React.useEffect(() => {
    load()
  }, [load])
  React.useEffect(() => {
    setWeekFilter("all")
    setDayFilter("all")
    setGameFilter("all")
    setDelayFilter("all")
    setSearch("")
    setPage(0)
  }, [event])
  React.useEffect(() => {
    setPage(0)
  }, [weekFilter, dayFilter, gameFilter, delayFilter, search, kind])

  /* Assign each order to an event week (broadcast only) by deadline order within shared games. */
  const weekOf = React.useMemo(() => {
    const map = new Map<string, string | null>()
    if (!data) return map
    const schedule = weeksForEvent(event)
    const keySets = schedule.map((w) => {
      const s = new Set<string>()
      for (const g of w.games) for (const n of [g.game, g.display, ...(g.aliases ?? [])]) if (n) s.add(norm(n))
      return s
    })
    const weeksForGame = (game: string) => schedule.filter((_, i) => keySets[i].has(norm(game))).map((w) => w.week)
    const byGame = new Map<string, Order[]>()
    for (const o of data.orders) {
      if (!o.game) {
        map.set(o.id, null)
        continue
      }
      const list = byGame.get(o.game)
      if (list) list.push(o)
      else byGame.set(o.game, [o])
    }
    for (const [game, list] of byGame) {
      const wl = weeksForGame(game)
      if (wl.length === 0) {
        for (const o of list) map.set(o.id, null)
        continue
      }
      if (wl.length === 1) {
        for (const o of list) map.set(o.id, wl[0])
        continue
      }
      const sorted = [...list].sort((a, b) => {
        const da = a.deadline, db = b.deadline
        if (!da && !db) return 0
        if (!da) return 1
        if (!db) return -1
        return Date.parse(da) - Date.parse(db)
      })
      const n = wl.length, k = sorted.length, base = Math.floor(k / n), rem = k % n
      let pos = 0
      for (let wi = 0; wi < n; wi++) {
        const count = base + (wi < rem ? 1 : 0)
        for (let j = 0; j < count; j++) map.set(sorted[pos++].id, wl[wi])
      }
    }
    return map
  }, [data, event])

  const rows = React.useMemo(() => {
    if (!data) return []
    return data.orders
      .map((o) => ({ o, week: weekOf.get(o.id) ?? null, day: dayKey(o), delay: getDelay(o) }))
      .sort((a, b) => (Date.parse(b.o.completedAt || b.o.inProgressAt || b.o.readyAt || "0") || 0) - (Date.parse(a.o.completedAt || a.o.inProgressAt || a.o.readyAt || "0") || 0))
  }, [data, weekOf])

  const weeksWithData = React.useMemo(() => {
    const set = new Set(rows.map((r) => r.week).filter(Boolean) as string[])
    return weeksForEvent(event).map((w) => w.week).filter((w) => set.has(w))
  }, [rows, event])
  const daysWithData = React.useMemo(
    () => [...new Set(rows.map((r) => r.day).filter(Boolean) as string[])].sort((a, b) => b.localeCompare(a)),
    [rows]
  )
  const gameOptions = React.useMemo(
    () => [...new Set(rows.map((r) => r.o.game).filter(Boolean) as string[])].sort((a, b) => a.localeCompare(b)),
    [rows]
  )

  const matchesDelay = (d: Delay) => {
    if (delayFilter === "all") return true
    if (delayFilter === "late") return d?.kind === "late"
    if (delayFilter === "overdue") return d?.kind === "overdue"
    if (delayFilter === "early") return d?.kind === "early"
    if (delayFilter === "ontime") return !d || d.kind === "left"
    return true
  }

  const filtered = React.useMemo(() => {
    const q = search.trim().toLowerCase()
    const wantType = kind.toUpperCase()
    return rows.filter(
      (r) =>
        (r.o.type || "").toUpperCase() === wantType &&
        (weekFilter === "all" || r.week === weekFilter) &&
        (dayFilter === "all" || r.day === dayFilter) &&
        (gameFilter === "all" || r.o.game === gameFilter) &&
        matchesDelay(r.delay) &&
        (!q || r.o.title.toLowerCase().includes(q) || (r.o.game || "").toLowerCase().includes(q))
    )
  }, [rows, weekFilter, dayFilter, gameFilter, delayFilter, search, kind])

  const stats = React.useMemo(() => {
    let completed = 0, inProgress = 0, late = 0, overdue = 0, early = 0, lateHours = 0
    for (const r of filtered) {
      if (r.o.status === "COMPLETED") completed++
      else inProgress++
      const d = r.delay
      if (!d) continue
      if (d.kind === "late") { late++; lateHours += d.hours }
      else if (d.kind === "overdue") overdue++
      else if (d.kind === "early") early++
    }
    const completedRows = filtered.filter((r) => r.o.status === "COMPLETED")
    const onTime = completedRows.filter((r) => !r.delay || r.delay.kind === "early").length
    const pct = completedRows.length ? Math.round((onTime / completedRows.length) * 100) : null
    return { completed, inProgress, late, overdue, early, onTimePct: pct, avgLate: late ? amountLabel(lateHours / late) : "—" }
  }, [filtered])

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const pageRows = filtered.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE)

  const anyFilter = weekFilter !== "all" || dayFilter !== "all" || gameFilter !== "all" || delayFilter !== "all" || !!search
  const clear = () => {
    setWeekFilter("all"); setDayFilter("all"); setGameFilter("all"); setDelayFilter("all"); setSearch("")
  }

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
        <p className="text-[13px] text-zinc-500 leading-relaxed max-w-[680px]">
          Read-only late / early view for <span className="text-zinc-300">{event}</span>, live from each order's
          timestamps — deadline, source-added, in-progress and completed. RAW counts as late only past 2h from
          source-added (same rule as the sheet).
        </p>
        <button
          onClick={load}
          disabled={loading}
          className="h-[42px] px-4 rounded-2xl text-sm font-semibold border border-white/15 text-zinc-300 hover:text-white hover:border-white/30 transition disabled:opacity-50"
        >
          {loading ? "…" : "Refresh"}
        </button>
      </div>

      {loading && !data ? (
        <div className="text-zinc-500 text-sm py-20 text-center">Loading report…</div>
      ) : !data ? null : (
        <>
          {/* Filters */}
          <div className="bg-white/[0.03] border border-white/10 rounded-[20px] p-3 mb-5 flex flex-col gap-3">
            <div className="flex items-center gap-2 overflow-x-auto pb-0.5">
              <span className="text-[11px] uppercase tracking-wider text-zinc-500 shrink-0 pr-1">Week</span>
              <Chip active={weekFilter === "all"} onClick={() => setWeekFilter("all")}>All</Chip>
              {weeksWithData.map((w) => (
                <Chip key={w} active={weekFilter === w} onClick={() => setWeekFilter(w)}>W{w}</Chip>
              ))}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[11px] uppercase tracking-wider text-zinc-500 pr-1">Day</span>
              <div className="w-[190px]">
                <Select
                  styles={darkSelectStyles}
                  menuPortalTarget={typeof document !== "undefined" ? document.body : undefined}
                  isSearchable={false}
                  options={[{ value: "all", label: "All days" }, ...daysWithData.map((d) => ({ value: d, label: dayLabelFor(d) }))]}
                  value={dayFilter === "all" ? { value: "all", label: "All days" } : { value: dayFilter, label: dayLabelFor(dayFilter) }}
                  onChange={(o: any) => setDayFilter(o?.value ?? "all")}
                />
              </div>
              {kind === "broadcast" && (
                <>
                  <span className="text-[11px] uppercase tracking-wider text-zinc-500 pl-2 pr-1">Game</span>
                  <div className="w-[220px]">
                    <Select
                      styles={darkSelectStyles}
                      menuPortalTarget={typeof document !== "undefined" ? document.body : undefined}
                      options={[{ value: "all", label: "All games" }, ...gameOptions.map((g) => ({ value: g, label: g }))]}
                      value={gameFilter === "all" ? { value: "all", label: "All games" } : { value: gameFilter, label: gameFilter }}
                      onChange={(o: any) => setGameFilter(o?.value ?? "all")}
                      placeholder="All games"
                    />
                  </div>
                </>
              )}
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search title / game…"
                className="ml-auto bg-[#111] border border-[#242424] rounded-xl h-[44px] px-3 text-sm text-zinc-200 w-[200px] focus:outline-none focus:border-[#D6B36A]/50"
              />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[11px] uppercase tracking-wider text-zinc-500 pr-1">Timing</span>
              {[["all", "All"], ["late", "Late"], ["early", "Early"], ["ontime", "On time"]].map(([v, l]) => (
                <Chip key={v} active={delayFilter === v} onClick={() => setDelayFilter(v)}>{l}</Chip>
              ))}
              {anyFilter && (
                <button onClick={clear} className="ml-auto text-[12px] text-zinc-400 hover:text-white underline underline-offset-2">Clear filters</button>
              )}
            </div>
          </div>

          {/* Summary */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
            <Tile label="Completed orders" value={filtered.length} accent />
            <Tile label="Late" value={stats.late} tone="#E8894A" />
            <Tile label="Early" value={stats.early} tone="#6FBF9B" />
            <Tile label="On-time" value={stats.onTimePct == null ? "—" : `${stats.onTimePct}%`} sub={stats.avgLate !== "—" ? `avg late ${stats.avgLate}` : undefined} />
          </div>

          {/* Table — key columns only; click a row for full details. */}
          <div className="bg-white/[0.03] border border-white/10 rounded-[20px] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-[15px] border-collapse whitespace-nowrap">
                <thead>
                  <tr className="text-zinc-400 border-b border-white/10 text-[13px]">
                    <th className="text-left font-semibold px-5 py-4">Order</th>
                    <th className="text-left font-semibold px-4 py-4">Category</th>
                    <th className="text-left font-semibold px-4 py-4">Late / Early</th>
                    <th className="text-left font-semibold px-4 py-4">Deadline (UTC)</th>
                    <th className="text-left font-semibold px-4 py-4">Completed (UTC)</th>
                    <th className="text-left font-semibold px-4 py-4">Source→Completed</th>
                    <th className="w-8"></th>
                  </tr>
                </thead>
                <tbody>
                  {pageRows.map((r) => (
                    <tr
                      key={r.o.id}
                      onClick={() => setSelected({ o: r.o, week: r.week, delay: r.delay })}
                      className="border-b border-white/[0.05] hover:bg-white/[0.03] cursor-pointer transition"
                    >
                      <td className="px-5 py-4 max-w-[320px]">
                        <div className="truncate text-[#F5F1E8] font-medium" title={r.o.title}>{r.o.title}</div>
                        <div className="text-[12px] text-zinc-500 truncate">{r.o.game || "Marketing"}{r.week ? ` · W${r.week}` : ""}</div>
                      </td>
                      <td className="px-4 py-4 text-zinc-400">{r.o.contentCategory ? CATEGORY_INFO[r.o.contentCategory]?.label || r.o.contentCategory : "—"}</td>
                      <td className="px-4 py-4"><DelayPill delay={r.delay} /></td>
                      <td className="px-4 py-4 text-zinc-400">{fmtTs(r.o.deadline)}</td>
                      <td className="px-4 py-4 text-zinc-400">{fmtTs(r.o.completedAt)}</td>
                      <td className="px-4 py-4 text-zinc-200 font-medium">{durationLabel(r.o.readyAt, r.o.completedAt) || "—"}</td>
                      <td className="px-3 py-4 text-zinc-600 text-right">›</td>
                    </tr>
                  ))}
                  {!pageRows.length && (
                    <tr><td colSpan={7} className="px-3 py-12 text-center text-zinc-600">No orders match the current filters.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
            {filtered.length > PAGE_SIZE && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-white/10 text-[12px] text-zinc-400">
                <span>Showing {page * PAGE_SIZE + 1}–{Math.min(filtered.length, (page + 1) * PAGE_SIZE)} of {filtered.length}</span>
                <div className="flex items-center gap-2">
                  <button onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={page === 0} className="px-3 h-[30px] rounded-lg border border-white/15 disabled:opacity-40 hover:border-white/30">Prev</button>
                  <span>{page + 1} / {pageCount}</span>
                  <button onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))} disabled={page >= pageCount - 1} className="px-3 h-[30px] rounded-lg border border-white/15 disabled:opacity-40 hover:border-white/30">Next</button>
                </div>
              </div>
            )}
          </div>

          <p className="text-[11px] text-zinc-600 leading-relaxed mt-4">
            View only — the CSV upload that writes to Google Sheets is the owner's sidebar page. Only completed orders
            appear. Week = event week by game schedule; Day = the completion day (UTC).
            {data.generatedAt && <> · Updated {new Date(data.generatedAt).toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</>}
          </p>
        </>
      )}

      {selected && <DetailPanel row={selected} onClose={() => setSelected(null)} />}
    </div>
  )
}

/** Right-side detail drawer for a single order — all the fields not in the table. */
function DetailPanel({ row, onClose }: { row: { o: Order; week: string | null; delay: Delay }; onClose: () => void }) {
  const { o, week, delay } = row
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose()
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [onClose])

  const details: [string, React.ReactNode][] = [
    ["Type", o.type === "BROADCAST" ? "Broadcast" : "Marketing"],
    ["Status", <StatusPill status={o.status} />],
    ["Priority", o.priority ? o.priority[0] + o.priority.slice(1).toLowerCase() : "—"],
    ["Category", o.contentCategory ? CATEGORY_INFO[o.contentCategory]?.label || o.contentCategory : "—"],
    ["Delivery format", o.deliveryFormat || "—"],
    ["Expected delivery", expectedDelivery(o.contentCategory) || "—"],
    ["Time to deliver", timeToDeliver(o) || "—"],
    ["Deadline (UTC)", fmtTs(o.deadline)],
    ["Source added (UTC)", fmtTs(o.readyAt)],
    ["In progress (UTC)", fmtTs(o.inProgressAt)],
    ["Ready → In progress", durationLabel(o.readyAt, o.inProgressAt) || "—"],
    ["Completed (UTC)", fmtTs(o.completedAt)],
    ["Source → Completed", durationLabel(o.readyAt, o.completedAt) || "—"],
    ["Completed by", o.completedBy || "—"],
    ["Created by", o.createdBy || "—"],
    ["Vendor", o.notifyPositions.map((p) => p.replace(/_/g, " ")).join(", ") || "—"],
    ["Assigned to", o.assignedTo.join(", ") || "—"],
  ]

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-[300]" onClick={onClose} />
      <div className="fixed top-0 right-0 h-full w-full sm:w-[440px] bg-[#0C0C0C] border-l border-white/10 z-[301] overflow-y-auto shadow-[0_0_60px_rgba(0,0,0,0.7)]">
        <div className="sticky top-0 bg-[#0C0C0C] border-b border-white/10 px-5 py-4 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="text-[#F5F1E8] font-semibold truncate" title={o.title}>{o.title}</div>
            <div className="text-[12px] text-zinc-500 truncate">{o.game || "Marketing"}{week ? ` · W${week}` : ""}</div>
          </div>
          <button onClick={onClose} className="shrink-0 text-zinc-400 hover:text-white text-lg leading-none px-1">✕</button>
        </div>
        <div className="px-5 py-4">
          <div className="mb-4"><DelayPill delay={delay} /></div>
          <dl className="divide-y divide-white/[0.06]">
            {details.map(([label, value]) => (
              <div key={label} className="flex items-start justify-between gap-4 py-2.5">
                <dt className="text-[12px] uppercase tracking-wider text-zinc-500 shrink-0">{label}</dt>
                <dd className="text-[13px] text-zinc-200 text-right break-words min-w-0">{value}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </>
  )
}

/* ── primitives ── */
function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`shrink-0 h-[30px] px-3 rounded-lg text-[12px] font-semibold transition border ${
        active ? "bg-[#D6B36A] text-black border-[#D6B36A]" : "bg-white/[0.03] text-zinc-400 border-white/10 hover:text-white hover:border-white/25"
      }`}
    >
      {children}
    </button>
  )
}
function Tile({ label, value, sub, accent, tone }: { label: string; value: React.ReactNode; sub?: string; accent?: boolean; tone?: string }) {
  return (
    <div className="bg-white/[0.03] border border-white/10 rounded-[18px] px-4 py-3.5">
      <div className="text-[11px] uppercase tracking-wider text-zinc-500">{label}</div>
      <div className="text-xl font-bold mt-1 tabular-nums" style={tone ? { color: tone } : undefined}>
        <span className={accent ? "text-gear-gradient" : tone ? "" : "text-[#F5F1E8]"}>{value}</span>
      </div>
      {sub && <div className="text-[11px] text-zinc-600 mt-0.5">{sub}</div>}
    </div>
  )
}
function StatusPill({ status }: { status: string }) {
  const c = status === "COMPLETED" ? { bg: "#6FBF9B22", fg: "#6FBF9B", t: "Completed" } : { bg: "#E8B14A22", fg: "#E8B14A", t: "In Progress" }
  return <span className="inline-block px-2 py-0.5 rounded-md text-[11px] font-semibold" style={{ background: c.bg, color: c.fg }}>{c.t}</span>
}
function DelayPill({ delay }: { delay: Delay }) {
  if (!delay) return <span className="text-zinc-600">—</span>
  const amount = amountLabel(delay.hours)
  if (delay.kind === "early") return <Pill bg="#6FBF9B22" fg="#6FBF9B">✅ {amount} early</Pill>
  if (delay.kind === "left") return <Pill bg="#5AA9E622" fg="#5AA9E6">⏳ {amount} left</Pill>
  const minor = delay.hours < MINOR_DELAY_MAX_HOURS
  const label = delay.kind === "overdue" ? "overdue" : "late"
  return minor
    ? <Pill bg="#E8894A22" fg="#E8894A">⚠ {amount} {label}</Pill>
    : <Pill bg="#C6597A22" fg="#C6597A">⛔ {amount} {label}</Pill>
}
function Pill({ bg, fg, children }: { bg: string; fg: string; children: React.ReactNode }) {
  return <span className="inline-block px-2 py-0.5 rounded-md text-[11px] font-semibold" style={{ background: bg, color: fg }}>{children}</span>
}
