// Helpers for marketing deadlines that may carry a time-of-day.
//
// Timezone model (Option A): the deadline is stored as an absolute instant. A
// timed deadline is entered in the setter's local timezone and combined into a
// real instant; it is then displayed converted to EACH viewer's local timezone,
// always with the zone abbreviation so it's unambiguous. Date-only deadlines are
// stored at UTC midnight and shown without a time.

const pad = (n: number) => String(n).padStart(2, "0")

// Split a stored deadline (+hasTime flag) into the form's date + time fields.
// Date-only: keep the stored calendar date string as-is.
// Timed: derive the viewer's LOCAL date + time so the pickers show local values.
export function deadlineToFormParts(
  deadlineDate: string | null | undefined,
  hasTime: boolean | undefined
): { date: string; time: string } {
  if (!deadlineDate) return { date: "", time: "" }
  if (!hasTime) return { date: String(deadlineDate).split("T")[0], time: "" }
  const d = new Date(deadlineDate)
  return {
    date: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`,
    time: `${pad(d.getHours())}:${pad(d.getMinutes())}`,
  }
}

// Combine the form's date "YYYY-MM-DD" + optional time "HH:mm" into the value
// sent to the server: a full LOCAL ISO instant when a time is set (so the
// setter's timezone is captured), otherwise the bare date string (date-only).
export function formPartsToDeadline(date: string, time: string): string {
  if (!date) return ""
  if (!time) return date
  const [y, m, d] = date.split("-").map(Number)
  const [hh, mm] = time.split(":").map(Number)
  if (!y || !m || !d || Number.isNaN(hh) || Number.isNaN(mm)) return date
  return new Date(y, m - 1, d, hh, mm).toISOString()
}

// Build 15-min "HH:mm" options for the (searchable) time dropdown. When
// `deadlineDate` (YYYY-MM-DD) is today, times already in the past are omitted
// entirely so only valid future times appear.
export function buildTimeOptions(
  deadlineDate: string | null | undefined
): { value: string; label: string }[] {
  let minMinutes = -1
  if (deadlineDate) {
    const [y, m, d] = String(deadlineDate).split("-").map(Number)
    const t = new Date()
    if (y === t.getFullYear() && m - 1 === t.getMonth() && d === t.getDate()) {
      minMinutes = t.getHours() * 60 + t.getMinutes()
    }
  }
  const opts: { value: string; label: string }[] = []
  for (let mins = 0; mins < 24 * 60; mins += 15) {
    if (mins < minMinutes) continue
    const label = `${pad(Math.floor(mins / 60))}:${pad(mins % 60)}`
    opts.push({ value: label, label })
  }
  return opts
}

// Format a deadline for display in the viewer's local timezone. Timed deadlines
// include the time + timezone abbreviation (e.g. "6/26/2026, 5:00 PM GMT+2").
export function formatDeadline(
  deadlineDate: string,
  hasTime: boolean | undefined
): string {
  const d = new Date(deadlineDate)
  if (hasTime) {
    return d.toLocaleString(undefined, {
      year: "numeric",
      month: "numeric",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      timeZoneName: "short",
    })
  }
  return d.toLocaleDateString()
}
