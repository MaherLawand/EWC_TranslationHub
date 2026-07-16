// Broadcast content categories + their target turnaround (informational).
// The `hours` label is how long each type should take.
export type ContentCategory =
  | "RAW"
  | "OPENER"
  | "HYPE_PROMO"
  | "ENGAGEMENT"
  | "LONG_FORM"
  | "EXPLAINER"

// `hours` is the display label; `hoursNum` is the number of hours used to
// auto-calculate a deadline time from when the source file is added.
export const CONTENT_CATEGORIES: { value: ContentCategory; label: string; hours: string; hoursNum: number }[] = [
  { value: "RAW", label: "Raw", hours: "ASAP", hoursNum: 2 }, // ASAP = a 2h turnaround window

  { value: "OPENER", label: "Opener", hours: "2h", hoursNum: 2 },
  { value: "HYPE_PROMO", label: "Hype Promo", hours: "4h", hoursNum: 4 },
  { value: "ENGAGEMENT", label: "Engagement", hours: "5h", hoursNum: 5 },
  { value: "LONG_FORM", label: "Long Form", hours: "8h", hoursNum: 8 },
  { value: "EXPLAINER", label: "Explainer", hours: "12h", hoursNum: 12 },
]

const BY_VALUE = new Map(CONTENT_CATEGORIES.map((c) => [c.value, c]))

export function contentCategoryLabel(value?: string | null): string {
  return value ? BY_VALUE.get(value as ContentCategory)?.label ?? value : ""
}
export function contentCategoryHours(value?: string | null): string {
  return value ? BY_VALUE.get(value as ContentCategory)?.hours ?? "" : ""
}
export function contentCategoryHoursNum(value?: string | null): number | null {
  if (!value) return null
  const c = BY_VALUE.get(value as ContentCategory)
  return c ? c.hoursNum : null
}

// Deadline time auto-computed from NOW + the category's hours, rounded to the
// nearest 5 minutes. Returns { date, time } in the setter's local timezone.
// Used when a source file is added: e.g. source added 11:00 + Hype Promo (4h)
// → 15:00; 11:12 rounds to 11:10 → 15:10.
export function autoDeadlineFromNow(value?: string | null): { date: string; time: string } | null {
  const hours = contentCategoryHoursNum(value)
  if (hours === null) return null
  const d = new Date()
  d.setMinutes(d.getMinutes() + Math.round(hours * 60)) // add the category's window
  d.setMinutes(Math.round(d.getMinutes() / 5) * 5, 0, 0) // nearest 5 min (60 rolls over cleanly)
  const p = (n: number) => String(n).padStart(2, "0")
  return {
    date: `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`,
    time: `${p(d.getHours())}:${p(d.getMinutes())}`,
  }
}
