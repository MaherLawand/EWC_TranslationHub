import React from "react"
import { toast } from "react-toastify"

// The proofreader only carries style rules for these three (Arabic, English, French).
const QC_LANGUAGES = ["Arabic", "English", "French"]

const API = import.meta.env.VITE_API_URL
const MAX_SRT_CHARS = 400_000

const RTL_LANGUAGES = new Set(["arabic", "hebrew", "persian", "farsi", "urdu"])
const isRtl = (language: string) => RTL_LANGUAGES.has(language.trim().toLowerCase())

type Cue = { index: number; start: string; end: string; text: string }
type Change = { before: string; after: string; reason: string }
type Correction = { index: number; corrected: string; changes: Change[] }

// Module-scope so the result survives switching between the SRT-checker tabs.
type QcSession = {
  fileName: string
  srtText: string
  language: string
  hasChecked: boolean
  cues: Cue[]
  corrections: Correction[]
  lineEdits: Record<number, string>
}
let savedQc: QcSession | null = null

/**
 * Token-level diff so corrections can be highlighted in place. Returns the
 * corrected string split into segments, each flagged as changed (not part of the
 * longest common subsequence with the original) or unchanged.
 */
function diffSegments(original: string, corrected: string): { text: string; changed: boolean }[] {
  const a = original.split(/(\s+)/)
  const b = corrected.split(/(\s+)/)
  const n = a.length, m = b.length
  const dp: number[][] = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0))
  for (let i = n - 1; i >= 0; i--)
    for (let j = m - 1; j >= 0; j--)
      dp[i][j] = a[i] === b[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1])

  const segs: { text: string; changed: boolean }[] = []
  let i = 0, j = 0
  const push = (text: string, changed: boolean) => {
    const last = segs[segs.length - 1]
    if (last && last.changed === changed) last.text += text
    else segs.push({ text, changed })
  }
  while (j < m) {
    if (i < n && a[i] === b[j]) { push(b[j], false); i++; j++ }
    else if (i < n && dp[i + 1][j] >= dp[i][j + 1]) i++ // token dropped from original
    else { push(b[j], true); j++ }                      // token added/changed
  }
  return segs
}

