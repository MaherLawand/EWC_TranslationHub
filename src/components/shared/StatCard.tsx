type Props = {
  title: string
  value: string
}

export default function StatCard({
  title,
  value,
}: Props) {
  return (
    <div
      className="
        relative
        overflow-hidden
        rounded-[30px]
        border
        border-[#242424]
        bg-[#0E0E0E]
        p-6
        shadow-[0_0_40px_rgba(0,0,0,0.4)]
        transition-all
        duration-300
        hover:border-[#343434]
        hover:shadow-[0_0_50px_rgba(214,179,106,0.08)]
      "
    >

      {/* GLOW */}
      <div
        className="
          absolute
          inset-0
          opacity-30
          pointer-events-none
        "
      />

      {/* CONTENT */}
      <div className="relative z-10">

        <p
          className="
            text-[12px]
            uppercase
            tracking-[0.18em]
            text-[#7A7A7A]
            font-medium
          "
        >
          {title}
        </p>

        <h3
          className="
            mt-4
            text-[38px]
            leading-none
            font-bold
            tracking-tight
            text-[#F5F1E8]
          "
        >
          {value}
        </h3>

      </div>

    </div>
  )
}