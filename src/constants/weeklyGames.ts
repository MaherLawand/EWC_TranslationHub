// Weekly game schedule for the games filter, grouped by event week.
//
// Each entry resolves to a real DB game by matching `game` OR any of `aliases`
// against DB game names, case/punctuation-insensitively (so "Rainbow Six Siege"
// also matches a DB "R6 Siege"). `display` overrides the shown label. The same
// game across weeks resolves to the same DB id, so selecting one instance
// highlights/filters all of them together.

export type WeekGameEntry = {
  game: string
  display?: string
  aliases?: string[]
}

export type EventWeek = {
  week: string
  games: WeekGameEntry[]
}

// Reusable game references (aliases cover likely DB name variants).
const valorant: WeekGameEntry = { game: "Valorant" }
const fatalFury: WeekGameEntry = { game: "Fatal Fury" }
const apex: WeekGameEntry = { game: "Apex Legends" }
const dota: WeekGameEntry = { game: "Dota 2" }
const lol: WeekGameEntry = { game: "League of Legends" }
const freeFire: WeekGameEntry = { game: "Free Fire" }
const eafc: WeekGameEntry = { game: "EA Sports FC 26", aliases: ["EAFC 26", "EA FC 26", "EA Sports FC"] }
const pubg: WeekGameEntry = { game: "Pubg Battlegrounds", aliases: ["PUBG", "PUBG Battlegrounds"] }
const pubgMobile: WeekGameEntry = { game: "Pubg Mobile", aliases: ["PUBG Mobile", "PUBG: Mobile"] }
const tft: WeekGameEntry = { game: "Teamfight Tactics", aliases: ["TFT"] }
const sf6: WeekGameEntry = { game: "Street Fighter 6" }
const overwatch: WeekGameEntry = { game: "Overwatch 2", aliases: ["Overwatch"] }
const hok: WeekGameEntry = { game: "Honor of Kings" }
const tekken: WeekGameEntry = { game: "Tekken 8" }
const chess: WeekGameEntry = { game: "Chess", aliases: ["Chess.com"] }
const rocketLeague: WeekGameEntry = { game: "Rocket League" }
const cs2: WeekGameEntry = { game: "Counter-Strike 2", aliases: ["CS2", "Counter Strike 2", "Counterstrike 2"] }
const fortnite: WeekGameEntry = { game: "Fortnite" }
const trackmania: WeekGameEntry = { game: "Trackmania", aliases: ["TrackMania"] }
const crossfire: WeekGameEntry = { game: "Crossfire", aliases: ["CrossFire"] }

const codWarzone: WeekGameEntry = {
  game: "Call of Duty: Warzone Resurgence",
  display: "Call of Duty: Warzone",
  aliases: ["Call of Duty: Warzone", "COD Warzone", "Cod Warzone", "Warzone", "Warzone Resurgence"],
}
const codBo7: WeekGameEntry = {
  game: "Call of Duty: Black Ops 7",
  aliases: ["COD BO7", "Cod BO7", "Black Ops 7", "Call of Duty Black Ops 7"],
}
const r6: WeekGameEntry = {
  game: "R6 Siege",
  display: "Rainbow Six Siege",
  aliases: ["Rainbow Six Siege", "Rainbow 6 Siege", "Rainbow Six", "R6", "RainbowSix"],
}

// Mobile Legends variants — separate competitions, possibly distinct DB games.
const mlWildcard: WeekGameEntry = {
  game: "Mobile Legends: Bang Bang",
  display: "Mobile Legends: Wildcard",
  aliases: ["Mobile Legends Bang Bang", "MLBB", "Mobile Legends", "Mobile Legends: Wildcard", "Mobile Legends Wildcard", "MLBB Wildcard"],
}
const mlbb: WeekGameEntry = {
  game: "Mobile Legends: Bang Bang",
  display: "Mobile Legends",
  // Resolve to the same DB game as the EWC Wildcard entry, so it shares its logo.
  aliases: ["Mobile Legends Bang Bang", "MLBB", "Mobile Legends", "Mobile Legends: Wildcard", "Mobile Legends Wildcard", "MLBB Wildcard"],
}
const mlMwi: WeekGameEntry = {
  game: "Mobile Legends Women's International",
  display: "Mobile Legends: MWI",
  aliases: ["Mobile Legends: MWI", "Mobile Legends MWI", "MLBB MWI", "Mobile Legends Womens International", "Mobile Legends: Women's International"],
}
const mlMsc: WeekGameEntry = {
  game: "Mobile Legends: MSC",
  display: "Mobile Legends: MSC",
  aliases: ["Mobile Legends MSC", "MLBB MSC"],
}

export const EWC_WEEKS: EventWeek[] = [
  { week: "0", games: [mlWildcard, valorant] },
  { week: "1", games: [valorant, apex, dota, fatalFury] },
  { week: "2", games: [lol, freeFire, dota, mlMwi] },
  { week: "3", games: [eafc, pubg, tft, mlMsc] },
  { week: "4", games: [overwatch, codWarzone, mlMsc, sf6, hok] },
  { week: "5", games: [codBo7, pubgMobile, hok, tekken, r6] },
  { week: "6", games: [rocketLeague, pubgMobile, chess, r6, cs2] },
  { week: "7", games: [cs2, fortnite, trackmania, crossfire] },
]

export const ENC_WEEKS: EventWeek[] = [
  { week: "1", games: [rocketLeague, pubgMobile, dota, chess, valorant] },
  { week: "2", games: [valorant, pubg, cs2, fatalFury] },
  { week: "3", games: [eafc, trackmania, r6, sf6, lol] },
  { week: "4", games: [lol, apex, mlbb, hok] },
]

export function weeksForEvent(event: string): EventWeek[] {
  return event === "ENC" ? ENC_WEEKS : EWC_WEEKS
}
