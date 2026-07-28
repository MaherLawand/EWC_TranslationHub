import React from "react"
import { toast } from "react-toastify"
import { EWC_WEEKS, ENC_WEEKS } from "../../constants/weeklyGames"
import EnReferencePanel from "./EnReferencePanel"
import SrtQcPanel from "./SrtQcPanel"

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
  /** True when this wording came from the team's own past correction. */
  learned?: boolean
  /** Which glossary a glossary-kind term came from. */
  glossarySource?: "main" | "priority" | null
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
/**
 * Languages written right-to-left.
 *
 * The subtitle language decides the direction of the whole line, not the first
 * character in it. `dir="auto"` picks direction from the first strong character,
 * so an Arabic line opening with an English term ("Rampage حقق") renders
 * left-to-right and reads wrongly. Setting the direction explicitly is the same
 * thing as pressing Ctrl+Right-Shift in a text editor.
 */
const RTL_LANGUAGES = new Set(["arabic", "hebrew", "persian", "farsi", "urdu"])

function isRtlLanguage(language: string): boolean {
  return RTL_LANGUAGES.has(language.trim().toLowerCase())
}

/**
 * The line as it will read once this change is applied.
 *
 * Mirrors the server's applyEdits(): plain first-occurrence replacement, so what
 * is previewed is what gets written.
 */
/** "HH:MM:SS,mmm" (or ".mmm") → milliseconds. Returns NaN if unparseable. */
function tsToMs(t: string): number {
  const m = /(\d{1,2}):(\d{2}):(\d{2})[,.](\d{1,3})/.exec(t || "")
  if (!m) return NaN
  return (+m[1]) * 3600000 + (+m[2]) * 60000 + (+m[3]) * 1000 + Number(m[4].padEnd(3, "0"))
}

function applyToLine(line: string, find: string, replace: string): string {
  const at = line.indexOf(find)
  if (at === -1) return line
  return line.slice(0, at) + replace + line.slice(at + find.length)
}

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

/**
 * The last check, kept alive while the tab is open.
 *
 * The dashboard swaps pages by unmounting, so navigating to Orders and back would
 * otherwise throw away a review in progress — including any edits already made.
 *
 * Deliberately module scope rather than sessionStorage: it survives navigation but
 * NOT a refresh, which is the behaviour asked for. It also keeps a 400k-character
 * subtitle file out of browser storage, and avoids restoring a stale review from
 * some earlier session.
 */
type CheckerSession = {
  fileName: string
  srtText: string
  language: string
  game: string
  wiki: string
  rosterNote: string | null
  hasChecked: boolean
  cues: Cue[]
  suggestions: Suggestion[]
  decisions: Record<string, Decision>
  customReplacements: Record<string, string>
  lineEdits: Record<number, string>
}

let savedSession: CheckerSession | null = null

