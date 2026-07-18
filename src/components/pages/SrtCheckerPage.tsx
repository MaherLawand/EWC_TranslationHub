import React from "react"
import { toast } from "react-toastify"
import { EWC_WEEKS, ENC_WEEKS } from "../../constants/weeklyGames"

/**
 * SRT glossary checker — translators upload a subtitle file, pick its language,
 * review the suggested terminology fixes, and download a corrected copy.
 *
 * The corrected file keeps the original name with "_v2" appended. Timestamps are
 * guaranteed untouched: the server re-derives the file from the original bytes and
 * verifies every timing before returning it (see server/src/lib/srt.ts).
 */

const API = import.meta.env.VITE_API_URL

/** Matches the server's cap; checked here so an oversized file never leaves the browser. */
const MAX_SRT_CHARS = 400_000

type Language = { column: string; label: string }

/**
 * The games of both events, deduped — the same schedule that drives the
 * dashboard's game filter, so the two lists can't drift apart.
 *
 * `game` is the canonical name sent to the server, which maps it to a Liquipedia
 * wiki; `display` is what the schedule wants shown. Several Mobile Legends
 * competitions share a canonical name, so dedupe on the label actually rendered.
 */
const GAME_OPTIONS: { value: string; label: string }[] = (() => {
  const seen = new Set<string>()
  const out: { value: string; label: string }[] = []
  for (const week of [...EWC_WEEKS, ...ENC_WEEKS]) {
    for (const entry of week.games) {
      const label = entry.display ?? entry.game
      if (seen.has(label)) continue
      seen.add(label)
      out.push({ value: entry.game, label })
    }
  }
  return out.sort((a, b) => a.label.localeCompare(b.label))
})()

/**
 * "glossary"     — backed by an approved glossary row. Accepted by default.
 * "untranslated" — English with no glossary row covering it. The replacement is a
 *                  suggestion, not approved terminology, so it starts undecided
 *                  and the translator has to make the call.
 */
type SuggestionKind = "glossary" | "untranslated" | "name"

type Suggestion = {
  id: string
  kind: SuggestionKind
  cueIndex: number
  find: string
  replace: string
  glossaryKey: string
  sourceTerm: string
  approvedTerm: string
  context: string
  confidence: "high" | "medium"
  /** Glossary rows containing this term inside a longer phrase. */
  relatedRows?: { source: string; target: string }[]
}

type Cue = { index: number; start: string; end: string; text: string }

type Decision = "accepted" | "rejected" | undefined

const spinner = (
  <div className="w-4 h-4 border-2 border-zinc-600 border-t-transparent rounded-full animate-spin" />
)

/**
 * Render `line` with the first occurrence of `term` marked, so the reviewer can
 * see how the word was actually used before accepting a change.
 *
 * Plain string search on the exact text the server matched — no regex, so a term
 * containing regex metacharacters can't break the display.
 */
function highlight(line: string, term: string): React.ReactNode {
  const at = line.indexOf(term)
  if (at === -1 || !term) return line
  return (
    <>
      {line.slice(0, at)}
      <mark className="bg-[#E89B3A]/25 text-[#F0C070] rounded px-0.5">{term}</mark>
      {line.slice(at + term.length)}
    </>
  )
}

