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

  return (
    <div className="flex flex-wrap justify-center gap-3 pb-2 pt-1">
      {weeks.map((wk) => (
        <div
          key={wk.week}
          className="flex-1 min-w-[170px] max-w-[230px] bg-white/[0.03] border border-white/10 rounded-2xl p-2.5"
        >
          <div className="text-[11px] font-bold tracking-[0.18em] text-[#D6B36A] mb-2 px-1">
            WEEK {wk.week}
          </div>

          <div className="space-y-0.5">
            {wk.games.map((entry, i) => {
              const dbGame = resolve(entry)
              const label = entry.display ?? dbGame?.name ?? entry.game
              const active = !!dbGame && selectedGameFilter === dbGame.id

              return (
                <button
                  key={`${entry.game}-${i}`}
                  type="button"
                  disabled={!dbGame}
                  onClick={() => dbGame && setSelectedGameFilter(active ? "" : dbGame.id)}
                  title={label}
                  className={`
                    w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-left
                    transition-colors duration-150
                    ${
                      active
                        ? "bg-[#D6B36A]/15 ring-1 ring-[#D6B36A]"
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
                      active ? "text-[#D6B36A] font-semibold" : "text-zinc-200"
                    }`}
                  >
                    {label}
                  </span>
                </button>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}
