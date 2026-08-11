// ── ADMIN STATISTICS (removable feature) ──
//
// Container for the admin Statistics area. Three tabs:
//   • Main             — overview charts (KPIs, mix, top games, languages, status).
//   • Weekly Breakdown — the week-by-week (broadcast) / per-title (marketing) table.
//   • Daily Report     — VIEW-ONLY late/early report (DailyReportView), live from
//                        the DB, for all admins. The CSV-upload → Google Sheets
//                        version is a separate owner-only page in the sidebar.
//
// A GLOBAL Broadcast ⇄ Marketing toggle sits in the header and drives both the
// Main and Weekly Breakdown tabs. All three tabs are available to any admin
// (this page only renders for admins).
//
// To remove the whole feature: delete this file, AnalyticsDashboard.tsx, the
// analytics server route/controller, and the wiring in DashboardPage.tsx +
// Sidebar.tsx. (DailyReportPage.tsx is the pre-existing upload report.)
import React from "react"
import AnalyticsDashboard from "./AnalyticsDashboard"
import DailyReportView from "./DailyReportView"

type Tab = "main" | "weekly" | "daily"
type Kind = "broadcast" | "marketing"

export default function StatisticsPage({ event = "EWC" }: { event?: string }) {
  const [tab, setTab] = React.useState<Tab>("main")
  const [kind, setKind] = React.useState<Kind>("broadcast")

  const tabs: { key: Tab; label: string }[] = [
    { key: "main", label: "Main" },
    { key: "weekly", label: "Weekly Breakdown" },
    { key: "daily", label: "Daily Report" },
  ]

  return (
    <div className="max-w-[1200px] mx-auto px-1 py-2">
      {/* Work-in-progress marquee — infinite scroll, left → right. */}
      <WipBanner />

      <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-gear-gradient w-fit">Statistics</h1>

        {/* Global Broadcast / Marketing toggle — drives all tabs. */}
        <div className="relative grid grid-cols-2 bg-[#111111] border border-[#242424] rounded-2xl p-1">
          {(["broadcast", "marketing"] as const).map((k) => (
            <button
              key={k}
              onClick={() => setKind(k)}
              className={`relative z-10 h-[38px] px-5 rounded-xl text-sm font-semibold capitalize transition ${
                kind === k ? "gear-fill text-black" : "text-zinc-500 hover:text-white"
              }`}
            >
              {k}
            </button>
          ))}
        </div>
      </div>

      {/* Tab bar */}
      <div className="inline-flex bg-[#111111] border border-[#242424] rounded-2xl p-1 mb-6">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`h-[40px] px-5 rounded-xl text-sm font-semibold transition ${
              tab === t.key ? "gear-fill text-black" : "text-zinc-500 hover:text-white"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {(tab === "main" || tab === "weekly") && (
        <AnalyticsDashboard event={event} kind={kind} view={tab === "weekly" ? "weekly" : "main"} />
      )}
      {tab === "daily" && <DailyReportView event={event} kind={kind} />}
    </div>
  )
}

/** Infinite left→right "Work in progress" marquee. */
function WipBanner() {
  const group = Array.from({ length: 8 })
  return (
    <div className="relative overflow-hidden rounded-2xl border border-[#D6B36A]/30 bg-[#D6B36A]/[0.08] mb-5">
      <style>{`@keyframes wipMarquee { from { transform: translateX(-50%); } to { transform: translateX(0); } }`}</style>
      <div
        className="flex w-max whitespace-nowrap py-2"
        style={{ animation: "wipMarquee 22s linear infinite" }}
      >
        {[0, 1].map((g) => (
          <div key={g} className="flex shrink-0">
            {group.map((_, i) => (
              <span key={i} className="mx-8 text-[12px] font-bold uppercase tracking-[0.28em] text-[#D6B36A] select-none">
                Work in progress
              </span>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}