export default function SrtCheckerPage() {
  const fileInputRef = React.useRef<HTMLInputElement>(null)

  const [languages, setLanguages] = React.useState<Language[]>([])
  const [language, setLanguage] = React.useState("")
  const [game, setGame] = React.useState("")
  const [rosterNote, setRosterNote] = React.useState<string | null>(null)
  /** Liquipedia wiki path resolved by the server, used to link to source pages. */
  const [wiki, setWiki] = React.useState("")
  const [fileName, setFileName] = React.useState("")
  const [srtText, setSrtText] = React.useState("")

  const [isChecking, setIsChecking] = React.useState(false)
  const [progress, setProgress] = React.useState(0)
  const [progressLabel, setProgressLabel] = React.useState("")
  const [isExporting, setIsExporting] = React.useState(false)
  const [hasChecked, setHasChecked] = React.useState(false)

  const [cues, setCues] = React.useState<Cue[]>([])
  const [suggestions, setSuggestions] = React.useState<Suggestion[]>([])
  const [decisions, setDecisions] = React.useState<Record<string, Decision>>({})

  // Which target languages the glossary actually covers. Anything not listed
  // here has no approved terminology, so checking it would be meaningless.
  React.useEffect(() => {
    let cancelled = false
    fetch(`${API}/srt/languages`, { credentials: "include" })
      .then(async (r) => {
        if (!r.ok) {
          const body = await r.json().catch(() => ({}))
          // `detail` names the actual misconfiguration. Without it the toast just
          // says "temporarily unavailable", which is true of four different bugs.
          throw new Error(body.detail || body.message || "Failed to load languages")
        }
        return r.json()
      })
      .then((data) => {
        if (cancelled) return
        setLanguages(data.languages || [])
      })
      .catch((error) => {
        if (!cancelled) toast.error(error.message || "Could not load the glossary languages")
      })
    return () => {
      cancelled = true
    }
  }, [])

  const cueByIndex = React.useMemo(() => {
    const map = new Map<number, Cue>()
    for (const cue of cues) map.set(cue.index, cue)
    return map
  }, [cues])

  const acceptedCount = React.useMemo(
    () => Object.values(decisions).filter((d) => d === "accepted").length,
    [decisions]
  )

  function resetResults() {
    setHasChecked(false)
    setRosterNote(null)
    setWiki("")
    setCues([])
    setSuggestions([])
    setDecisions({})
  }

  /**
   * Drop the loaded file and everything derived from it.
   *
   * Also clears the input's own value: without that, re-picking the SAME file
   * after removing it fires no change event and the page looks stuck.
   */
  function clearFile() {
    setFileName("")
    setSrtText("")
    if (fileInputRef.current) fileInputRef.current.value = ""
    resetResults()
  }

  async function onPickFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    // Reset so picking the same file twice still fires onChange.
    event.target.value = ""
    if (!file) return

    // .txt is accepted because subtitle files are often handed over with the
    // extension changed; the CONTENT still has to parse as SRT, which the server
    // enforces and reports with a line number if it doesn't.
    if (!/\.(srt|txt)$/i.test(file.name)) {
      toast.error("Please choose a .srt or .txt subtitle file")
      return
    }

    const text = await file.text()
    if (text.length > MAX_SRT_CHARS) {
      toast.error("That subtitle file is too large to check")
      return
    }

    setFileName(file.name)
    setSrtText(text)
    resetResults()
  }

  /**
   * Drive the progress bar for the duration of a check.
   *
   * The server returns one response at the end rather than streaming, so this is
   * a MODELLED estimate, not live server telemetry. It is grounded in what the
   * server will actually do: cue count decides the number of model chunks, and a
   * game selection adds a Liquipedia roster fetch on a cold cache. It eases
   * towards 95% and only reaches 100% when the real response lands, so it can
   * never claim to be finished before it is.
   */
  function startProgress(cueCount: number, withRoster: boolean) {
    const chunks = Math.max(1, Math.ceil(cueCount / 120))
    const estimateMs = (withRoster ? 14_000 : 0) + 6_000 + chunks * 7_000
    const startedAt = Date.now()

    setProgress(0)
    setProgressLabel(withRoster ? "Loading rosters…" : "Reading the glossary…")

    const timer = window.setInterval(() => {
      const elapsed = Date.now() - startedAt
      // Approaches the ceiling without ever arriving, so a slow run keeps moving.
      const ratio = 1 - Math.exp(-elapsed / (estimateMs / 2.5))
      setProgress(Math.min(95, Math.round(ratio * 95)))

      if (withRoster && elapsed < 12_000) setProgressLabel("Loading rosters…")
      else if (elapsed < (withRoster ? 18_000 : 4_000)) setProgressLabel("Reading the glossary…")
      else setProgressLabel(`Checking terminology across ${cueCount} lines…`)
    }, 200)

    return () => window.clearInterval(timer)
  }

  async function runCheck() {
    if (!srtText || !language || isChecking) return
    setIsChecking(true)
    // Cue count from the file itself — one timestamp line per cue.
    const cueCount = (srtText.match(/-->/g) || []).length
    const stopProgress = startProgress(cueCount, Boolean(game))
    try {
      const response = await fetch(`${API}/srt/check`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ srtText, language, game }),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(data.message || "The check could not complete")

      // Be explicit when names were NOT verified, rather than letting a clean
      // result imply they were.
      setRosterNote(data.stats?.rosterNote ?? null)
      setWiki(data.stats?.wiki ?? "")

      setCues(data.cues || [])
      setSuggestions(data.suggestions || [])
      // Glossary fixes start accepted — the common case is agreeing with approved
      // terminology. Suggestions with no glossary backing start undecided: they
      // are the model's proposal, so nothing gets applied without a deliberate
      // click. Both remain individually changeable.
      const initial: Record<string, Decision> = {}
      for (const s of (data.suggestions || []) as Suggestion[]) {
        initial[s.id] = s.kind === "glossary" ? "accepted" : undefined
      }
      setDecisions(initial)
      setHasChecked(true)

      if ((data.suggestions || []).length === 0) {
        toast.success("No terminology issues found")
      }
    } catch (error: any) {
      toast.error(error.message || "The check could not complete")
    } finally {
      stopProgress()
      setProgress(100)
      setProgressLabel("")
      setIsChecking(false)
    }
  }

  async function downloadCorrected() {
    if (isExporting) return
    const accepted = suggestions.filter((s) => decisions[s.id] === "accepted")
    if (accepted.length === 0) return

    setIsExporting(true)
    try {
      const response = await fetch(`${API}/srt/export`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          srtText,
          edits: accepted.map((s) => ({ cueIndex: s.cueIndex, find: s.find, replace: s.replace })),
        }),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(data.message || "The corrected file could not be produced")

      // Same name as the original with _v2 before the extension, keeping whichever
      // extension was uploaded so a .txt round-trips as a .txt.
      const match = fileName.match(/^(.*?)(\.(?:srt|txt))?$/i)
      const base = match?.[1] || fileName
      const extension = (match?.[2] || ".srt").toLowerCase()
      const blob = new Blob([data.srtText], { type: "text/plain;charset=utf-8" })
      const url = URL.createObjectURL(blob)
      const anchor = document.createElement("a")
      anchor.href = url
      anchor.download = `${base}_v2${extension}`
      document.body.appendChild(anchor)
      anchor.click()
      document.body.removeChild(anchor)
      URL.revokeObjectURL(url)

      toast.success(`Downloaded with ${data.applied} correction${data.applied === 1 ? "" : "s"}`)
    } catch (error: any) {
      toast.error(error.message || "The corrected file could not be produced")
    } finally {
      setIsExporting(false)
    }
  }

  function setAll(decision: Decision) {
    const next: Record<string, Decision> = {}
    for (const s of suggestions) next[s.id] = decision
    setDecisions(next)
  }

  return (
    <div className="p-4 sm:p-8 max-w-[1100px] mx-auto">
      {/* HEADER */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gear-gradient">SRT Checker</h1>
        <p className="text-zinc-500 text-sm mt-1">
          Check a subtitle file against the approved terminology glossary. Timings are never modified.
        </p>
      </div>

      {/* UPLOAD + LANGUAGE */}
      <div className="bg-white/[0.04] border border-white/10 rounded-[24px] p-6 mb-6">
        <div className="grid gap-4 sm:grid-cols-2">
          {/* File */}
          <div>
            <label className="text-xs font-medium text-zinc-400 mb-2 block tracking-wide">
              Subtitle file <span className="text-red-400">*</span>
            </label>
            <input
              ref={fileInputRef}
              type="file"
              accept=".srt,.txt,text/plain"
              onChange={onPickFile}
              className="hidden"
            />
            {/* The picker and the clear control are siblings, not nested — a
                button inside a button is invalid and swallows the inner click. */}
            <div className="flex items-stretch gap-2">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isChecking}
                className="flex-1 min-w-0 flex items-center gap-3 px-4 py-3 rounded-2xl border border-white/20 bg-white/10 text-left hover:border-[#D6B36A] transition disabled:opacity-50 disabled:cursor-not-allowed"
                title={fileName ? "Choose a different file" : "Choose a file"}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-[#D6B36A] flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M7 16a4 4 0 01-.88-7.9A5 5 0 1115.9 6H16a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                <span className={fileName ? "text-white truncate" : "text-white/50"}>
                  {fileName || "Choose a .srt or .txt file"}
                </span>
              </button>

              {fileName && (
                <button
                  type="button"
                  onClick={clearFile}
                  disabled={isChecking}
                  aria-label="Remove file"
                  title="Remove file"
                  className="px-3 rounded-2xl border border-white/20 bg-white/5 text-zinc-400 hover:text-white hover:border-red-400/60 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
          </div>

          {/* Language */}
          <div>
            <label className="text-xs font-medium text-zinc-400 mb-2 block tracking-wide">
              Subtitle language <span className="text-red-400">*</span>
            </label>
            {/* Solid background + appearance-none, matching the order tables.
                A translucent bg leaks into the native options popup on Windows,
                where it renders as white-on-white. */}
            <div className="relative">
              <select
                value={language}
                onChange={(e) => {
                  setLanguage(e.target.value)
                  resetResults()
                }}
                className="w-full h-[50px] appearance-none bg-[#0E0E0E] border border-[#2A2A2A] rounded-2xl px-4 pr-9 text-[#F5F1E8] outline-none transition hover:border-[#3A3A3A] focus:border-[#D6B36A] cursor-pointer"
              >
                <option value="">Select the language of this file</option>
                {languages.map((l) => (
                  <option key={l.column} value={l.label}>
                    {l.label}
                  </option>
                ))}
              </select>
              <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 text-[9px]">
                ▼
              </div>
            </div>
            <p className="text-[11px] text-zinc-600 mt-1.5">
              Only languages covered by the glossary are listed.
            </p>
          </div>
        </div>

        {/* Game — optional, enables player/team name checking */}
        <div className="mt-4">
          <label className="text-xs font-medium text-zinc-400 mb-2 block tracking-wide">
            Game <span className="text-zinc-600 font-normal">(optional)</span>
          </label>
          <div className="relative">
            <select
              value={game}
              onChange={(e) => {
                setGame(e.target.value)
                resetResults()
              }}
              className="w-full h-[50px] appearance-none bg-[#0E0E0E] border border-[#2A2A2A] rounded-2xl px-4 pr-9 text-[#F5F1E8] outline-none transition hover:border-[#3A3A3A] focus:border-[#D6B36A] cursor-pointer"
            >
              <option value="">No game — skip name checking</option>
              {GAME_OPTIONS.map((g) => (
                <option key={g.label} value={g.value}>
                  {g.label}
                </option>
              ))}
            </select>
            <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 text-[9px]">
              ▼
            </div>
          </div>
          <p className="text-[11px] text-zinc-600 mt-1.5">
            Checks player and team spellings against{" "}
            <a
              href="https://liquipedia.net"
              target="_blank"
              rel="noreferrer noopener"
              className="text-zinc-500 hover:text-[#D6B36A] underline underline-offset-2"
            >
              Liquipedia
            </a>
            . Spelling only — pronunciation can&apos;t be checked from a text file.
          </p>
        </div>

        <button
          type="button"
          disabled={!srtText || !language || isChecking}
          onClick={runCheck}
          className={`mt-5 w-full py-3.5 rounded-2xl font-semibold transition flex items-center justify-center gap-3 ${
            !srtText || !language || isChecking
              ? "bg-white/10 text-zinc-500 cursor-not-allowed"
              : "gear-fill"
          }`}
        >
          {isChecking && spinner}
          {isChecking ? `Checking… ${progress}%` : "Check terminology"}
        </button>

        {isChecking && (
          <div className="mt-3">
            <div
              className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden"
              role="progressbar"
              aria-valuenow={progress}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label="Terminology check progress"
            >
              <div
                className="h-full gear-fill rounded-full transition-[width] duration-300 ease-out"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-[11px] text-zinc-500 mt-1.5">{progressLabel}</p>
          </div>
        )}
      </div>

      {/* Names could not be verified — say so rather than implying they were. */}
      {hasChecked && rosterNote && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl px-4 py-3 mb-4">
          <p className="text-[12px] text-amber-300">{rosterNote}</p>
        </div>
      )}

      {/* RESULTS */}
      {hasChecked && suggestions.length === 0 && (
        <div className="bg-white/[0.04] border border-green-500/25 rounded-[24px] p-8 text-center">
          <p className="text-green-400 font-semibold text-lg">No terminology issues found</p>
          <p className="text-zinc-500 text-sm mt-1">
            Every glossary term matches the approved translation, and no untranslated
            English was found.
          </p>
        </div>
      )}

      {hasChecked && suggestions.length > 0 && (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
            <p className="text-sm text-zinc-400">
              <span className="text-white font-semibold">{suggestions.length}</span>{" "}
              suggestion{suggestions.length === 1 ? "" : "s"} &middot;{" "}
              <span className="text-white font-semibold">{acceptedCount}</span> accepted
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setAll("accepted")}
                className="px-3 py-1.5 rounded-lg text-xs font-medium border border-white/20 text-zinc-300 hover:border-[#D6B36A]/60 hover:text-white transition"
              >
                Accept all
              </button>
              <button
                type="button"
                onClick={() => setAll("rejected")}
                className="px-3 py-1.5 rounded-lg text-xs font-medium border border-white/20 text-zinc-300 hover:border-[#D6B36A]/60 hover:text-white transition"
              >
                Reject all
              </button>
            </div>
          </div>

          <div className="space-y-3">
            {suggestions.map((s) => {
              const cue = cueByIndex.get(s.cueIndex)
              const decision = decisions[s.id]
              return (
                <div
                  key={s.id}
                  className={`bg-[#111111] border rounded-2xl p-4 transition-colors ${
                    decision === "accepted"
                      ? "border-[#E89B3A]/50"
                      : decision === "rejected"
                      ? "border-white/5 opacity-60"
                      : "border-[#242424]"
                  }`}
                >
                  {/* Cue + locked timing */}
                  <div className="flex items-center gap-2 mb-2.5 text-[11px]">
                    <span className="text-zinc-500 font-semibold">Line {s.cueIndex}</span>
                    <span className="inline-flex items-center gap-1 text-zinc-600">
                      <svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                      </svg>
                      {cue ? `${cue.start} --> ${cue.end}` : "timing unchanged"}
                    </span>
                    <span className="ml-auto flex items-center gap-1.5">
                      {s.kind === "name" ? (
                        <span className="text-[10px] px-1.5 py-0.5 rounded border border-violet-500/40 text-violet-400">
                          name spelling
                        </span>
                      ) : s.kind === "untranslated" ? (
                        <span className="text-[10px] px-1.5 py-0.5 rounded border border-sky-500/40 text-sky-400">
                          {s.relatedRows && s.relatedRows.length > 0
                            ? "no standalone rule"
                            : "not in glossary"}
                        </span>
                      ) : (
                        <span className="text-[10px] px-1.5 py-0.5 rounded border border-[#D6B36A]/40 text-[#D6B36A]">
                          approved term
                        </span>
                      )}
                      {s.confidence === "medium" && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded border border-amber-500/40 text-amber-400">
                          worth a look
                        </span>
                      )}
                    </span>
                  </div>

                  {/* The change.
                      dir="ltr" on the row keeps "old → new" in that visual order,
                      and isolate stops each Arabic run from reordering around the
                      arrow — without it, an Arabic-to-Arabic fix reads backwards. */}
                  <div dir="ltr" className="text-sm leading-relaxed mb-2 flex items-center flex-wrap gap-x-2">
                    <span
                      dir="auto"
                      style={{ unicodeBidi: "isolate" }}
                      className="line-through text-red-400/90"
                    >
                      {s.find}
                    </span>
                    <span className="text-zinc-600">&rarr;</span>
                    <span
                      dir="auto"
                      style={{ unicodeBidi: "isolate" }}
                      className="text-green-400 font-semibold"
                    >
                      {s.replace}
                    </span>
                  </div>

                  {/* The line it appears in, so the term can be judged in context.
                      dir="auto" lets the browser pick RTL for Arabic lines. */}
                  {cue && (
                    <p
                      dir="auto"
                      className="text-[12px] text-zinc-500 bg-black/30 border border-white/5 rounded-lg px-3 py-2 mb-2.5 leading-relaxed whitespace-pre-wrap"
                    >
                      {highlight(cue.text, s.find)}
                    </p>
                  )}

                  {/* Why */}
                  {s.kind === "name" ? (
                    <p className="text-[11px] text-violet-400/70 mb-3">
                      {s.context}
                      {wiki && (
                        <>
                          {" "}&middot;{" "}
                          <a
                            href={`https://liquipedia.net/${wiki}/${encodeURIComponent(
                              s.replace.replace(/ /g, "_")
                            )}`}
                            target="_blank"
                            rel="noreferrer noopener"
                            className="underline underline-offset-2 hover:text-violet-300"
                          >
                            view on Liquipedia
                          </a>
                        </>
                      )}
                    </p>
                  ) : s.kind === "glossary" ? (
                    <p className="text-[11px] text-zinc-500 mb-3">
                      Glossary: <span className="text-zinc-400">{s.sourceTerm}</span> &rarr;{" "}
                      <span className="text-zinc-400">{s.approvedTerm}</span>
                      {s.context ? <span className="text-zinc-600"> &middot; {s.context}</span> : null}
                    </p>
                  ) : (
                    <div className="mb-3">
                      <p className="text-[11px] text-sky-400/70">
                        English left in the file.{" "}
                        {s.relatedRows && s.relatedRows.length > 0
                          ? "No glossary row defines it on its own, but it appears in these approved entries — the translation above follows them:"
                          : "No glossary rule covers this — the translation above is a suggestion, so check it before accepting."}
                      </p>
                      {s.relatedRows && s.relatedRows.length > 0 && (
                        <ul className="mt-1.5 space-y-0.5">
                          {s.relatedRows.map((r) => (
                            <li key={`${r.source}-${r.target}`} className="text-[11px] text-zinc-500">
                              <span className="text-zinc-400">{r.source}</span>
                              <span className="text-zinc-600"> &rarr; </span>
                              <span className="text-zinc-400">{r.target}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )}

                  {/* Decision */}
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setDecisions((d) => ({ ...d, [s.id]: "accepted" }))}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition ${
                        decision === "accepted"
                          ? "gear-fill border-transparent"
                          : "border-white/20 text-zinc-300 hover:border-[#E89B3A]/60"
                      }`}
                    >
                      Accept
                    </button>
                    <button
                      type="button"
                      onClick={() => setDecisions((d) => ({ ...d, [s.id]: "rejected" }))}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition ${
                        decision === "rejected"
                          ? "bg-white/10 border-white/30 text-white"
                          : "border-white/20 text-zinc-300 hover:border-white/40"
                      }`}
                    >
                      Reject
                    </button>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Export */}
          <button
            type="button"
            disabled={acceptedCount === 0 || isExporting}
            onClick={downloadCorrected}
            className={`mt-5 w-full py-3.5 rounded-2xl font-semibold transition flex items-center justify-center gap-3 ${
              acceptedCount === 0 || isExporting
                ? "bg-white/10 text-zinc-500 cursor-not-allowed"
                : "gear-fill"
            }`}
          >
            {isExporting && spinner}
            {isExporting
              ? "Preparing file..."
              : `Download corrected .srt (${acceptedCount} change${acceptedCount === 1 ? "" : "s"})`}
          </button>
        </>
      )}

      {/* Liquipedia content is CC-BY-SA 3.0; their API terms require attribution
          wherever it is displayed. */}
      {game && (
        <p className="text-[11px] text-zinc-600 mt-6 text-center">
          Player and team names from{" "}
          <a
            href="https://liquipedia.net"
            target="_blank"
            rel="noreferrer noopener"
            className="hover:text-zinc-400 underline underline-offset-2"
          >
            Liquipedia
          </a>
          , available under{" "}
          <a
            href="https://creativecommons.org/licenses/by-sa/3.0/"
            target="_blank"
            rel="noreferrer noopener"
            className="hover:text-zinc-400 underline underline-offset-2"
          >
            CC-BY-SA 3.0
          </a>
          .
        </p>
      )}
    </div>
  )
}
