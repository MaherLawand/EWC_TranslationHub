export default function StatusBadge({
  status,
}: {
  status: string | undefined
}) {
  const styles = {
    PENDING:
      "bg-yellow-500/10 text-yellow-400 border border-yellow-500/20",

    IN_PROGRESS:
      "bg-blue-500/10 text-blue-400 border border-blue-500/20",

    COMPLETED:
      "bg-green-500/10 text-green-400 border border-green-500/20",
  }

  if (!status) return null

  return (
    <span
      className={`px-3 py-1 rounded-full text-sm font-medium ${
        styles[
          status as keyof typeof styles
        ]
      }`}
    >
      {status.replace("_", " ")}
    </span>
  )
}