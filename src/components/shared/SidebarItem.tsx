export default function SidebarItem({
  label,
  active = false,
  onClick,
}: {
  label: string
  active?: boolean
  onClick?: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={`
        group
        relative
        w-full
        text-left
        px-5
        h-[54px]
        rounded-2xl
        overflow-hidden
        transition-all
        duration-300

        ${
          active
            ? `
              bg-[#D6B36A]
              text-black
              font-semibold
              shadow-[0_0_25px_rgba(214,179,106,0.18)]
            `
            : `
              text-zinc-400
              bg-transparent
              hover:bg-[#151515]
              hover:text-[#F5F1E8]
              hover:border-[#2D2D2D]
            `
        }
      `}
    >

      {/* ACTIVE GLOW */}
      {active && (
        <div
          className="
            absolute
            inset-0
            bg-[radial-gradient(circle_at_left,rgba(255,255,255,0.22),transparent_60%)]
            pointer-events-none
          "
        />
      )}

      <div className="relative z-10 flex items-center h-full">

        {/* ACTIVE DOT */}
        <div
          className={`
            w-2
            h-2
            rounded-full
            mr-3
            transition-all
            duration-300

            ${
              active
                ? "bg-black"
                : "bg-zinc-600 group-hover:bg-[#D6B36A]"
            }
          `}
        />

        <span
          className="
            text-sm
            tracking-[0.01em]
          "
        >
          {label}
        </span>

      </div>

    </button>
  )
}