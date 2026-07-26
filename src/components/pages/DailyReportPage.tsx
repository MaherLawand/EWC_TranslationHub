import React from "react"
import { toast } from "react-toastify"

const API = import.meta.env.VITE_API_URL

// Railway CSVs are text; keep a sane ceiling so a mis-picked huge file is caught
// before upload (server also enforces its own body limit).
const MAX_CSV_CHARS = 20_000_000

type ReportResult = {
  spreadsheetUrl: string
  tabs: { name: string; rows: number }[]
  orders: number
  events: number
  delayed: number
}

/**
 * Owner-only page to run the daily orders report from a phone: drop in the Railway
 * logs CSV, it's sent to the server which builds the report and writes it to the
 * shared Google Sheet (same logic as the CLI script). Access is enforced by the
 * server (requireReportOwner); this page is only shown to the owner email.
 */
export default function DailyReportPage() {
  const [fileName, setFileName] = React.useState("")
  const [csvText, setCsvText] = React.useState("")
  const [dragOver, setDragOver] = React.useState(false)
  const [isRunning, setIsRunning] = React.useState(false)
  const [result, setResult] = React.useState<ReportResult | null>(null)

  async function ingestFile(file: File | undefined) {
    if (!file) return
    if (!/\.csv$/i.test(file.name)) {
      toast.error("Please choose a .csv file (the Railway logs export)")
      return
    }
    const text = await file.text()
    if (text.length > MAX_CSV_CHARS) {
      toast.error("That CSV is too large")
      return
    }
    setFileName(file.name)
    setCsvText(text)
    setResult(null)
  }

  function onPickFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = "" // re-picking the same file still fires onChange
    ingestFile(file)
  }

  function onDropFile(event: React.DragEvent) {
    event.preventDefault()
    setDragOver(false)
    ingestFile(event.dataTransfer.files?.[0])
  }

  function clearFile() {
    setFileName("")
    setCsvText("")
    setResult(null)
  }

  async function generate() {
    if (!csvText || isRunning) return
    setIsRunning(true)
    setResult(null)
    try {
      const response = await fetch(`${API}/reports/daily`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ csvText, filename: fileName }),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(data.message || "The report could not be generated")
      setResult(data as ReportResult)
      toast.success("Report written to the sheet")
    } catch (error) {
      toast.error((error as Error).message || "Failed to generate the report")
    } finally {
      setIsRunning(false)
    }
  }

  return (
    <div className="max-w-[720px] mx-auto px-1 py-2">
      <div className="mb-5">
        <h1 className="text-2xl font-bold text-gear-gradient w-fit">Daily Report</h1>
        <p className="text-[13px] text-zinc-500 mt-2 leading-relaxed">
          Export the Railway logs CSV for the date range, drop it below, and generate.
          The report is written to the shared Google Sheet as a tab named after the
          file — existing tabs are never deleted.
        </p>
      </div>

      {/* Drop zone */}
      <label
        onDrop={onDropFile}
        onDragOver={(e) => {
          e.preventDefault()
          setDragOver(true)
        }}
        onDragLeave={() => setDragOver(false)}
        className={`block cursor-pointer rounded-[24px] border border-dashed px-6 py-10 text-center transition ${
          dragOver
            ? "border-[#D6B36A]/70 bg-[#D6B36A]/[0.06]"
            : "border-white/15 bg-white/[0.03] hover:border-white/25"
        }`}
      >
        <input type="file" accept=".csv,text/csv" className="hidden" onChange={onPickFile} />
        {fileName ? (
          <div className="flex items-center justify-center gap-3">
            <span className="text-sm text-[#F5F1E8] truncate max-w-[70%]">{fileName}</span>
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault()
                clearFile()
              }}
              className="text-[11px] px-2 py-1 rounded-lg border border-white/20 text-zinc-400 hover:text-white transition"
            >
              Remove
            </button>
          </div>
        ) : (
          <>
            <p className="text-sm text-[#F5F1E8] font-medium">Tap to choose a CSV, or drop it here</p>
            <p className="text-[12px] text-zinc-500 mt-1">Railway logs export (.csv)</p>
          </>
        )}
      </label>

      <button
        type="button"
        onClick={generate}
        disabled={!csvText || isRunning}
        className={`mt-4 w-full py-3.5 rounded-2xl font-semibold transition ${
          !csvText || isRunning
            ? "bg-white/5 border border-white/10 text-zinc-500 cursor-not-allowed"
            : "gear-fill"
        }`}
      >
        {isRunning ? "Generating…" : "Generate report"}
      </button>

      {/* Result */}
      {result && (
        <div className="mt-6 bg-white/[0.03] border border-white/10 rounded-[24px] p-5">
          <div className="flex flex-wrap gap-4 text-[13px] mb-4">
            <span className="text-zinc-400">
              Orders <strong className="text-[#F5F1E8]">{result.orders}</strong>
            </span>
            <span className="text-zinc-400">
              Events <strong className="text-[#F5F1E8]">{result.events}</strong>
            </span>
            <span className="text-zinc-400">
              Delayed <strong className="text-[#f0a24a]">{result.delayed}</strong>
            </span>
          </div>

          {result.tabs.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-4">
              {result.tabs.map((tab) => (
                <span
                  key={tab.name}
                  className="text-[11px] px-2 py-0.5 rounded-md border border-white/10 bg-white/[0.04] text-zinc-300"
                >
                  {tab.name}
                </span>
              ))}
            </div>
          )}

          {result.spreadsheetUrl && (
            <a
              href={result.spreadsheetUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-sm font-semibold text-black gear-fill px-4 py-2.5 rounded-xl"
            >
              Open the sheet →
            </a>
          )}
        </div>
      )}
    </div>
  )
}
