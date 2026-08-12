// ── ADMIN STATISTICS DASHBOARD (removable feature) ──
//
// Admin-only broadcast statistics for the translation hub, built to keep working
// across events/years (EWC 2027, ENC 2027, …). The server returns raw per-order
// rows (controllers/analytics.controller.ts); everything else happens here.
//
// WEEK ASSIGNMENT — each order is placed in an event week by its DEADLINE, not by
// an even split of shared games. We learn each week's date window from the orders
// whose game is scheduled in only one week (unambiguous "anchors"), then a game
// that spans two weeks (e.g. PUBG Mobile in weeks 5 & 6) sends each of its orders
// to whichever of its weeks the deadline is closest to. No hard-coded dates, so
// it self-calibrates for any future event as orders come in.
//
// Filters (week / game / status) and the videos⇄orders toggle re-compute every
// chart reactively from the same rows. Charts are hand-rolled CSS/SVG — no chart
// dependency — so the whole feature is one file.
//
// To remove: delete this file + its wiring in DashboardPage.tsx and Sidebar.tsx,
// plus the server analytics files.
import React from "react"
import { toast } from "react-toastify"
import Select from "react-select"
import { api } from "../../lib/api"
import { weeksForEvent } from "../../constants/weeklyGames"
import { CONTENT_TITLES } from "../../constants/contentTitles"
import { darkSelectStyles } from "../../lib/selectStyles"
import { assignWeeksByDeadline } from "../../lib/weekAssign"

/* ── categories / colours ── */
const CATS = [
  { key: "RAW", label: "RAW", color: "#D6B36A" },
  { key: "OPENER", label: "Opener", color: "#E8894A" },
  { key: "HYPE_PROMO", label: "Hype Promo", color: "#C6597A" },
  { key: "ENGAGEMENT", label: "Engagement", color: "#5AA9E6" },
  { key: "LONG_FORM", label: "Long Form", color: "#6FBF9B" },
  { key: "EXPLAINER", label: "Explainer", color: "#9B8AE6" },
] as const

const STATUS_ORDER = ["PENDING", "READY_FOR_TRANSLATION", "IN_PROGRESS", "COMPLETED"] as const
const STATUS_META: Record<string, { label: string; color: string }> = {
  PENDING: { label: "Pending", color: "#6B7280" },
  READY_FOR_TRANSLATION: { label: "Ready", color: "#5AA9E6" },
  IN_PROGRESS: { label: "In Progress", color: "#E8B14A" },
  COMPLETED: { label: "Completed", color: "#6FBF9B" },
}

/* ── types ── */
type Order = {
  game: string
  category: string | null
  status: string
  deadline: string | null
  completedAt: string | null
  languages: string[]
}
type MarketingRow = { contentTitle: string | null; status: string; videos: number }
type ApiResponse = { generatedAt: string; event: string; orders: Order[]; marketing: MarketingRow[] }
type Assigned = Order & { week: string | null }
type Metric = "videos" | "orders"
type Kind = "broadcast" | "marketing"

const norm = (s: string) => (s || "").toLowerCase().replace(/[^a-z0-9]+/g, "")
const videosOf = (o: Order) => o.languages.length

/** Guard against corrupt deadlines (e.g. a year-5667 typo) in date-range display. */
function saneDeadline(iso: string | null): string | null {
  if (!iso) return null
  const y = new Date(iso).getUTCFullYear()
  return y >= 2000 && y <= 2100 ? iso : null
}
const fmtDate = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" }) : "—"

