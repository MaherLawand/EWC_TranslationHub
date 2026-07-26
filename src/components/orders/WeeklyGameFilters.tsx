import { weeksForEvent } from "../../constants/weeklyGames"
import { useState } from "react";

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
const [showLanguages, setShowLanguages] = useState<Record<string, boolean>>({});
const gameLanguages: Record<string, string[]> = {
  "League of Legends": ["AR", "CN", "FR"],
  "Free Fire": ["EN"],
  "Dota 2": ["EN", "AR", "CN"],
  "Mobile Legends: MWI": ["EN", "AR"],
  "EA Sports FC 26": ["EN", "AR"],
  "Pubg Battlegrounds": ["EN", "AR", "CN"],
  "Mobile Legends: MSC": ["EN", "AR", "ID"],
  "Teamfight Tactics": ["EN", "CN"],
  "Overwatch 2": ["EN", "AR", "CN", "FR"],
  "Call of Duty: Warzone": ["EN", "AR", "FR"],
  "Street Fighter 6": ["EN", "CN", "FR"],
  "Honor of Kings": ["EN", "AR", "CN"],
  "Call of Duty: Black Ops 7": ["EN", "AR", "FR"],
  "Pubg Mobile": ["EN", "AR", "CN"],
  "Tekken 8": ["EN", "FR"],
  "Rainbow Six Siege": ["EN", "CN", "FR"],
  "Rocket League": ["EN", "AR", "FR"],
  "Chess": ["EN"],
  "Counter-Strike 2": ["EN", "AR", "CN", "FR"],
  "Fortnite": ["EN", "AR"],
  "Trackmania": ["EN", "AR"],
  "Crossfire": ["EN", "CN"],
  "Mobile Legends: Wildcard": ["EN"],
  "Valorant": ["EN", "AR", "CN", "FR"],
  "Apex Legends": ["EN", "AR", "CN", "FR"],
  "Fatal Fury": ["EN", "CN"],
}

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

  // Column count follows the CONTAINER's width, not the viewport's — so when the
  // detail sidebar opens (an overlay that shrinks this area without changing the
  // viewport), the week cards reflow to fewer columns and wrap, exactly the way
  // they do on a narrow screen. Fixed viewport breakpoints (md:grid-cols-8 etc.)
  // couldn't do this: they'd still render 8 columns into the shrunken space and
  // squeeze each game name into a one-letter-per-line stack.
  //
  // auto-fit: as many ~175px+ columns as fit, wrapping to new rows below that;
  // it collapses empty tracks so ENC (4 weeks) fills the row instead of leaving
  // trailing gaps, while EWC (8 weeks) still lands one clean row when wide.

  return (
    <div className="grid grid-cols-[repeat(auto-fit,minmax(175px,1fr))] gap-3 pb-2 pt-1">
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
  <div className="flex items-center gap-1">

    {/* Languages toggle */}
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation()
        setShowLanguages((prev) => ({
          ...prev,
          [wk.week]: !prev[wk.week],
        }))
      }}
      className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md border transition-colors ${
        showLanguages[wk.week]
          ? "gear-fill border-transparent"
          : "border-[#E89B3A]/40 bg-white/[0.04] hover:border-[#E89B3A]"
      }`}
      title={showLanguages[wk.week] ? "Hide languages" : "Show languages"}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="9"
        height="9"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={showLanguages[wk.week] ? "" : "text-[#E89B3A]"}
      >
        <path d="M5 8h14" />
        <path d="M8 5l-3 3 3 3" />
        <path d="M16 19l3-3-3-3" />
        <path d="M5 16h14" />
      </svg>

      <span
        className={`text-[12px] ${
          showLanguages[wk.week] ? "" : "text-gear-gradient"
        }`}
      >
        Lang
      </span>
    </button>


    {/* Orders */}
    <span
      className={`inline-flex items-center gap-1 text-[9px] font-bold tracking-wide px-1.5 py-0.5 rounded-md border transition-colors ${
        weekActive
          ? "gear-fill border-transparent"
          : "border-[#E89B3A]/40 group-hover/wk:border-[#E89B3A]"
      }`}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="9"
        height="9"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={weekActive ? "" : "text-[#E89B3A]"}
      >
        {weekActive ? (
          <polyline points="20 6 9 17 4 12" />
        ) : (
          <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
        )}
      </svg>

      <span className={`text-[12px] ${weekActive ? "" : "text-gear-gradient"}`}>
        Orders
      </span>
    </span>

  </div>
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

                <div className="flex-1 min-w-0">
  <div
    className={`text-[12px] leading-snug break-words whitespace-normal ${
      gameActive ? "text-[#1a0f06] font-semibold" : "text-zinc-200"
    }`}
  >
    {label}
  </div>

{showLanguages[wk.week] && gameLanguages[label] && (
  <div className="mt-1 flex flex-wrap gap-1">
    {gameLanguages[label].map((lang) => (
      <span
        key={lang}
        className="rounded-md px-1.5 py-0.5 text-[10px] font-bold leading-none border border-[#E89B3A]/40 bg-white/[0.04] text-gear-gradient"
      >
        {lang}
      </span>
    ))}
  </div>
)}
</div>
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