export default function SrtQcPanel() {
  const [fileName, setFileName] = React.useState(savedQc?.fileName ?? "")
  const [srtText, setSrtText] = React.useState(savedQc?.srtText ?? "")
  const [language, setLanguage] = React.useState(savedQc?.language ?? "")
  const [hasChecked, setHasChecked] = React.useState(savedQc?.hasChecked ?? false)
  const [cues, setCues] = React.useState<Cue[]>(savedQc?.cues ?? [])
  const [corrections, setCorrections] = React.useState<Correction[]>(savedQc?.corrections ?? [])
  const [lineEdits, setLineEdits] = React.useState<Record<number, string>>(savedQc?.lineEdits ?? {})
  const [isChecking, setIsChecking] = React.useState(false)
  const [progress, setProgress] = React.useState(0)
  const [progressLabel, setProgressLabel] = React.useState("")
  const [isExporting, setIsExporting] = React.useState(false)
  const [dragOver, setDragOver] = React.useState(false)
  const [editing, setEditing] = React.useState<number | null>(null)
  const [draft, setDraft] = React.useState("")

  // Persist across tab switches.
  React.useEffect(() => {
    savedQc = { fileName, srtText, language, hasChecked, cues, corrections, lineEdits }
  }, [fileName, srtText, language, hasChecked, cues, corrections, lineEdits])

  function reset() {
    setHasChecked(false)
    setCues([])
    setCorrections([])
    setLineEdits({})
    setEditing(null)
    setDraft("")
  }

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

  function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ""
    ingestFile(file)
  }
  function onDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragOver(false)
    ingestFile(e.dataTransfer.files?.[0])
  }

  /**
   * Drive the progress bar for a run. The server returns one response at the end
   * (no streaming), so this is a MODELLED estimate grounded in the work: cue count
   * decides how many model batches run. It eases toward 95% and only hits 100%
   * when the real response lands.
   */
  function startProgress(cueCount: number) {
    const batches = Math.max(1, Math.ceil(cueCount / 40))
    const estimateMs = 4_000 + batches * 7_000
    const startedAt = Date.now()
    setProgress(0)
    setProgressLabel("Reading the subtitles…")
    const timer = window.setInterval(() => {
      const elapsed = Date.now() - startedAt
      const ratio = 1 - Math.exp(-elapsed / (estimateMs / 2.5))
      setProgress(Math.min(95, Math.round(ratio * 95)))
      setProgressLabel(elapsed < 3_000 ? "Reading the subtitles…" : `Proofreading ${cueCount} line${cueCount === 1 ? "" : "s"}…`)
    }, 200)
    return () => window.clearInterval(timer)
  }

  async function runCheck() {
    if (!srtText || !language || isChecking) return
    setIsChecking(true)
    reset()
    // Estimate cue count from the file to pace the bar (one "-->" per cue).
    const cueCount = (srtText.match(/-->/g) || []).length || 1
    const stopProgress = startProgress(cueCount)
    try {
      const res = await fetch(`${API}/srt/qc`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ srtText, language }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.message || "The proofread could not complete")
      setCues(data.cues || [])
      setCorrections(data.corrections || [])
      setHasChecked(true)
      setProgress(100)
      const n = (data.corrections || []).length
      toast.success(n === 0 ? "No issues found" : `Found issues in ${n} line${n === 1 ? "" : "s"}`)
    } catch (error) {
      toast.error((error as Error).message || "Failed to proofread")
    } finally {
      stopProgress()
      setProgressLabel("")
      setIsChecking(false)
    }
  }

  const corrByCue = React.useMemo(() => {
    const m = new Map<number, Correction>()
    for (const c of corrections) m.set(c.index, c)
    return m
  }, [corrections])

  // The file as it will be written: a manual edit wins over the model's correction.
  const previewCues = React.useMemo(() => {
    return cues.map((cue) => {
      const edited = lineEdits[cue.index]
      const corr = corrByCue.get(cue.index)
      const result = edited !== undefined ? edited : corr ? corr.corrected : cue.text
      return { ...cue, result, changed: result !== cue.text, changes: corr?.changes ?? [] }
    })
  }, [cues, corrByCue, lineEdits])

  const changedCount = previewCues.filter((c) => c.changed).length
  const dir = isRtl(language) ? "rtl" : "ltr"

  function startEdit(index: number, text: string) {
    setEditing(index)
    setDraft(text)
  }
  function commitEdit(index: number, base: string) {
    setLineEdits((cur) => {
      const next = { ...cur }
      if (!draft.trim() || draft === base) delete next[index]
      else next[index] = draft
      return next
    })
    setEditing(null)
    setDraft("")
  }

  async function download() {
    if (isExporting || changedCount === 0) return
    setIsExporting(true)
    try {
      const edits = previewCues
        .filter((c) => c.changed)
        .map((c) => ({ cueIndex: c.index, find: c.text, replace: c.result }))
      const res = await fetch(`${API}/srt/export`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ srtText, edits }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.message || "The corrected file could not be produced")
      const match = fileName.match(/^(.*?)(\.(?:srt|txt))?$/i)
      const base = match?.[1] || fileName
      const ext = (match?.[2] || ".srt").toLowerCase()
      const blob = new Blob([data.srtText], { type: "text/plain;charset=utf-8" })
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `${base}_qc${ext}`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      toast.success(`Downloaded with ${data.applied} fix${data.applied === 1 ? "" : "es"}`)
    } catch (error) {
      toast.error((error as Error).message || "Failed to export")
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <div className="max-w-[860px]">
      {/* CONTROLS */}
      <div className="bg-white/[0.04] border border-white/10 rounded-[24px] p-6 mb-6">
        <div className="grid gap-4 sm:grid-cols-[1fr_260px]">
          {/* Drop zone */}
          <label
            onDrop={onDrop}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
            onDragLeave={() => setDragOver(false)}
            className={`block cursor-pointer rounded-2xl border border-dashed px-5 py-6 text-center transition ${
              dragOver ? "border-[#D6B36A]/70 bg-[#D6B36A]/[0.06]" : "border-white/15 bg-[#0E0E0E] hover:border-white/25"
            }`}
          >
            <input type="file" accept=".srt,.txt,text/plain" className="hidden" onChange={onPick} />
            {fileName ? (
              <div className="flex items-center justify-center gap-3">
                <span className="text-sm text-[#F5F1E8] truncate max-w-[70%]">{fileName}</span>
                <button
                  type="button"
                  onClick={(e) => { e.preventDefault(); setFileName(""); setSrtText(""); reset() }}
                  className="text-[11px] px-2 py-1 rounded-lg border border-white/20 text-zinc-400 hover:text-white"
                >
                  Remove
                </button>
              </div>
            ) : (
              <>
                <p className="text-sm text-[#F5F1E8] font-medium">Drop an .srt / .txt, or click to choose</p>
                <p className="text-[12px] text-zinc-500 mt-1">Its timings are never modified.</p>
              </>
            )}
          </label>

          {/* Language */}
          <div>
            <label className="text-xs font-medium text-zinc-400 mb-2 block tracking-wide">
              Language <span className="text-red-400">*</span>
            </label>
            <div className="relative">
              <select
                value={language}
                onChange={(e) => { setLanguage(e.target.value); reset() }}
                className="w-full h-[50px] appearance-none bg-[#0E0E0E] border border-[#2A2A2A] rounded-2xl px-4 pr-9 text-[#F5F1E8] outline-none transition hover:border-[#3A3A3A] focus:border-[#D6B36A] cursor-pointer"
              >
                <option value="">Select the language</option>
                {QC_LANGUAGES.map((l) => (
                  <option key={l} value={l}>{l}</option>
                ))}
              </select>
              <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 text-[9px]">▼</div>
            </div>
            <p className="text-[11px] text-zinc-600 mt-1.5">
              Grammar &amp; spelling only. Player/team names are left as-is.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={runCheck}
          disabled={!srtText || !language || isChecking}
          className={`mt-4 w-full py-3.5 rounded-2xl font-semibold transition ${
            !srtText || !language || isChecking
              ? "bg-white/5 border border-white/10 text-zinc-500 cursor-not-allowed"
              : "gear-fill"
          }`}
        >
          {isChecking ? `Proofreading… ${progress}%` : "Check grammar & spelling"}
        </button>

        {isChecking && (
          <div className="mt-3">
            <div
              className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden"
              role="progressbar"
              aria-valuenow={progress}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label="Proofread progress"
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

      {/* RESULT */}
      {hasChecked && (
        <div className="bg-white/[0.03] border border-white/10 rounded-[24px] overflow-hidden">
          <div className="px-5 py-3.5 border-b border-white/10 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <h2 className="text-sm font-semibold text-[#F5F1E8]">Proofread result</h2>
              <p className="text-[11px] text-zinc-500 truncate">
                {changedCount === 0
                  ? "No mistakes found — nothing to change."
                  : `${changedCount} line${changedCount === 1 ? "" : "s"} corrected · click a line to edit`}
              </p>
            </div>
            {changedCount > 0 && (
              <button
                type="button"
                onClick={download}
                disabled={isExporting}
                className="text-[12px] font-semibold gear-fill px-3.5 py-2 rounded-xl disabled:opacity-60"
              >
                {isExporting ? "Preparing…" : "Download .srt"}
              </button>
            )}
          </div>

          <div className="max-h-[calc(100vh-320px)] overflow-y-auto divide-y divide-white/[0.04]">
            {previewCues.map((cue) => (
              <div key={cue.index} className={`px-4 py-2.5 ${cue.changed ? "bg-emerald-500/[0.05]" : ""}`}>
                <div className="flex items-center gap-2 mb-1 text-[10px] text-zinc-600">
                  <span className="font-semibold text-zinc-500">{cue.index}</span>
                  <span className="font-mono">{cue.start} &rarr; {cue.end}</span>
                  {lineEdits[cue.index] !== undefined && (
                    <span className="text-[9px] px-1.5 py-0.5 rounded border border-sky-500/40 text-sky-400">edited</span>
                  )}
                  {cue.changed && lineEdits[cue.index] === undefined && (
                    <span className="ml-auto text-emerald-400 font-medium">corrected</span>
                  )}
                </div>

                {editing === cue.index ? (
                  <div>
                    <textarea
                      autoFocus
                      dir={dir}
                      rows={Math.max(2, draft.split("\n").length)}
                      value={draft}
                      onChange={(e) => setDraft(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); commitEdit(cue.index, cue.text) }
                        if (e.key === "Escape") { setEditing(null); setDraft("") }
                      }}
                      className="w-full text-[13px] text-zinc-100 bg-black/50 border border-[#D6B36A]/60 rounded-lg px-3 py-2 leading-relaxed outline-none resize-y"
                    />
                    <div className="flex items-center gap-2 mt-1.5">
                      <button type="button" onClick={() => commitEdit(cue.index, cue.text)} className="px-2.5 py-1 rounded-lg text-[11px] font-medium gear-fill">Save line</button>
                      <button type="button" onClick={() => { setEditing(null); setDraft("") }} className="px-2.5 py-1 rounded-lg text-[11px] font-medium border border-white/20 text-zinc-400 hover:text-white">Cancel</button>
                      {lineEdits[cue.index] !== undefined && (
                        <button
                          type="button"
                          onClick={() => { setLineEdits((c) => { const n = { ...c }; delete n[cue.index]; return n }); setEditing(null); setDraft("") }}
                          className="px-2.5 py-1 rounded-lg text-[11px] font-medium border border-white/20 text-zinc-500 hover:text-white ml-auto"
                        >
                          Reset to suggestion
                        </button>
                      )}
                    </div>
                  </div>
                ) : (
                  <button type="button" onClick={() => startEdit(cue.index, cue.result)} title="Click to edit this line" className="group/l w-full text-left">
                    <p dir={dir} className="text-[13px] leading-relaxed whitespace-pre-wrap rounded-lg px-2 py-1 -mx-2 border border-transparent group-hover/l:border-[#D6B36A]/40 group-hover/l:bg-white/[0.03] transition">
                      {cue.changed && lineEdits[cue.index] === undefined
                        ? diffSegments(cue.text, cue.result).map((seg, i) =>
                            seg.changed
                              ? <span key={i} className="bg-emerald-500/25 text-emerald-200 rounded px-0.5">{seg.text}</span>
                              : <span key={i} className="text-zinc-300">{seg.text}</span>
                          )
                        : <span className="text-zinc-300">{cue.result}</span>}
                    </p>
                  </button>
                )}

                {/* Reasons for each change on this line */}
                {lineEdits[cue.index] === undefined && cue.changes.length > 0 && (
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {cue.changes.map((ch, i) => (
                      <span key={i} className="inline-flex items-center gap-1.5 text-[11px] bg-white/[0.04] border border-white/10 rounded-md px-1.5 py-0.5">
                        <span className="text-zinc-500 line-through" dir={dir}>{ch.before}</span>
                        <span className="text-zinc-600">→</span>
                        <span className="text-emerald-400 font-medium" dir={dir}>{ch.after}</span>
                        <span className="text-zinc-500">· {ch.reason}</span>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