export default function AnalyticsDashboard({ event = "EWC", kind = "broadcast", view = "main" }: { event?: string; kind?: Kind; view?: "main" | "weekly" }) {
  const [data, setData] = React.useState<ApiResponse | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [metric, setMetric] = React.useState<Metric>("videos")
  const [weekFilter, setWeekFilter] = React.useState<string>("all")
  const [gameFilter, setGameFilter] = React.useState<string>("all")
  const [statusFilter, setStatusFilter] = React.useState<string>("all")
  const [openWeeks, setOpenWeeks] = React.useState<Set<string>>(new Set())
  const toggleWeek = (wk: string) =>
    setOpenWeeks((prev) => {
      const next = new Set(prev)
      if (next.has(wk)) next.delete(wk)
      else next.add(wk)
      return next
    })

  const load = React.useCallback(async () => {
    setLoading(true)
    try {
      const res = await api.get(`/analytics/broadcast?event=${encodeURIComponent(event)}`)
      setData(res.data)
    } catch {
      toast.error("Could not load statistics")
    } finally {
      setLoading(false)
    }
  }, [event])

  React.useEffect(() => {
    load()
  }, [load])

  // Reset filters when switching event (weeks/games differ).
  React.useEffect(() => {
    setWeekFilter("all")
    setGameFilter("all")
    setStatusFilter("all")
    setOpenWeeks(new Set())
  }, [event])

  /* ── assign every order to an event week by DEADLINE, cross-referenced with the
     game schedule (see lib/weekAssign). A game's scheduled weeks are the
     candidates; the deadline picks which one when a game spans two weeks. */
  const { assigned, weekOrder } = React.useMemo(() => {
    if (!data) return { assigned: [] as Assigned[], weekOrder: [] as string[] }
    const wk = assignWeeksByDeadline(
      data.orders.map((o, i) => ({ id: String(i), game: o.game, deadline: o.deadline })),
      event
    )
    const assigned: Assigned[] = data.orders.map((o, i) => ({ ...o, week: wk.get(String(i)) ?? null }))
    return { assigned, weekOrder: weeksForEvent(event).map((w) => w.week) }
  }, [data, event])

  /* filter option lists (stable, from full dataset) */
  const gameOptions = React.useMemo(
    () => [...new Set(assigned.map((o) => o.game))].sort((a, b) => a.localeCompare(b)),
    [assigned]
  )
  const weeksWithData = React.useMemo(() => {
    const set = new Set(assigned.map((o) => o.week).filter(Boolean) as string[])
    return weekOrder.filter((w) => set.has(w))
  }, [assigned, weekOrder])

  const filtered = React.useMemo(
    () =>
      assigned.filter(
        (o) =>
          (weekFilter === "all" || o.week === weekFilter) &&
          (gameFilter === "all" || o.game === gameFilter) &&
          (statusFilter === "all" || o.status === statusFilter)
      ),
    [assigned, weekFilter, gameFilter, statusFilter]
  )

  /* ── aggregate the filtered rows ── */
  const agg = React.useMemo(() => {
    const val = (v: number, o: number) => (metric === "videos" ? v : o)
    const perWeek = new Map<string, { cats: Record<string, number>; total: number; min: string | null; max: string | null; games: Map<string, { cats: Record<string, number>; total: number }> }>()
    const perCat: Record<string, number> = Object.fromEntries(CATS.map((c) => [c.key, 0]))
    const perGame = new Map<string, number>()
    const perLang = new Map<string, number>()
    const perStatus = new Map<string, number>()
    let totVideos = 0
    let totOrders = 0
    let completedWithDeadline = 0
    let onTime = 0
    const gameSet = new Set<string>()
    const langSet = new Set<string>()

    for (const o of filtered) {
      const v = videosOf(o)
      const inc = val(v, 1)
      totVideos += v
      totOrders += 1
      gameSet.add(o.game)
      perGame.set(o.game, (perGame.get(o.game) || 0) + inc)
      perStatus.set(o.status, (perStatus.get(o.status) || 0) + inc)
      for (const l of o.languages) {
        const k = l.trim()
        if (!k) continue
        langSet.add(k)
        perLang.set(k, (perLang.get(k) || 0) + 1)
      }
      if (o.category && o.category in perCat) perCat[o.category] += inc
      if (o.status === "COMPLETED" && o.deadline && o.completedAt) {
        completedWithDeadline += 1
        if (Date.parse(o.completedAt) <= Date.parse(o.deadline)) onTime += 1
      }
      const wk = o.week
      if (wk) {
        let row = perWeek.get(wk)
        if (!row) {
          row = { cats: Object.fromEntries(CATS.map((c) => [c.key, 0])), total: 0, min: null, max: null, games: new Map() }
          perWeek.set(wk, row)
        }
        row.total += inc
        if (o.category && o.category in row.cats) row.cats[o.category] += inc
        const dl = saneDeadline(o.deadline)
        if (dl) {
          if (!row.min || dl < row.min) row.min = dl
          if (!row.max || dl > row.max) row.max = dl
        }
        let g = row.games.get(o.game)
        if (!g) {
          g = { cats: Object.fromEntries(CATS.map((c) => [c.key, 0])), total: 0 }
          row.games.set(o.game, g)
        }
        g.total += inc
        if (o.category && o.category in g.cats) g.cats[o.category] += inc
      }
    }
    const total = metric === "videos" ? totVideos : totOrders
    return {
      perWeek,
      perCat,
      total,
      totVideos,
      totOrders,
      games: gameSet.size,
      languages: langSet.size,
      onTimePct: completedWithDeadline > 0 ? Math.round((onTime / completedWithDeadline) * 100) : null,
      onTime,
      completedWithDeadline,
      topGames: [...perGame.entries()].map(([label, value]) => ({ label, value })).filter((g) => g.value > 0).sort((a, b) => b.value - a.value).slice(0, 10),
      langBars: [...perLang.entries()].map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value),
      statusBars: STATUS_ORDER.filter((s) => (perStatus.get(s) || 0) > 0).map((s) => ({ label: STATUS_META[s].label, value: perStatus.get(s) || 0, color: STATUS_META[s].color })),
    }
  }, [filtered, metric])

  const weekRows = weekOrder
    .filter((w) => agg.perWeek.has(w))
    .map((w) => ({ week: w, ...agg.perWeek.get(w)! }))

  const anyFilter = weekFilter !== "all" || gameFilter !== "all" || statusFilter !== "all"
  const clearFilters = () => {
    setWeekFilter("all")
    setGameFilter("all")
    setStatusFilter("all")
  }

  /* ── marketing: videos per content title (no game/week) ── */
  const marketing = React.useMemo(() => {
    const rows = data?.marketing ?? []
    const byTitle = new Map<string, { videos: number; orders: number }>()
    // Seed every known content title at 0 so titles with no videos still appear.
    for (const t of CONTENT_TITLES) byTitle.set(t, { videos: 0, orders: 0 })
    let totVideos = 0
    let totOrders = 0
    for (const r of rows) {
      const key = r.contentTitle || "(no content title)"
      const cell = byTitle.get(key) || { videos: 0, orders: 0 }
      cell.videos += r.videos
      cell.orders += 1
      byTitle.set(key, cell)
      totVideos += r.videos
      totOrders += 1
    }
    const bars = [...byTitle.entries()]
      .map(([label, c]) => ({ label, value: metric === "videos" ? c.videos : c.orders, videos: c.videos, orders: c.orders }))
      .sort((a, b) => b.value - a.value || a.label.localeCompare(b.label))
    return { bars, totVideos, totOrders, titles: bars.filter((b) => b.videos || b.orders).length }
  }, [data, metric])

  return (
    <div className="px-1 py-1">
      {/* Header controls */}
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <p className="text-[12px] text-zinc-500 leading-snug max-w-[520px]">
          {kind === "broadcast"
            ? `${event} broadcast — videos per content category, by event week.`
            : `${event} marketing — videos per content title.`}
        </p>
        <div className="flex items-center gap-2">
          <div className="relative grid grid-cols-2 bg-[#111111] border border-[#242424] rounded-2xl p-1">
            {(["videos", "orders"] as const).map((m) => (
              <button
                key={m}
                onClick={() => setMetric(m)}
                className={`relative z-10 h-[38px] px-4 rounded-xl text-sm font-semibold capitalize transition ${
                  metric === m ? "gear-fill text-black" : "text-zinc-500 hover:text-white"
                }`}
              >
                {m}
              </button>
            ))}
          </div>
          <button
            onClick={load}
            disabled={loading}
            className="h-[46px] px-4 rounded-2xl text-sm font-semibold border border-white/15 text-zinc-300 hover:text-white hover:border-white/30 transition disabled:opacity-50"
          >
            {loading ? "…" : "Refresh"}
          </button>
        </div>
      </div>

      {loading && !data ? (
        <div className="text-zinc-500 text-sm py-20 text-center">Loading statistics…</div>
      ) : !data ? null : kind === "marketing" ? (
        <MarketingView bars={marketing.bars} totVideos={marketing.totVideos} totOrders={marketing.totOrders} titles={marketing.titles} metric={metric} generatedAt={data.generatedAt} view={view} />
      ) : (
        <>
          {/* ── FILTER BAR ── */}
          <div className="bg-white/[0.03] border border-white/10 rounded-[20px] p-3 mb-5 flex flex-col gap-3">
            {/* Weeks */}
            <div className="flex items-center gap-2 overflow-x-auto pb-0.5">
              <span className="text-[11px] uppercase tracking-wider text-zinc-500 shrink-0 pr-1">Week</span>
              <Chip active={weekFilter === "all"} onClick={() => setWeekFilter("all")}>All</Chip>
              {weeksWithData.map((w) => (
                <Chip key={w} active={weekFilter === w} onClick={() => setWeekFilter(w)}>W{w}</Chip>
              ))}
            </div>
            {/* Game + Status */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[11px] uppercase tracking-wider text-zinc-500 pr-1">Game</span>
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
              <span className="text-[11px] uppercase tracking-wider text-zinc-500 pl-2 pr-1">Status</span>
              <Chip active={statusFilter === "all"} onClick={() => setStatusFilter("all")}>All</Chip>
              {STATUS_ORDER.map((s) => (
                <Chip key={s} active={statusFilter === s} onClick={() => setStatusFilter(s)} dot={STATUS_META[s].color}>
                  {STATUS_META[s].label}
                </Chip>
              ))}
              {anyFilter && (
                <button onClick={clearFilters} className="ml-auto text-[12px] text-zinc-400 hover:text-white underline underline-offset-2">
                  Clear filters
                </button>
              )}
            </div>
          </div>

          {/* KPI tiles */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-5">
            <Tile label="Videos" value={agg.totVideos} accent />
            <Tile label="Orders" value={agg.totOrders} />
            <Tile label="Weeks shown" value={weekRows.length} />
            <Tile label="Games" value={agg.games} />
            <Tile label="On-time" value={agg.onTimePct == null ? "—" : `${agg.onTimePct}%`} sub={agg.onTimePct == null ? "no completed w/ deadline" : `${agg.onTime}/${agg.completedWithDeadline} completed`} />
          </div>

          {/* ── MAIN: overview charts ── */}
          {view === "main" && (
            <>
              {/* Volume by week */}
              <Card title={`${metric === "videos" ? "Videos" : "Orders"} by week`} subtitle="Stacked by content category — hover a segment for its value">
                <StackedBars weeks={weekRows} />
                <Legend items={CATS.map((c) => ({ label: c.label, color: c.color }))} />
              </Card>

              {/* Category mix (clear bar list) + Top games */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4">
                <Card title="Category mix" subtitle={`Share of ${metric} across the current view`}>
                  <CategoryMix perCat={agg.perCat} total={agg.total} />
                </Card>
                <Card title="Top games" subtitle={`By ${metric}`}>
                  <BarList items={agg.topGames} color="#D6B36A" />
                </Card>
              </div>

              {/* Languages + Status */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4">
                <Card title="Languages" subtitle="Videos per target language">
                  <BarList items={agg.langBars} color="#5AA9E6" />
                </Card>
                <Card title="Order status" subtitle={`${metric} by status`}>
                  <BarList items={agg.statusBars} perItemColor />
                </Card>
              </div>
            </>
          )}

          {/* ── WEEKLY BREAKDOWN: detailed table ── */}
          {view === "weekly" && (
          <div className="mt-2 bg-white/[0.03] border border-white/10 rounded-[24px] overflow-hidden">
            <div className="px-5 pt-4 pb-2 text-[13px] text-zinc-400 font-semibold">Weekly breakdown</div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="text-zinc-400 border-b border-white/10">
                    <th className="text-left font-semibold px-4 py-3">Week</th>
                    {CATS.map((c) => (
                      <th key={c.key} className="text-right font-semibold px-3 py-3 whitespace-nowrap">{c.label}</th>
                    ))}
                    <th className="text-right font-semibold px-4 py-3">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {weekRows.map((w) => {
                    const isOpen = openWeeks.has(w.week)
                    const games = [...w.games.entries()].map(([name, g]) => ({ name, ...g })).sort((a, b) => b.total - a.total)
                    return (
                      <React.Fragment key={w.week}>
                        <tr
                          onClick={() => toggleWeek(w.week)}
                          className={`border-b border-white/[0.06] transition cursor-pointer hover:bg-white/[0.03] ${isOpen ? "bg-[#D6B36A]/[0.06]" : ""}`}
                        >
                          <td className="px-4 py-3.5">
                            <div className="flex items-center gap-2.5">
                              <span className={`text-[#D6B36A] text-[11px] transition-transform ${isOpen ? "rotate-90" : ""}`}>▶</span>
                              <div>
                                <div className="font-semibold text-[#F5F1E8]">Week {w.week}</div>
                                <div className="text-[11px] text-zinc-500">{fmtDate(w.min)} – {fmtDate(w.max)}</div>
                              </div>
                            </div>
                          </td>
                          {CATS.map((c) => (
                            <td key={c.key} className="text-right px-3 py-3.5 text-zinc-300 tabular-nums">
                              {w.cats[c.key] || <span className="text-zinc-600">0</span>}
                            </td>
                          ))}
                          <td className="text-right px-4 py-3.5 font-bold text-[#D6B36A] tabular-nums">{w.total}</td>
                        </tr>
                        {isOpen && (
                          <tr>
                            <td colSpan={CATS.length + 2} className="p-0">
                              {/* Per-game split — indented card so it reads as a detail of the week above. */}
                              <div className="mx-4 mb-3 -mt-px rounded-b-xl border border-t-0 border-[#D6B36A]/20 bg-black/40 overflow-hidden">
                                <div className="px-4 pt-2.5 pb-1 text-[10px] uppercase tracking-[0.2em] text-zinc-500">
                                  Week {w.week} · per game
                                </div>
                                <table className="w-full text-[13px] table-fixed">
                                  <thead>
                                    <tr className="text-zinc-500">
                                      <th className="text-left font-medium px-4 py-1.5">Game</th>
                                      {CATS.map((c) => (
                                        <th key={c.key} className="text-right font-medium px-3 py-1.5 whitespace-nowrap">{c.label}</th>
                                      ))}
                                      <th className="text-right font-medium px-4 py-1.5">Total</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {games.map((g) => (
                                      <tr key={g.name} className="border-t border-white/[0.05]">
                                        <td className="py-2 px-4 text-[#F5F1E8] truncate" title={g.name}>{g.name}</td>
                                        {CATS.map((c) => (
                                          <td key={c.key} className="text-right py-2 px-3 text-zinc-400 tabular-nums">
                                            {g.cats[c.key] || <span className="text-zinc-700">·</span>}
                                          </td>
                                        ))}
                                        <td className="text-right py-2 px-4 font-semibold text-zinc-200 tabular-nums">{g.total}</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    )
                  })}
                  {!weekRows.length && (
                    <tr>
                      <td colSpan={CATS.length + 2} className="px-4 py-10 text-center text-zinc-600 text-sm">
                        No orders match the current filters.
                      </td>
                    </tr>
                  )}
                </tbody>
                {weekRows.length > 0 && (
                  <tfoot>
                    <tr className="border-t border-white/15 bg-white/[0.04]">
                      <td className="px-4 py-3 font-bold text-[#F5F1E8]">Total</td>
                      {CATS.map((c) => (
                        <td key={c.key} className="text-right px-3 py-3 font-semibold text-zinc-200 tabular-nums">{agg.perCat[c.key]}</td>
                      ))}
                      <td className="text-right px-4 py-3 font-bold text-[#D6B36A] tabular-nums">{agg.total}</td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>
          )}

          <p className="text-[11px] text-zinc-600 leading-relaxed mt-4">
            Videos = one per target language; orders = one per order — non-parent broadcast orders only.
            Weeks are assigned by deadline{view === "weekly" ? " — click a week to see its per-game split" : ""}.
            {data.generatedAt && <> · Updated {new Date(data.generatedAt).toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</>}
          </p>
        </>
      )}
    </div>
  )
}

/* ─────────────────────────  UI primitives  ───────────────────────── */

function Chip({ active, onClick, children, dot }: { active: boolean; onClick: () => void; children: React.ReactNode; dot?: string }) {
  return (
    <button
      onClick={onClick}
      className={`shrink-0 inline-flex items-center gap-1.5 h-[30px] px-3 rounded-lg text-[12px] font-semibold transition border ${
        active ? "bg-[#D6B36A] text-black border-[#D6B36A]" : "bg-white/[0.03] text-zinc-400 border-white/10 hover:text-white hover:border-white/25"
      }`}
    >
      {dot && <span className="w-2 h-2 rounded-full" style={{ background: active ? "#000" : dot }} />}
      {children}
    </button>
  )
}

function Tile({ label, value, sub, accent }: { label: string; value: React.ReactNode; sub?: string; accent?: boolean }) {
  return (
    <div className="bg-white/[0.03] border border-white/10 rounded-[20px] px-4 py-4">
      <div className="text-[11px] uppercase tracking-wider text-zinc-500">{label}</div>
      <div className={`text-2xl font-bold mt-1 tabular-nums ${accent ? "text-gear-gradient" : "text-[#F5F1E8]"}`}>{value}</div>
      {sub && <div className="text-[11px] text-zinc-600 mt-0.5">{sub}</div>}
    </div>
  )
}

function Card({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div className="bg-white/[0.03] border border-white/10 rounded-[24px] p-5">
      <div className="mb-4">
        <div className="text-[15px] font-semibold text-[#F5F1E8]">{title}</div>
        {subtitle && <div className="text-[12px] text-zinc-500">{subtitle}</div>}
      </div>
      {children}
    </div>
  )
}

function Legend({ items }: { items: { label: string; color: string }[] }) {
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1.5 mt-4">
      {items.map((it) => (
        <div key={it.label} className="flex items-center gap-1.5 text-[11px] text-zinc-400">
          <span className="w-2.5 h-2.5 rounded-sm" style={{ background: it.color }} />
          {it.label}
        </div>
      ))}
    </div>
  )
}

/** Category mix — a 100% composition bar + a clear labelled list with counts and %. */
function CategoryMix({ perCat, total }: { perCat: Record<string, number>; total: number }) {
  if (!total) return <div className="text-zinc-600 text-sm py-6 text-center">No data in this view</div>
  const rows = CATS.map((c) => ({ ...c, value: perCat[c.key] || 0, pct: (perCat[c.key] || 0) / total })).filter((r) => r.value > 0)
  return (
    <div>
      <div className="flex w-full h-3 rounded-full overflow-hidden mb-4">
        {rows.map((r) => (
          <div key={r.key} title={`${r.label}: ${r.value} (${Math.round(r.pct * 100)}%)`} style={{ width: `${r.pct * 100}%`, background: r.color }} />
        ))}
      </div>
      <div className="space-y-2.5">
        {rows.map((r) => (
          <div key={r.key} className="flex items-center gap-3">
            <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ background: r.color }} />
            <span className="w-[92px] shrink-0 text-[13px] text-zinc-300">{r.label}</span>
            <div className="flex-1 h-[16px] bg-white/[0.04] rounded-md overflow-hidden">
              <div className="h-full rounded-md" style={{ width: `${r.pct * 100}%`, background: r.color, opacity: 0.85 }} />
            </div>
            <span className="w-[38px] text-right text-[13px] text-zinc-200 tabular-nums">{r.value}</span>
            <span className="w-[42px] text-right text-[12px] text-zinc-500 tabular-nums">{Math.round(r.pct * 100)}%</span>
          </div>
        ))}
      </div>
    </div>
  )
}

/** Vertical stacked bar chart (weeks × categories). Pure CSS, responsive. */
function StackedBars({ weeks }: { weeks: { week: string; cats: Record<string, number>; total: number }[] }) {
  const max = Math.max(1, ...weeks.map((w) => w.total))
  if (!weeks.length) return <div className="text-zinc-600 text-sm py-8 text-center">No data in this view</div>
  return (
    <div className="flex items-end gap-2 sm:gap-3 h-[240px] overflow-x-auto pb-1">
      {weeks.map((w) => (
        <div key={w.week} className="flex-1 min-w-[42px] h-full flex flex-col items-center justify-end">
          <div className="text-[11px] text-zinc-400 font-semibold mb-1 tabular-nums">{w.total}</div>
          <div className="w-full max-w-[46px] rounded-t-md overflow-hidden flex flex-col-reverse" style={{ height: `${(w.total / max) * 100}%` }}>
            {CATS.map((c) => {
              const v = w.cats[c.key]
              if (!v) return null
              return <div key={c.key} title={`Week ${w.week} · ${c.label}: ${v}`} style={{ height: `${(v / w.total) * 100}%`, background: c.color }} />
            })}
          </div>
          <div className="text-[11px] text-zinc-500 mt-2">W{w.week}</div>
        </div>
      ))}
    </div>
  )
}

/** Horizontal bars, sorted, with value labels. `perItemColor` uses each item's own colour. */
function BarList({ items, color = "#D6B36A", perItemColor }: { items: { label: string; value: number; color?: string }[]; color?: string; perItemColor?: boolean }) {
  const max = Math.max(1, ...items.map((i) => i.value))
  if (!items.length) return <div className="text-zinc-600 text-sm py-6 text-center">No data in this view</div>
  return (
    <div className="space-y-2.5">
      {items.map((it) => (
        <div key={it.label} className="flex items-center gap-3">
          <div className="w-[130px] shrink-0 text-[12px] text-zinc-400 truncate text-right" title={it.label}>{it.label}</div>
          <div className="flex-1 h-[18px] bg-white/[0.04] rounded-md overflow-hidden">
            <div className="h-full rounded-md" style={{ width: `${(it.value / max) * 100}%`, background: perItemColor ? it.color : color, opacity: 0.85 }} />
          </div>
          <div className="w-[42px] text-[12px] text-zinc-300 tabular-nums text-right">{it.value}</div>
        </div>
      ))}
    </div>
  )
}

/** Marketing view — videos/orders per content title (no game/week). */
function MarketingView({ bars, totVideos, totOrders, titles, metric, generatedAt, view }: {
  bars: { label: string; value: number; videos: number; orders: number }[]
  totVideos: number
  totOrders: number
  titles: number
  metric: Metric
  generatedAt: string
  view: "main" | "weekly"
}) {
  const total = metric === "videos" ? totVideos : totOrders
  return (
    <>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        <Tile label="Total videos" value={totVideos} accent />
        <Tile label="Total orders" value={totOrders} />
        <Tile label="Content titles used" value={titles} />
        <Tile label={`Top title (${metric})`} value={bars[0]?.value ? bars[0].label : "—"} />
      </div>

      {view === "main" && (
        <Card title="Videos per content title" subtitle={`By ${metric} — top titles first`}>
          <BarList items={bars.filter((b) => b.value > 0)} color="#C6597A" />
        </Card>
      )}

      {view === "weekly" && (
        <Card title="All content titles" subtitle="Every title, including those with none">
          <div className="overflow-x-auto max-h-[520px] overflow-y-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="text-zinc-400 border-b border-white/10 sticky top-0 bg-[#0d0d0d]">
                  <th className="text-left font-semibold px-3 py-2.5">Content title</th>
                  <th className="text-right font-semibold px-3 py-2.5">Videos</th>
                  <th className="text-right font-semibold px-3 py-2.5">Orders</th>
                </tr>
              </thead>
              <tbody>
                {bars.map((b) => (
                  <tr key={b.label} className={`border-b border-white/[0.05] ${!b.videos && !b.orders ? "opacity-40" : ""}`}>
                    <td className="px-3 py-2 text-[#F5F1E8]">{b.label}</td>
                    <td className="px-3 py-2 text-right text-zinc-300 tabular-nums">{b.videos || <span className="text-zinc-600">0</span>}</td>
                    <td className="px-3 py-2 text-right text-zinc-400 tabular-nums">{b.orders || <span className="text-zinc-600">0</span>}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t border-white/15 bg-white/[0.04]">
                  <td className="px-3 py-2.5 font-bold text-[#F5F1E8]">Total</td>
                  <td className="px-3 py-2.5 text-right font-bold text-[#D6B36A] tabular-nums">{totVideos}</td>
                  <td className="px-3 py-2.5 text-right font-semibold text-zinc-200 tabular-nums">{totOrders}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </Card>
      )}

      <p className="text-[11px] text-zinc-600 leading-relaxed mt-4">
        Videos = one per target language; orders = one per order — non-parent marketing orders only. Grouping is by
        content title (marketing has no game/week). Showing {metric}: {total}.
        {generatedAt && <> · Updated {new Date(generatedAt).toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</>}
      </p>
    </>
  )
}