export default function SrtCheckerPage() {
  const [tab, setTab] = React.useState<"checker" | "qc">("checker")
  // EN→AR/FR reference matches, shown inline next to each corrected-file line.
  // The English source and the corrected (target) file can have DIFFERENT line
  // counts, so we can't line them up by index — we align by TIMESTAMP overlap,
  // which holds because both are the same video.
  const [refMatches, setRefMatches] = React.useState<
    {
      cueIndex: number
      term: string
      translation: string
      start: string
      end: string
      arCueIndex?: number | null
    }[]
  >([])
  const fileInputRef = React.useRef<HTMLInputElement>(null)

  const [languages, setLanguages] = React.useState<Language[]>([])
  const [language, setLanguage] = React.useState(savedSession?.language ?? "")
  const [game, setGame] = React.useState(savedSession?.game ?? "")
  const [rosterNote, setRosterNote] = React.useState<string | null>(savedSession?.rosterNote ?? null)
  /** Liquipedia wiki path resolved by the server, used to link to source pages. */
  const [wiki, setWiki] = React.useState(savedSession?.wiki ?? "")
  const [fileName, setFileName] = React.useState(savedSession?.fileName ?? "")
  const [srtText, setSrtText] = React.useState(savedSession?.srtText ?? "")

  const [isChecking, setIsChecking] = React.useState(false)
  const [progress, setProgress] = React.useState(0)
  const [progressLabel, setProgressLabel] = React.useState("")
  const [isExporting, setIsExporting] = React.useState(false)
  const [hasChecked, setHasChecked] = React.useState(savedSession?.hasChecked ?? false)

  const [cues, setCues] = React.useState<Cue[]>(savedSession?.cues ?? [])
  const [suggestions, setSuggestions] = React.useState<Suggestion[]>(savedSession?.suggestions ?? [])
  const [decisions, setDecisions] = React.useState<Record<string, Decision>>(savedSession?.decisions ?? {})
  /**
   * Replacements the translator has rewritten, keyed by suggestion id.
   *
   * The checker proposes; the translator decides the wording. An edited value is
   * what gets applied on export, so a suggestion that is nearly right no longer
   * has to be rejected and fixed by hand afterwards.
   */
  const [customReplacements, setCustomReplacements] = React.useState<Record<string, string>>(
    savedSession?.customReplacements ?? {}
  )
  const [editingId, setEditingId] = React.useState<string | null>(null)
  const [draft, setDraft] = React.useState("")

  /**
   * Whole lines the translator has rewritten, keyed by cue index.
   *
   * Editing the replacement term covers most cases, but sometimes the rest of the
   * sentence needs to move with it — agreement, word order, a stray connector.
   * A line edit replaces that cue's entire text and takes precedence over any
   * term-level edits in the same cue, so the two can never fight each other.
   */
  const [lineEdits, setLineEdits] = React.useState<Record<number, string>>(
    savedSession?.lineEdits ?? {}
  )
  const [editingLine, setEditingLine] = React.useState<number | null>(null)
  const [lineDraft, setLineDraft] = React.useState("")

  // Free editing of a line straight in the Corrected file panel. Separate from
  // the review-panel line rewrite above so editing here never flips a suggestion
  // card into edit mode. Writes to the same `lineEdits` override, which the
  // download already honours — and, being a whole-line edit, it is excluded from
  // the decisions posted back, so nothing here is saved to the database.
  const [editingResultLine, setEditingResultLine] = React.useState<number | null>(null)
  const [resultDraft, setResultDraft] = React.useState("")

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

  // Mirror the review into module scope so navigating away and back restores it.
  React.useEffect(() => {
    savedSession = {
      fileName, srtText, language, game, wiki, rosterNote,
      hasChecked, cues, suggestions, decisions, customReplacements, lineEdits,
    }
  }, [fileName, srtText, language, game, wiki, rosterNote, hasChecked, cues, suggestions, decisions, customReplacements, lineEdits])

  const cueByIndex = React.useMemo(() => {
    const map = new Map<number, Cue>()
    for (const cue of cues) map.set(cue.index, cue)
    return map
  }, [cues])

  const acceptedCount = React.useMemo(
    () => Object.values(decisions).filter((d) => d === "accepted").length,
    [decisions]
  )

  // A second (priority) glossary is in play only when some suggestion came from
  // it. Used to decide whether to label glossary terms "main" vs "new" — for a
  // single-glossary language there's nothing to contrast, so we don't.
  const hasPriorityGlossary = React.useMemo(
    () => suggestions.some((s) => s.glossarySource === "priority"),
    [suggestions]
  )

  /**
   * The whole file as it will be written, cue by cue.
   *
   * Only ACCEPTED changes are applied, so the panel always shows the file that
   * would be downloaded right now — rejecting a suggestion visibly restores its
   * line. Rewritten lines win over term edits in the same cue, matching what the
   * export sends.
   */
  const previewCues = React.useMemo(() => {
    const acceptedByCue = new Map<number, Suggestion[]>()
    for (const s of suggestions) {
      if (decisions[s.id] !== "accepted") continue
      const list = acceptedByCue.get(s.cueIndex) ?? []
      list.push(s)
      acceptedByCue.set(s.cueIndex, list)
    }

    return cues.map((cue) => {
      const rewritten = lineEdits[cue.index]
      if (rewritten !== undefined) {
        return { ...cue, resultText: rewritten, changed: rewritten !== cue.text }
      }
      let text = cue.text
      for (const s of acceptedByCue.get(cue.index) ?? []) {
        text = applyToLine(text, s.find, customReplacements[s.id] ?? s.replace)
      }
      return { ...cue, resultText: text, changed: text !== cue.text }
    })
  }, [cues, suggestions, decisions, customReplacements, lineEdits])

  const changedCueCount = React.useMemo(
    () => previewCues.filter((c) => c.changed).length,
    [previewCues]
  )

  // Place each reference term on the corrected line it belongs to. When the
  // server aligned matches (LLM-verified counterpart), use that exact line;
  // otherwise fall back to timestamp overlap.
  const refByPreviewCue = React.useMemo(() => {
    const map = new Map<number, { term: string; translation: string }[]>()
    const push = (cueIndex: number, m: { term: string; translation: string }) => {
      const list = map.get(cueIndex) ?? []
      list.push(m)
      map.set(cueIndex, list)
    }

    if (refMatches.some((m) => m.arCueIndex != null)) {
      for (const m of refMatches) {
        if (m.arCueIndex == null) continue
        push(m.arCueIndex, { term: m.term, translation: m.translation })
      }
      return map
    }

    // Fallback: time overlap (alignment unavailable).
    const parsed = refMatches
      .map((m) => ({ ...m, s: tsToMs(m.start), e: tsToMs(m.end) }))
      .filter((m) => !Number.isNaN(m.s) && !Number.isNaN(m.e))
    for (const cue of previewCues) {
      const cs = tsToMs(cue.start)
      const ce = tsToMs(cue.end)
      if (Number.isNaN(cs) || Number.isNaN(ce)) continue
      for (const m of parsed.filter((m) => m.s < ce && m.e > cs)) {
        push(cue.index, { term: m.term, translation: m.translation })
      }
    }
    return map
  }, [refMatches, previewCues])

  /**
   * How many edits the file will actually receive.
   *
   * Not the same as the accepted count: several accepted suggestions inside one
   * rewritten line collapse into a single whole-cue edit.
   */
  const changeCount = React.useMemo(() => {
    const rewritten = new Set(Object.keys(lineEdits).map(Number))
    const terms = suggestions.filter(
      (s) => decisions[s.id] === "accepted" && !rewritten.has(s.cueIndex)
    ).length
    return terms + rewritten.size
  }, [suggestions, decisions, lineEdits])

  /** The text that will actually be written: the translator's edit if there is one. */
  function replacementFor(s: Suggestion): string {
    return customReplacements[s.id] ?? s.replace
  }

  function startEditing(s: Suggestion) {
    setEditingId(s.id)
    setDraft(replacementFor(s))
  }

  /** The cue's text as it will be written: a line edit wins over a term edit. */
  function afterTextFor(s: Suggestion, cueText: string): string {
    const edited = lineEdits[s.cueIndex]
    if (edited !== undefined) return edited
    return applyToLine(cueText, s.find, replacementFor(s))
  }

  function startEditingLine(cueIndex: number, text: string) {
    setEditingLine(cueIndex)
    setLineDraft(text)
  }

  function commitLineEdit(cueIndex: number, originalAfter: string) {
    const value = lineDraft
    setLineEdits((current) => {
      const next = { ...current }
      // Identical to what the suggestion already produces — nothing to override.
      if (!value.trim() || value === originalAfter) delete next[cueIndex]
      else next[cueIndex] = value
      return next
    })
    // Rewriting a line is a decision to use it.
    if (value.trim() && value !== originalAfter) {
      setDecisions((d) => {
        const next = { ...d }
        for (const s of suggestions) if (s.cueIndex === cueIndex) next[s.id] = "accepted"
        return next
      })
    }
    setEditingLine(null)
    setLineDraft("")
  }

  /** A cue's corrected text from accepted suggestions alone — no manual override. */
  function baseCorrectedText(cueIndex: number, cueText: string): string {
    let text = cueText
    for (const s of suggestions) {
      if (s.cueIndex !== cueIndex || decisions[s.id] !== "accepted") continue
      text = applyToLine(text, s.find, customReplacements[s.id] ?? s.replace)
    }
    return text
  }

  function startEditingResultLine(cueIndex: number, text: string) {
    setEditingResultLine(cueIndex)
    setResultDraft(text)
  }

  /**
   * Save a free edit made in the Corrected file panel. Stores the exact text as a
   * whole-line override; if it matches the suggestion-only result, the override is
   * dropped instead. Never touches accept/reject decisions, so a manual tweak here
   * can't re-add a suggestion the translator rejected — and never persists to the DB.
   */
  function commitResultLineEdit(cueIndex: number, cueText: string) {
    const value = resultDraft
    const base = baseCorrectedText(cueIndex, cueText)
    setLineEdits((current) => {
      const next = { ...current }
      if (!value.trim() || value === base) delete next[cueIndex]
      else next[cueIndex] = value
      return next
    })
    setEditingResultLine(null)
    setResultDraft("")
  }

  function commitEdit(s: Suggestion) {
    const value = draft.trim()
    setCustomReplacements((current) => {
      const next = { ...current }
      // Back to the original wording — stop tracking it as an edit.
      if (!value || value === s.replace) delete next[s.id]
      else next[s.id] = value
      return next
    })
    // Editing something is an implicit decision to use it.
    if (value) setDecisions((d) => ({ ...d, [s.id]: "accepted" }))
    setEditingId(null)
    setDraft("")
  }

  function resetResults() {
    setHasChecked(false)
    setRosterNote(null)
    setWiki("")
    setCustomReplacements({})
    setLineEdits({})
    setEditingId(null)
    setDraft("")
    setEditingLine(null)
    setLineDraft("")
    setEditingResultLine(null)
    setResultDraft("")
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

  async function ingestFile(file: File | undefined) {
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

  function onPickFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    // Reset so picking the same file twice still fires onChange.
    event.target.value = ""
    ingestFile(file)
  }

  const [dragOver, setDragOver] = React.useState(false)
  function onDropFile(event: React.DragEvent) {
    event.preventDefault()
    setDragOver(false)
    ingestFile(event.dataTransfer.files?.[0])
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
        // Only unambiguous glossary fixes are pre-accepted. A medium-confidence
        // one needs a human: in a Latin-script language the matched English term
        // may just be a word of that language ("Place au verdict" is French).
        initial[s.id] = s.kind === "glossary" && s.confidence === "high" ? "accepted" : undefined
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
    if (accepted.length === 0 && Object.keys(lineEdits).length === 0) return

    setIsExporting(true)
    try {
      // A rewritten line replaces that cue's whole text. Term edits in the same
      // cue are dropped: applying both would overlap, and the server would reject
      // the second one anyway.
      const rewrittenCues = new Set(Object.keys(lineEdits).map(Number))
      const termEdits = accepted
        .filter((s) => !rewrittenCues.has(s.cueIndex))
        .map((s) => ({ cueIndex: s.cueIndex, find: s.find, replace: replacementFor(s) }))
      const wholeLineEdits = [...rewrittenCues]
        .map((cueIndex) => {
          const cue = cueByIndex.get(cueIndex)
          if (!cue) return null
          return { cueIndex, find: cue.text, replace: lineEdits[cueIndex] }
        })
        .filter((edit): edit is { cueIndex: number; find: string; replace: string } => edit !== null)
      const response = await fetch(`${API}/srt/export`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          srtText,
          language,
          // The translator's wording where they changed it.
          edits: [...termEdits, ...wholeLineEdits],
          // Every decision, not just the applied ones — a rejection teaches as
          // much as a correction, and both stop the suggestion recurring.
          decisions: suggestions
            .filter((s) => decisions[s.id] && !rewrittenCues.has(s.cueIndex))
            .map((s) => {
              const edited = customReplacements[s.id]
              const rejected = decisions[s.id] === "rejected"
              return {
                findText: s.find,
                suggestedText: s.replace,
                finalText: rejected ? null : replacementFor(s),
                outcome: rejected ? "rejected" : edited ? "edited" : "accepted",
                kind: s.kind,
              }
            }),
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
      // The decisions just sent are what the next check will honour.
      const taught = suggestions.filter(
        (s) => customReplacements[s.id] || decisions[s.id] === "rejected"
      ).length
      if (taught > 0) {
        toast.info(
          `Remembered ${taught} change${taught === 1 ? "" : "s"} — future checks will follow your wording`
        )
      }
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
    <div className="p-4 sm:p-8 max-w-[1700px] mx-auto">
      {/* HEADER */}
      <div className="mb-4">
        <h1 className="text-2xl font-bold text-gear-gradient">SRT Checker</h1>
        <p className="text-zinc-500 text-sm mt-1">
          {tab === "checker"
            ? "Check a subtitle file against the approved terminology glossary. Timings are never modified."
            : "Proofread a subtitle file for grammar & spelling in its language. Player/team names are left untouched; timings are never modified."}
        </p>
      </div>

      {/* TABS */}
      <div className="flex gap-2 mb-6 border-b border-white/10">
        {([
          ["checker", "Glossary Checker"],
          ["qc", "QC"],
        ] as const).map(([value, label]) => (
          <button
            key={value}
            type="button"
            onClick={() => setTab(value)}
            className={`px-4 py-2.5 text-sm font-medium -mb-px border-b-2 transition ${
              tab === value
                ? "border-[#D6B36A] text-[#F5F1E8]"
                : "border-transparent text-zinc-500 hover:text-zinc-300"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "qc" && <SrtQcPanel />}

      {/* Three columns on wide screens: review · corrected file · EN reference.
          Stacks below xl, where three side-by-side would be unreadable. */}
      {tab === "checker" && (
      <div className="grid gap-6 items-start xl:grid-cols-[minmax(0,1fr)_minmax(0,420px)_minmax(0,420px)]">
        <div className="min-w-0">

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
                onDrop={onDropFile}
                onDragOver={(e) => {
                  e.preventDefault()
                  setDragOver(true)
                }}
                onDragLeave={() => setDragOver(false)}
                disabled={isChecking}
                className={`flex-1 min-w-0 flex items-center gap-3 px-4 py-3 rounded-2xl border bg-white/10 text-left transition disabled:opacity-50 disabled:cursor-not-allowed ${
                  dragOver ? "border-[#D6B36A] bg-[#D6B36A]/10" : "border-white/20 hover:border-[#D6B36A]"
                }`}
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
              // The file's own language decides how its lines read.
              const lineDir = isRtlLanguage(language) ? "rtl" : "ltr"
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
                      ) : s.glossarySource === "priority" ? (
                        <span
                          title="From the new high-priority Arabic glossary"
                          className="text-[10px] px-1.5 py-0.5 rounded border border-emerald-500/50 text-emerald-400"
                        >
                          new glossary
                        </span>
                      ) : (
                        <span
                          title="From the main glossary"
                          className="text-[10px] px-1.5 py-0.5 rounded border border-[#D6B36A]/40 text-[#D6B36A]"
                        >
                          {/* Only contrast "main" vs "new" when a second glossary
                              exists for this language (Arabic). Otherwise there's
                              just the one glossary. */}
                          {hasPriorityGlossary ? "main glossary" : "approved term"}
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
                  <div dir="ltr" className="text-[15px] leading-relaxed mb-2 flex items-center flex-wrap gap-x-2">
                    <span
                      dir="auto"
                      style={{ unicodeBidi: "isolate" }}
                      className="line-through text-red-400/90"
                    >
                      {s.find}
                    </span>
                    <span className="text-zinc-600">&rarr;</span>

                    {editingId === s.id ? (
                      <span className="inline-flex items-center gap-1.5">
                        <input
                          autoFocus
                          dir="auto"
                          value={draft}
                          onChange={(e) => setDraft(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") commitEdit(s)
                            if (e.key === "Escape") {
                              setEditingId(null)
                              setDraft("")
                            }
                          }}
                          className="bg-black/50 border border-[#D6B36A]/60 rounded-lg px-2 py-1 text-sm text-green-300 outline-none min-w-[180px]"
                        />
                        <button
                          type="button"
                          onClick={() => commitEdit(s)}
                          className="px-2 py-1 rounded-lg text-[11px] font-medium gear-fill"
                        >
                          Save
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setEditingId(null)
                            setDraft("")
                          }}
                          className="px-2 py-1 rounded-lg text-[11px] font-medium border border-white/20 text-zinc-400 hover:text-white"
                        >
                          Cancel
                        </button>
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => startEditing(s)}
                        title="Click to edit the replacement"
                        className="group/edit inline-flex items-center gap-1.5 rounded-lg px-1.5 -mx-1.5 py-0.5 hover:bg-white/5 transition"
                      >
                        <span
                          dir="auto"
                          style={{ unicodeBidi: "isolate" }}
                          className="text-green-400 font-semibold"
                        >
                          {replacementFor(s)}
                        </span>
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3 text-zinc-600 group-hover/edit:text-[#D6B36A] transition" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                    )}

                    {customReplacements[s.id] && editingId !== s.id && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded border border-green-500/40 text-green-400">
                        edited
                      </span>
                    )}

                    {s.learned && !customReplacements[s.id] && editingId !== s.id && (
                      <span
                        title="This wording comes from a correction your team made previously"
                        className="text-[10px] px-1.5 py-0.5 rounded border border-[#D6B36A]/40 text-[#D6B36A]"
                      >
                        your wording
                      </span>
                    )}
                  </div>

                  {/* The line before and after the change, so the result can be
                      read as a sentence rather than inferred from a diff.
                      Direction comes from the subtitle language, not the first
                      character — see isRtlLanguage. */}
                  {cue && (
                    <div className="mb-2.5 space-y-1.5">
                      <div>
                        <span className="text-[10px] uppercase tracking-wide text-zinc-600">Now</span>
                        <p
                          dir={lineDir}
                          className="text-[14px] text-zinc-400 bg-black/30 border border-white/5 rounded-lg px-3 py-2 leading-relaxed whitespace-pre-wrap"
                        >
                          {highlight(cue.text, s.find)}
                        </p>
                      </div>
                      <div>
                        <span className="text-[10px] uppercase tracking-wide text-green-600/80">
                          After this change
                        </span>
                        {lineEdits[s.cueIndex] !== undefined && (
                          <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded border border-green-500/40 text-green-400">
                            line rewritten
                          </span>
                        )}

                        {editingLine === s.cueIndex ? (
                          <div className="mt-0.5">
                            <textarea
                              autoFocus
                              dir={lineDir}
                              rows={Math.max(2, lineDraft.split("\n").length)}
                              value={lineDraft}
                              onChange={(e) => setLineDraft(e.target.value)}
                              onKeyDown={(e) => {
                                // Enter saves; Shift+Enter adds a subtitle line break.
                                if (e.key === "Enter" && !e.shiftKey) {
                                  e.preventDefault()
                                  commitLineEdit(
                                    s.cueIndex,
                                    applyToLine(cue.text, s.find, replacementFor(s))
                                  )
                                }
                                if (e.key === "Escape") {
                                  setEditingLine(null)
                                  setLineDraft("")
                                }
                              }}
                              className="w-full text-[14px] text-zinc-100 bg-black/50 border border-[#D6B36A]/60 rounded-lg px-3 py-2 leading-relaxed outline-none resize-y"
                            />
                            <div className="flex items-center gap-2 mt-1.5">
                              <button
                                type="button"
                                onClick={() =>
                                  commitLineEdit(
                                    s.cueIndex,
                                    applyToLine(cue.text, s.find, replacementFor(s))
                                  )
                                }
                                className="px-2.5 py-1 rounded-lg text-[11px] font-medium gear-fill"
                              >
                                Save line
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingLine(null)
                                  setLineDraft("")
                                }}
                                className="px-2.5 py-1 rounded-lg text-[11px] font-medium border border-white/20 text-zinc-400 hover:text-white"
                              >
                                Cancel
                              </button>
                              {lineEdits[s.cueIndex] !== undefined && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setLineEdits((current) => {
                                      const next = { ...current }
                                      delete next[s.cueIndex]
                                      return next
                                    })
                                    setEditingLine(null)
                                    setLineDraft("")
                                  }}
                                  className="px-2.5 py-1 rounded-lg text-[11px] font-medium border border-white/20 text-zinc-500 hover:text-white ml-auto"
                                >
                                  Reset to suggestion
                                </button>
                              )}
                            </div>
                            <p className="text-[10px] text-zinc-600 mt-1">
                              Enter saves &middot; Shift+Enter adds a line break &middot; Esc cancels
                            </p>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => startEditingLine(s.cueIndex, afterTextFor(s, cue.text))}
                            title="Click to rewrite the whole line"
                            className="group/line w-full text-left"
                          >
                            <p
                              dir={lineDir}
                              className="text-[14px] text-zinc-300 bg-green-500/[0.06] border border-green-500/20 rounded-lg px-3 py-2 leading-relaxed whitespace-pre-wrap group-hover/line:border-[#D6B36A]/50 transition"
                            >
                              {lineEdits[s.cueIndex] !== undefined
                                ? lineEdits[s.cueIndex]
                                : highlight(afterTextFor(s, cue.text), replacementFor(s))}
                            </p>
                          </button>
                        )}
                      </div>
                    </div>
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
            disabled={changeCount === 0 || isExporting}
            onClick={downloadCorrected}
            className={`mt-5 w-full py-3.5 rounded-2xl font-semibold transition flex items-center justify-center gap-3 ${
              changeCount === 0 || isExporting
                ? "bg-white/10 text-zinc-500 cursor-not-allowed"
                : "gear-fill"
            }`}
          >
            {isExporting && spinner}
            {isExporting
              ? "Preparing file..."
              : `Download corrected .srt (${changeCount} change${changeCount === 1 ? "" : "s"})`}
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

        {/* ── RESULTING FILE ─────────────────────────────────────────────
            Sticky, with its own scroll, so the file stays in view while the
            suggestions are worked through. */}
        <aside className="min-w-0">
          <div className="bg-white/[0.03] border border-white/10 rounded-[24px] overflow-hidden">
            <div className="px-5 py-3.5 border-b border-white/10 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <h2 className="text-sm font-semibold text-[#F5F1E8]">Corrected file</h2>
                <p className="text-[11px] text-zinc-500 truncate">
                  {hasChecked
                    ? `${changedCueCount} of ${previewCues.length} lines changed · click a line to edit`
                    : fileName || "Nothing loaded yet"}
                </p>
              </div>
              {hasChecked && changedCueCount > 0 && (
                <span className="text-[10px] px-2 py-0.5 rounded-full border border-[#D6B36A]/40 text-[#D6B36A] whitespace-nowrap">
                  live preview
                </span>
              )}
            </div>

            {previewCues.length === 0 ? (
              <div className="px-5 py-10 text-center">
                <p className="text-sm text-zinc-500">
                  Run a check to see the corrected file here.
                </p>
              </div>
            ) : (
              <div className="max-h-[calc(100vh-190px)] overflow-y-auto divide-y divide-white/[0.04]">
                {previewCues.map((cue) => (
                  <div
                    key={cue.index}
                    className={`px-4 py-2.5 ${cue.changed ? "bg-[#E89B3A]/[0.07]" : ""}`}
                  >
                    <div className="flex items-center gap-2 mb-1 text-[10px] text-zinc-600">
                      <span className="font-semibold text-zinc-500">{cue.index}</span>
                      <span className="font-mono">
                        {cue.start} &rarr; {cue.end}
                      </span>
                      {lineEdits[cue.index] !== undefined && (
                        <span className="text-[9px] px-1.5 py-0.5 rounded border border-sky-500/40 text-sky-400">
                          edited
                        </span>
                      )}
                      {cue.changed && (
                        <span className="ml-auto text-[#D6B36A] font-medium">changed</span>
                      )}
                    </div>

                    {editingResultLine === cue.index ? (
                      <div>
                        <textarea
                          autoFocus
                          dir={isRtlLanguage(language) ? "rtl" : "ltr"}
                          rows={Math.max(2, resultDraft.split("\n").length)}
                          value={resultDraft}
                          onChange={(e) => setResultDraft(e.target.value)}
                          onKeyDown={(e) => {
                            // Enter saves; Shift+Enter adds a subtitle line break.
                            if (e.key === "Enter" && !e.shiftKey) {
                              e.preventDefault()
                              commitResultLineEdit(cue.index, cue.text)
                            }
                            if (e.key === "Escape") {
                              setEditingResultLine(null)
                              setResultDraft("")
                            }
                          }}
                          className="w-full text-[13px] text-zinc-100 bg-black/50 border border-[#D6B36A]/60 rounded-lg px-3 py-2 leading-relaxed outline-none resize-y"
                        />
                        <div className="flex items-center gap-2 mt-1.5">
                          <button
                            type="button"
                            onClick={() => commitResultLineEdit(cue.index, cue.text)}
                            className="px-2.5 py-1 rounded-lg text-[11px] font-medium gear-fill"
                          >
                            Save line
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setEditingResultLine(null)
                              setResultDraft("")
                            }}
                            className="px-2.5 py-1 rounded-lg text-[11px] font-medium border border-white/20 text-zinc-400 hover:text-white"
                          >
                            Cancel
                          </button>
                          {lineEdits[cue.index] !== undefined && (
                            <button
                              type="button"
                              onClick={() => {
                                setLineEdits((current) => {
                                  const next = { ...current }
                                  delete next[cue.index]
                                  return next
                                })
                                setEditingResultLine(null)
                                setResultDraft("")
                              }}
                              className="px-2.5 py-1 rounded-lg text-[11px] font-medium border border-white/20 text-zinc-500 hover:text-white ml-auto"
                            >
                              Reset line
                            </button>
                          )}
                        </div>
                        <p className="text-[10px] text-zinc-600 mt-1">
                          Enter saves &middot; Shift+Enter adds a line break &middot; Esc cancels
                        </p>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => startEditingResultLine(cue.index, cue.resultText)}
                        title="Click to edit this line"
                        className="group/rline w-full text-left"
                      >
                        <p
                          dir={isRtlLanguage(language) ? "rtl" : "ltr"}
                          className={`text-[13px] leading-relaxed whitespace-pre-wrap rounded-lg px-2 py-1 -mx-2 border border-transparent group-hover/rline:border-[#D6B36A]/40 group-hover/rline:bg-white/[0.03] transition ${
                            cue.changed ? "text-[#F0C070]" : "text-zinc-400"
                          }`}
                        >
                          {cue.resultText}
                        </p>
                      </button>
                    )}

                    {/* EN → AR/FR reference terms whose timing overlaps this line. */}
                    {(refByPreviewCue.get(cue.index) ?? []).length > 0 && (
                      <div className="mt-1.5 flex flex-wrap gap-1.5">
                        {refByPreviewCue.get(cue.index)!.map((m, i) => (
                          <span
                            key={`${m.term}-${i}`}
                            className="inline-flex items-center gap-1 text-[11px] bg-emerald-500/10 border border-emerald-500/25 rounded-md px-1.5 py-0.5"
                          >
                            <span className="text-zinc-300">{m.term}</span>
                            <span className="text-zinc-600">→</span>
                            <span dir={isRtlLanguage(language) ? "rtl" : "ltr"} className="text-emerald-400 font-medium">
                              {m.translation}
                            </span>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </aside>

        {/* EN → AR/FR reference — its own column beside the corrected file.
            Shares state with the standalone Reference tab (module-scope), so a
            lookup done in either place shows in both. */}
        <aside className="min-w-0">
          <div className="px-1 mb-2">
            <h2 className="text-sm font-semibold text-[#F5F1E8]">EN → AR / FR reference</h2>
            <p className="text-[11px] text-zinc-500">
              Look up approved translations for an English source file.
            </p>
          </div>
          <EnReferencePanel
            compact
            checkerReady={hasChecked}
            alignTo={previewCues.map((c) => ({
              index: c.index,
              text: c.resultText,
              start: c.start,
              end: c.end,
            }))}
            onMatchesChange={setRefMatches}
          />
        </aside>
      </div>
      )}
    </div>
  )
}
