import React from "react"
import { toast } from "react-toastify"

/**
 * "EN → AR/FR Reference" tab of the SRT checker.
 *
 * A translator drops in an ENGLISH subtitle and picks a target language; every
 * reference-glossary term found in the file is listed with its approved Arabic or
 * French translation and the line it appears in. Pure lookup — nothing is edited,
 * nothing is downloaded.
 */

const API = import.meta.env.VITE_API_URL
const MAX_SRT_CHARS = 400_000

type Target = "ar" | "fr"
const TARGET_LABEL: Record<Target, string> = { ar: "Arabic", fr: "French" }

type Match = {
  id: string
  cueIndex: number
  term: string
  translation: string
  start: string
  end: string
  line: string
  /** The corrected-file cue this term was aligned to (when the checker ran). */
  arCueIndex?: number | null
}

export type AlignCue = { index: number; text: string; start: string; end: string }

const spinner = (
  <div className="w-4 h-4 border-2 border-zinc-600 border-t-transparent rounded-full animate-spin" />
)

/** Highlight the matched term within the (English) line. Plain string search. */
function highlight(line: string, term: string): React.ReactNode {
  const at = line.toLowerCase().indexOf(term.toLowerCase())
  if (at === -1 || !term) return line
  return (
    <>
      {line.slice(0, at)}
      <mark className="bg-[#E89B3A]/25 text-[#F0C070] rounded px-0.5">{line.slice(at, at + term.length)}</mark>
      {line.slice(at + term.length)}
    </>
  )
}

/**
 * The last reference lookup, kept alive while the tab is open.
 *
 * Module scope (not sessionStorage): survives tab switches and unmounts but not a
 * refresh, mirroring the checker's own persistence, and keeps a large subtitle
 * file out of browser storage. Shared by every instance (the standalone tab and
 * the copy embedded beside the corrected file), so both stay in sync.
 */
type RefSession = {
  fileName: string
  srtText: string
  target: Target | ""
  hasChecked: boolean
  matches: Match[]
}
let savedRefSession: RefSession | null = null

