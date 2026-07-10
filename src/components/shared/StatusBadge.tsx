export default function StatusBadge({
  status,
  showChevron = false,
}: {
  status: string | undefined
  /** Renders a small chevron (in the status color) to hint the badge is clickable. */
  showChevron?: boolean
}) {
  const styles = {
    PENDING:
      "bg-yellow-500/10 text-yellow-400 border border-yellow-500/20",

    READY_FOR_TRANSLATION:
      "bg-cyan-500/10 text-cyan-400 border border-cyan-500/20",

    IN_PROGRESS:
      "bg-blue-500/10 text-blue-400 border border-blue-500/20",

    COMPLETED:
      "bg-green-500/10 text-green-400 border border-green-500/20",
  }

  if (!status) return null

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium ${
        styles[
          status as keyof typeof styles
        ]
      }`}
    >
      {status.replace(/_/g, " ")}
      {showChevron && (
        // Inherits the badge's status color via currentColor.
        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0 opacity-80">
          <polyline points="6 9 12 15 18 9" />
        </svg>
      )}
    </span>
  )
}
