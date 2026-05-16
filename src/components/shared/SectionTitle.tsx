export default function SectionTitle({
  title,
}: {
  title: string
}) {
  return (
    <div className="mb-5">
      <h2 className="text-[#D6B36A] text-sm uppercase tracking-[0.25em] font-semibold mb-5">
  {title}
</h2>

      <div className="h-px bg-zinc-800 mt-3" />
    </div>
  )
} 