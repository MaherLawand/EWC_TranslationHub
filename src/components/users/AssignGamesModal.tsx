import { useState, useEffect } from "react"
import Select from "react-select"
import { gearWarp } from "../../lib/gearHover"

type Props = {
  show: boolean
  onClose: () => void
  games: any[]
  selectedGames: string[]
  isSavingAssignments: boolean
  toggleGame: (gameId: string) => void
  saveAssignments: () => void
  user: any
}

export default function AssignGamesModal({
  show,
  onClose,
  games,
  selectedGames,
  toggleGame,
  saveAssignments,
  isSavingAssignments,
  user,
}: Props) {
  const [initialGames, setInitialGames] = useState<string[]>([])
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false)

  // Re-snapshot every time the modal opens so isDirty starts false
  useEffect(() => {
    if (show) {
      setInitialGames([...selectedGames])
      setShowDiscardConfirm(false)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [show])

  if (!show) return null

  const isDirty =
    JSON.stringify([...selectedGames].sort()) !==
    JSON.stringify([...initialGames].sort())

  function tryClose() {
    if (isDirty) {
      setShowDiscardConfirm(true)
    } else {
      onClose()
    }
  }

  const darkSelectStyles = {
    control: (base: any) => ({
      ...base,
      backgroundColor: "rgba(255,255,255,0.10)",
      borderColor: "rgba(255,255,255,0.20)",
      minHeight: 48,
      borderRadius: 16,
      boxShadow: "none",
      ":hover": { borderColor: "#D6B36A" },
    }),
    menuPortal: (base: any) => ({ ...base, zIndex: 9999 }),
    menu: (base: any) => ({
      ...base,
      backgroundColor: "#111111",
      border: "1px solid #242424",
      borderRadius: 16,
      overflow: "hidden",
      boxShadow: "0 0 40px rgba(0,0,0,0.6)",
    }),
    menuList: (base: any) => ({
      ...base,
      backgroundColor: "#111111",
      padding: 8,
    }),
    option: (base: any, state: any) => ({
      ...base,
      backgroundColor: state.isFocused ? "#1A1A1A" : "transparent",
      color: state.isFocused ? "#F5F1E8" : "#A1A1AA",
      borderRadius: 10,
      cursor: "pointer",
      fontSize: 14,
      marginBottom: 2,
    }),
    multiValue: (base: any) => ({
      ...base,
      backgroundColor: "#1A1A1A",
      border: "1px solid #2A2A2A",
      borderRadius: 8,
      paddingLeft: 4,
    }),
    multiValueLabel: (base: any) => ({
      ...base,
      color: "#F5F1E8",
      fontSize: 12,
      fontWeight: 500,
    }),
    multiValueRemove: (base: any) => ({
      ...base,
      color: "#71717a",
      ":hover": { backgroundColor: "#2A2A2A", color: "white" },
    }),
    input: (base: any) => ({ ...base, color: "#F5F1E8" }),
    placeholder: (base: any) => ({ ...base, color: "#8b8b93" }),
    singleValue: (base: any) => ({ ...base, color: "#F5F1E8" }),
  }

  return (
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-0 sm:p-4"
      onClick={tryClose}
    >
      <div
        className="bg-[#0C0C0C]/95 border border-white/10 backdrop-blur-2xl rounded-t-3xl sm:rounded-3xl w-full sm:max-w-[600px] shadow-[0_20px_80px_rgba(0,0,0,0.6)] flex flex-col max-h-[95vh] sm:max-h-[90vh] relative"
        onClick={(e) => e.stopPropagation()}
      >

        {/* HEADER */}
        <div className="flex items-center justify-between px-8 pt-7 pb-5 border-b border-white/10 bg-[radial-gradient(ellipse_80%_60%_at_top,rgba(214,179,106,0.08),transparent_70%)] rounded-t-3xl flex-shrink-0">
          <div>
            <p className="text-xs font-semibold tracking-[0.18em] uppercase text-[#D6B36A]/70 mb-1">
              {user?.firstName} {user?.lastName}
            </p>
            <h2 className="text-xl font-bold text-gear-gradient w-fit">Assign Games</h2>
          </div>
          <button
            onClick={tryClose}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-white/10 border border-white/10 text-zinc-300 hover:text-white hover:bg-white/20 transition text-sm"
          >
            ✕
          </button>
        </div>

        {/* BODY */}
        <div className="flex-1 overflow-auto dark-scroll p-8">
          <div className="bg-white/[0.04] border border-white/10 rounded-[28px] p-6 shadow-[0_8px_40px_rgba(0,0,0,0.35)]">
            <h3 className="text-sm font-semibold text-[#F5F1E8] mb-4">Game Assignments</h3>
            <div>
              <label className="text-xs font-medium text-zinc-500 mb-2 block tracking-wide">
                Assigned Games
              </label>
              <Select
                isMulti
                styles={darkSelectStyles}
                options={games.map((game) => ({ value: game.id, label: game.name }))}
                value={games
                  .filter((game) => selectedGames.includes(game.id))
                  .map((game) => ({ value: game.id, label: game.name }))}
                onChange={(selected) => {
                  const values = selected?.map((item: any) => item.value) || []
                  selectedGames.forEach((id) => {
                    if (!values.includes(id)) toggleGame(id)
                  })
                  values.forEach((id: string) => {
                    if (!selectedGames.includes(id)) toggleGame(id)
                  })
                }}
                menuPortalTarget={document.body}
                menuPosition="fixed"
                placeholder="Search games..."
                className="text-sm"
              />
            </div>
          </div>
        </div>

        {/* FOOTER */}
        <div className="border-t border-white/10 bg-white/[0.02] p-6 rounded-b-3xl flex-shrink-0">
          <button
            disabled={isSavingAssignments || !isDirty}
            onClick={saveAssignments}
            onMouseMove={gearWarp}
            className={`w-full py-3.5 rounded-2xl font-semibold transition flex items-center justify-center gap-3 ${
              isSavingAssignments || !isDirty
                ? "bg-[#1A1A1A] text-zinc-600 cursor-not-allowed border border-[#2A2A2A]"
                : "btn-gear"
            }`}
          >
            {isSavingAssignments && (
              <div className="w-4 h-4 border-2 border-zinc-600 border-t-transparent rounded-full animate-spin" />
            )}
            {isSavingAssignments ? "Saving Assignments..." : "Save Assignments"}
          </button>
        </div>

        {/* DISCARD CONFIRM OVERLAY */}
        {showDiscardConfirm && (
          <div className="absolute inset-0 bg-black/75 backdrop-blur-md flex items-center justify-center rounded-t-3xl sm:rounded-3xl z-10 px-6">
            <div className="bg-[#0C0C0C]/95 border border-white/10 backdrop-blur-2xl rounded-2xl p-6 w-full max-w-xs shadow-[0_20px_60px_rgba(0,0,0,0.6)]">
              <p className="text-[#F5F1E8] font-semibold text-sm mb-1">Discard changes?</p>
              <p className="text-zinc-500 text-xs mb-5">You have unsaved changes that will be lost if you close.</p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowDiscardConfirm(false)}
                  className="flex-1 py-2.5 rounded-xl border border-white/15 bg-white/5 text-zinc-300 text-sm hover:text-white hover:bg-white/10 transition"
                >
                  Keep Editing
                </button>
                <button
                  onClick={onClose}
                  className="flex-1 py-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm hover:bg-red-500/20 transition"
                >
                  Discard
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
