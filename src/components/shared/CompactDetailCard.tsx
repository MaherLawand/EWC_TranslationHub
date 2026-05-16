
export default function CompactDetailCard({
  label,
  value,
}: {
  label: string
  value?: string
}) {
  return (
    <div className="bg-[#101010] border border-zinc-800 rounded-2xl p-4">

      <p className="text-xs uppercase tracking-wider text-zinc-500 mb-2">
        {label}
      </p>

      <p className="font-semibold text-sm whitespace-pre-line">
  {value}
</p>

    </div>
  )
}