export default function DetailRow({
  label,
  value,
}: {
  label: string
  value?: string
}) {
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4">
      <p className="text-sm text-zinc-500">
        {label}
      </p>

      <p className="mt-2 font-medium break-all">
        {value}
      </p>
    </div>
  )
}