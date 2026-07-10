import { weeksForEvent } from "../../constants/weeklyGames"

type Game = { id: string; name: string; logo?: string | null }

type Props = {
  event: string
  games: Game[]
  selectedGameFilter: string
  setSelectedGameFilter: (id: string) => void
}

// Normalize names so config entries match DB games regardless of punctuation,
// casing, or spacing (e.g. "Mobile Legends: MSC" === "Mobile Legends MSC").
const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "")

export default function WeeklyGameFilters({
  event,
  games,
  selectedGameFilter,
  setSelectedGameFilter,
}: Props) {
  const weeks = weeksForEvent(event)

  // Quick lookup of DB games by normalized name; resolve an entry by trying its
  // primary name then any aliases.
  const byName = new Map(games.map((g) => [norm(g.name), g]))
  const resolve = (entry: { game: string; aliases?: string[] }) => {
    for (const candidate of [entry.game, ...(entry.aliases ?? [])]) {
      const hit = byName.get(norm(candidate))
      if (hit) return hit
    }
    return undefined
  }

  // The filter value can be a single game id or a comma-joined list (a whole
  // week). Track the currently-selected ids so we can highlight games + weeks.
  const selectedIds = selectedGameFilter ? selectedGameFilter.split(",") : []
  const selectedSet = new Set(selectedIds)

  // Every resolvable DB game id for a week (deduped), used for whole-week select.
  const weekGameIds = (wk: { games: { game: string; aliases?: string[] }[] }) =>
    Array.from(new Set(wk.games.map(resolve).filter(Boolean).map((g) => (g as Game).id)))

  // A week is "active" when exactly its games are the current selection.
  const isWeekActive = (ids: string[]) =>
    ids.length > 0 && ids.length === selectedIds.length && ids.every((id) => selectedSet.has(id))

  // Fixed-column grid keeps rows balanced while cards fill their cells (no big
  // gaps): 1 col on phone, 2 on small, 4 on desktop. EWC (8 weeks) also goes to
  // 8 columns on very wide screens so it's one clean row instead of 4 wide cards;
  // ENC (4 weeks) caps at 4 columns to avoid empty trailing space.
  const gridCols =
    weeks.length > 4
      ? "grid-cols-1 sm:grid-cols-2 md:grid-cols-4 2xl:grid-cols-8"
      : "grid-cols-1 sm:grid-cols-2 md:grid-cols-4"

  return (
    <div className={`grid ${gridCols} gap-3 pb-2 pt-1`}>
      {weeks.map((wk) => {
        const wkIds = weekGameIds(wk)
        const weekActive = isWeekActive(wkIds)

        return (
        <div
          key={wk.week}
          className={`min-w-0 bg-white/[0.03] border rounded-2xl p-2.5 transition-colors ${
            weekActive ? "border-[#E89B3A]/60" : "border-white/10"
          }`}
        >
          {/* Clicking the header selects/deselects the whole week (all its games),
              so the tables + Topbar counts reflect that week's total workload.
              Styled as an obvious button (surface + hover + a pill) so it's clearly
              tappable, not just a label. Accents use the EWC gear gradient. */}
          <button
            type="button"
            disabled={wkIds.length === 0}
            onClick={() => setSelectedGameFilter(weekActive ? "" : wkIds.join(","))}
            title={wkIds.length ? `Filter all of Week ${wk.week}` : "No games this week"}
            className={`group/wk w-full flex items-center justify-between gap-2 mb-2.5 pl-2 pr-1.5 py-1.5 rounded-lg border transition-colors ${
              wkIds.length === 0
                ? "border-white/5 cursor-not-allowed opacity-60"
                : weekActive
                ? "border-[#E89B3A]/50 bg-[#E89B3A]/[0.07] cursor-pointer"
                : "border-white/10 bg-white/[0.04] hover:bg-[#E89B3A]/10 hover:border-[#E89B3A]/50 cursor-pointer"
            }`}
          >
            <span className="text-[11px] font-bold tracking-[0.18em] text-gear-gradient">
              WEEK {wk.week}
            </span>
            {wkIds.length > 0 && (
              <span
                className={`inline-flex items-center gap-1 text-[9px] font-bold tracking-wide px-1.5 py-0.5 rounded-md border transition-colors ${
                  weekActive
                    ? "gear-fill border-transparent"
                    : "border-[#E89B3A]/40 group-hover/wk:border-[#E89B3A]"
                }`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className={weekActive ? "" : "text-[#E89B3A]"}>
                  {weekActive ? (
                    <polyline points="20 6 9 17 4 12" />
                  ) : (
                    <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
                  )}
                </svg>
                <span className={weekActive ? "" : "text-gear-gradient"}>ALL</span>
              </span>
            )}
          </button>

          <div className="space-y-0.5">
            {wk.games.map((entry, i) => {
              const dbGame = resolve(entry)
              const label = entry.display ?? dbGame?.name ?? entry.game
              const active = !!dbGame && selectedSet.has(dbGame.id)
              // Only ring an individual game when IT is the single selection. When
              // the whole week is selected, the card border/header already show it,
              // so skip the per-game ring to avoid a busy, over-bright look.
              const gameActive = active && !weekActive
              // Clicking a game narrows to just that game; clicking it again when
              // it's the ONLY selection clears the filter.
              const isSole = !!dbGame && selectedIds.length === 1 && selectedIds[0] === dbGame.id

              return (
                <button
                  key={`${entry.game}-${i}`}
                  type="button"
                  disabled={!dbGame}
                  onClick={() => dbGame && setSelectedGameFilter(isSole ? "" : dbGame.id)}
                  title={label}
                  className={`
                    w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-left
                    transition-colors duration-150
                    ${
                      gameActive
                        ? "gear-fill"
                        : dbGame
                        ? "hover:bg-white/[0.06]"
                        : "opacity-40 cursor-not-allowed"
                    }
                  `}
                >
                  {dbGame?.logo ? (
                    <img
                      src={dbGame.logo}
                      alt={label}
                      className={`w-6 h-6 object-contain flex-shrink-0 ${
                        active ? "opacity-100" : "opacity-75"
                      }`}
                    />
                  ) : (
                    <span className="w-6 h-6 flex-shrink-0 rounded-md bg-white/5 border border-white/10 flex items-center justify-center text-[10px] text-zinc-500">
                      {label.slice(0, 1)}
                    </span>
                  )}

                  <span
                    className={`flex-1 min-w-0 text-[12px] leading-snug break-words whitespace-normal ${
                      gameActive ? "text-[#1a0f06] font-semibold" : "text-zinc-200"
                    }`}
                  >
                    {label}
                  </span>
                </button>
              )
            })}
          </div>
        </div>
        )
      })}
    </div>
  )
}
