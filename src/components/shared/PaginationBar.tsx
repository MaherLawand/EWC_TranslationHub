import React from "react"

type Props = {
  page: number
  totalPages: number
  onPageChange: (page: number) => void
}

export default function PaginationBar({ page, totalPages, onPageChange }: Props) {
  // Which ellipsis slot is currently being edited: "left" | "right" | null
  const [editingSlot, setEditingSlot] = React.useState<"left" | "right" | null>(null)
  const [inputValue, setInputValue] = React.useState("")
  const inputRef = React.useRef<HTMLInputElement>(null)

  // Focus the input whenever a slot becomes active
  React.useEffect(() => {
    if (editingSlot) {
      setInputValue("")
      setTimeout(() => inputRef.current?.focus(), 0)
    }
  }, [editingSlot])

  function commit() {
    const n = parseInt(inputValue, 10)
    if (!isNaN(n) && n >= 1 && n <= totalPages) {
      onPageChange(n)
    }
    setEditingSlot(null)
    setInputValue("")
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") commit()
    if (e.key === "Escape") { setEditingSlot(null); setInputValue("") }
  }

  // Build page tokens — first page, window around current, last page
  function getPageTokens(): (number | "left-ellipsis" | "right-ellipsis")[] {
    if (totalPages <= 1) return [1]

    const delta = 1
    const rangeStart = Math.max(2, page - delta)
    const rangeEnd = Math.min(totalPages - 1, page + delta)

    const tokens: (number | "left-ellipsis" | "right-ellipsis")[] = []

    tokens.push(1)
    if (rangeStart > 2) tokens.push("left-ellipsis")
    for (let p = rangeStart; p <= rangeEnd; p++) tokens.push(p)
    if (rangeEnd < totalPages - 1) tokens.push("right-ellipsis")
    if (totalPages > 1) tokens.push(totalPages)

    return tokens
  }

  const tokens = getPageTokens()

  const ellipsisClass = `
    w-[38px] h-[38px] rounded-xl border border-[#2A2A2A] bg-[#151515]
    text-zinc-400 text-sm font-semibold flex items-center justify-center
    cursor-pointer hover:border-[#D6B36A] hover:text-white transition-all
    select-none
  `

  const inputClass = `
    w-[38px] h-[38px] rounded-xl border border-[#D6B36A] bg-[#1A1A1A]
    text-white text-sm font-semibold text-center outline-none
    shadow-[0_0_12px_rgba(214,179,106,0.15)]
    [appearance:textfield]
    [&::-webkit-outer-spin-button]:appearance-none
    [&::-webkit-inner-spin-button]:appearance-none
  `

  return (
    <div
      className="
        sticky bottom-0 z-30
        px-7 py-5
        border-t border-[#242424]
        flex items-center justify-center gap-1.5
        bg-[#101010]/95 backdrop-blur-xl
      "
    >

      {/* Previous */}
      <button
        disabled={page === 1}
        onClick={() => onPageChange(page - 1)}
        className="
          h-[38px] px-4 rounded-xl
          border border-[#2A2A2A] bg-[#151515]
          text-sm font-medium text-zinc-300
          transition-all hover:border-[#D6B36A] hover:text-white
          disabled:opacity-40 disabled:cursor-not-allowed
          mr-1
        "
      >
        Previous
      </button>

      {/* Page tokens */}
      {tokens.map((token, i) => {
        if (token === "left-ellipsis" || token === "right-ellipsis") {
          const slot = token === "left-ellipsis" ? "left" : "right"
          const isEditing = editingSlot === slot

          return isEditing ? (
            <input
              key={token}
              ref={inputRef}
              type="number"
              min={1}
              max={totalPages}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onBlur={commit}
              onKeyDown={handleKeyDown}
              placeholder="…"
              className={inputClass}
            />
          ) : (
            <button
              key={token}
              onClick={() => setEditingSlot(slot)}
              className={ellipsisClass}
              title="Click to jump to page"
            >
              ···
            </button>
          )
        }

        // Regular page number
        const active = token === page
        return (
          <button
            key={token}
            onClick={() => onPageChange(token)}
            className={`
              w-[38px] h-[38px] rounded-xl text-sm font-semibold transition-all
              ${active
                ? "bg-[#D6B36A] text-black shadow-[0_0_20px_rgba(214,179,106,0.25)]"
                : "border border-[#2A2A2A] bg-[#151515] text-zinc-400 hover:border-[#D6B36A] hover:text-white"
              }
            `}
          >
            {token}
          </button>
        )
      })}

      {/* Next */}
      <button
        disabled={page === totalPages}
        onClick={() => onPageChange(page + 1)}
        className="
          h-[38px] px-4 rounded-xl
          border border-[#2A2A2A] bg-[#151515]
          text-sm font-medium text-zinc-300
          transition-all hover:border-[#D6B36A] hover:text-white
          disabled:opacity-40 disabled:cursor-not-allowed
          ml-1
        "
      >
        Next
      </button>

    </div>
  )
}