export default function EnReferencePanel({
  compact = false,
  onMatchesChange,
  alignTo,
  checkerReady = true,
}: {
  compact?: boolean
  /** Fires whenever the match set changes, so the parent can weave the terms
   *  into the corrected-file preview line by line. */
  onMatchesChange?: (matches: Match[]) => void
  /** The corrected-file cues, so each term can be pinned to the line that is
   *  actually the translation of its English line (not just time-overlapping). */
  alignTo?: AlignCue[]
  /** In the embedded copy, the lookup needs the corrected file, so the button is
   *  disabled until the terminology check has produced it. */
  checkerReady?: boolean
}) {
  const fileInputRef = React.useRef<HTMLInputElement>(null)

  const [fileName, setFileName] = React.useState(savedRefSession?.fileName ?? "")
  const [srtText, setSrtText] = React.useState(savedRefSession?.srtText ?? "")
  const [target, setTarget] = React.useState<Target | "">(savedRefSession?.target ?? "")

  const [isChecking, setIsChecking] = React.useState(false)
  const [hasChecked, setHasChecked] = React.useState(savedRefSession?.hasChecked ?? false)
  const [matches, setMatches] = React.useState<Match[]>(savedRefSession?.matches ?? [])

  // Mirror into module scope so switching tabs (or embedding a second copy)
  // restores the lookup.
  React.useEffect(() => {
    savedRefSession = { fileName, srtText, target, hasChecked, matches }
  }, [fileName, srtText, target, hasChecked, matches])

  // Let the parent line the matches up with the corrected file.
  React.useEffect(() => {
    onMatchesChange?.(matches)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [matches])

  function reset() {
    setHasChecked(false)
    setMatches([])
  }

  function clearFile() {
    setFileName("")
    setSrtText("")
    if (fileInputRef.current) fileInputRef.current.value = ""
    reset()
  }

  const [dragOver, setDragOver] = React.useState(false)

  async function ingestFile(file: File | undefined) {
    if (!file) return
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
    reset()
  }

  function onPickFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ""
    ingestFile(file)
  }

  function onDrop(event: React.DragEvent) {
    event.preventDefault()
    setDragOver(false)
    ingestFile(event.dataTransfer.files?.[0])
  }

  async function runCheck() {
    if (!srtText || !target || isChecking) return
    setIsChecking(true)
    try {
      const response = await fetch(`${API}/srt/en-reference`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        // When embedded, send the corrected-file cues so the server aligns each
        // term to the line that is genuinely its translation.
        body: JSON.stringify({ srtText, target, arCues: alignTo ?? [] }),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(data.message || "The reference check could not complete")
      setMatches(data.matches || [])
      setHasChecked(true)
      if ((data.matches || []).length === 0) toast.info("No glossary terms found in this file")
    } catch (error: any) {
      toast.error(error.message || "The reference check could not complete")
    } finally {
      setIsChecking(false)
    }
  }

  const rtl = target === "ar"

  return (
    <div className="min-w-0">
      {/* UPLOAD + TARGET */}
      <div className={`bg-white/[0.04] border border-white/10 rounded-[24px] min-w-0 ${compact ? "p-4" : "p-6"} mb-6 ${compact ? "" : "max-w-[900px]"}`}>
        <p className="text-sm text-zinc-500 mb-4">
          Drop in an <span className="text-zinc-300">English</span> subtitle and pick a language.
          Every glossary term in it is listed with its approved translation.
        </p>

        <div className={`grid gap-4 min-w-0 ${compact ? "" : "sm:grid-cols-2"}`}>
          {/* File */}
          <div className="min-w-0">
            <label className="text-xs font-medium text-zinc-400 mb-2 block tracking-wide">
              English subtitle <span className="text-red-400">*</span>
            </label>
            <input
              ref={fileInputRef}
              type="file"
              accept=".srt,.txt,text/plain"
              onChange={onPickFile}
              className="hidden"
            />
            <div className="flex items-stretch gap-2 min-w-0">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                onDrop={onDrop}
                onDragOver={(e) => {
                  e.preventDefault()
                  setDragOver(true)
                }}
                onDragLeave={() => setDragOver(false)}
                disabled={isChecking}
                className={`flex-1 min-w-0 flex items-center gap-3 px-4 py-3 rounded-2xl border bg-white/10 text-left transition disabled:opacity-50 ${
                  dragOver ? "border-[#D6B36A] bg-[#D6B36A]/10" : "border-white/20 hover:border-[#D6B36A]"
                }`}
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
                  className="px-3 rounded-2xl border border-white/20 bg-white/5 text-zinc-400 hover:text-white hover:border-red-400/60 transition disabled:opacity-50"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
          </div>

          {/* Target */}
          <div>
            <label className="text-xs font-medium text-zinc-400 mb-2 block tracking-wide">
              Target language <span className="text-red-400">*</span>
            </label>
            <div className="relative">
              <select
                value={target}
                onChange={(e) => {
                  setTarget(e.target.value as Target)
                  reset()
                }}
                className="w-full h-[50px] appearance-none bg-[#0E0E0E] border border-[#2A2A2A] rounded-2xl px-4 pr-9 text-[#F5F1E8] outline-none transition hover:border-[#3A3A3A] focus:border-[#D6B36A] cursor-pointer"
              >
                <option value="">Select a language</option>
                <option value="ar">Arabic</option>
                <option value="fr">French</option>
              </select>
              <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 text-[9px]">▼</div>
            </div>
          </div>
        </div>

        {(() => {
          const gated = compact && !checkerReady
          const disabled = !srtText || !target || isChecking || gated
          return (
            <>
              <button
                type="button"
                disabled={disabled}
                onClick={runCheck}
                className={`mt-5 w-full py-3.5 rounded-2xl font-semibold transition flex items-center justify-center gap-3 ${
                  disabled ? "bg-white/10 text-zinc-500 cursor-not-allowed" : "gear-fill"
                }`}
              >
                {isChecking && spinner}
                {isChecking ? "Looking up terms…" : "Look up terms"}
              </button>
              {gated && (
                <p className="text-[11px] text-zinc-500 mt-2 text-center">
                  Run the terminology check first — the lookup lines terms up with the corrected file.
                </p>
              )}
            </>
          )
        })()}
      </div>

      {/* RESULTS */}
      {hasChecked && matches.length === 0 && (
        <div className={`bg-white/[0.04] border border-white/10 rounded-[24px] p-8 text-center ${compact ? "" : "max-w-[900px]"}`}>
          <p className="text-zinc-400 font-semibold">No glossary terms found</p>
          <p className="text-zinc-600 text-sm mt-1">None of this file's text matches a reference-glossary term.</p>
        </div>
      )}

      {/* In compact mode (embedded beside the corrected file) the matches are
          shown inline per line in the corrected file, so here we show only a
          summary rather than a duplicate list. */}
      {hasChecked && matches.length > 0 && compact && (
        <div className="bg-white/[0.03] border border-white/10 rounded-2xl px-4 py-3 text-sm text-zinc-400">
          <span className="text-white font-semibold">{matches.length}</span>{" "}
          term{matches.length === 1 ? "" : "s"} found &middot; {TARGET_LABEL[target as Target]} —
          shown next to each line in the corrected file.
        </div>
      )}

      {hasChecked && matches.length > 0 && !compact && (
        <div className={compact ? "" : "max-w-[900px]"}>
          <p className="text-sm text-zinc-400 mb-3">
            <span className="text-white font-semibold">{matches.length}</span>{" "}
            term{matches.length === 1 ? "" : "s"} found &middot; {TARGET_LABEL[target as Target]}
          </p>
          <div className="space-y-2">
            {matches.map((m) => (
              <div key={m.id} className="bg-[#111111] border border-[#242424] rounded-2xl px-4 py-3">
                <div className="flex items-center gap-2 mb-1.5 text-[10px] text-zinc-600">
                  <span className="font-semibold text-zinc-500">Line {m.cueIndex}</span>
                  <span className="font-mono">{m.start} &rarr; {m.end}</span>
                </div>
                <div className="flex items-baseline flex-wrap gap-x-2 gap-y-1 text-[15px]">
                  <span className="text-[#F5F1E8] font-semibold">{m.term}</span>
                  <span className="text-zinc-600">&rarr;</span>
                  <span dir={rtl ? "rtl" : "ltr"} className="text-green-400 font-semibold">{m.translation}</span>
                </div>
                <p className="text-[12px] text-zinc-500 mt-1.5 leading-relaxed">
                  {highlight(m.line, m.term)}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
