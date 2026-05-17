
import Select from "react-select"


type Props = {
  show: boolean

  onClose: () => void

  games: any[]

  selectedGames: string[]
isSavingAssignments: boolean
  toggleGame: (
    gameId: string
  ) => void

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
  if (!show) {
    return null
  }
  const darkSelectStyles = {
  control: (base: any) => ({
    ...base,
    backgroundColor: "#000000",
    borderColor: "#3f3f46",
    minHeight: 52,
    borderRadius: 16,
    boxShadow: "none",

    ":hover": {
      borderColor: "#52525b",
    },
  }),

  menu: (base: any) => ({
    ...base,
    backgroundColor: "#09090b",
    border: "1px solid #27272a",
    borderRadius: 16,
    overflow: "hidden",
    zIndex: 9999,
  }),

  menuList: (base: any) => ({
    ...base,
    backgroundColor: "#09090b",
    padding: 8,
  }),

  option: (
    base: any,
    state: any
  ) => ({
    ...base,
    backgroundColor: state.isFocused
      ? "#18181b"
      : "#09090b",
    color: "white",
    borderRadius: 10,
    cursor: "pointer",
    fontSize: 14,
    marginBottom: 4,
  }),

  multiValue: (base: any) => ({
    ...base,
    backgroundColor: "#18181b",
    border: "1px solid #27272a",
    borderRadius: 10,
    paddingLeft: 4,
  }),

  multiValueLabel: (
    base: any
  ) => ({
    ...base,
    color: "white",
    fontSize: 12,
    fontWeight: 500,
  }),

  multiValueRemove: (
    base: any
  ) => ({
    ...base,
    color: "#a1a1aa",

    ":hover": {
      backgroundColor: "#27272a",
      color: "white",
    },
  }),

  input: (base: any) => ({
    ...base,
    color: "white",
  }),

  placeholder: (
    base: any
  ) => ({
    ...base,
    color: "#71717a",
  }),

  singleValue: (
    base: any
  ) => ({
    ...base,
    color: "white",
  }),
}
  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">

      <div className="bg-[#0E0E0E] border border-zinc-800 rounded-3xl p-8 w-[650px]">

        <div className="flex items-center justify-between mb-8">

          <div>
            <h2 className="text-2xl font-bold">
              Assign Games
            </h2>

            <p className="text-zinc-500 mt-2">
              {user?.name}
            </p>
          </div>

          <button
            onClick={onClose}
            className="text-zinc-500 hover:text-white"
          >
            ✕
          </button>

        </div>

        <div className="space-y-3">


<div>
  <label className="text-sm text-zinc-400 mb-2 block">
    Assigned Games
  </label>

  <Select
    isMulti
    styles={darkSelectStyles}
    options={games.map(
      (game) => ({
        value: game.id,
        label: game.name,
      })
    )}

    value={games
      .filter((game) =>
        selectedGames.includes(
          game.id
        )
      )
      .map((game) => ({
        value: game.id,
        label: game.name,
      }))}

onChange={(selected) => {

  const values =
    selected?.map(
      (item: any) =>
        item.value
    ) || []

  // remove unselected
  selectedGames.forEach(
    (id) => {
      if (
        !values.includes(id)
      ) {
        toggleGame(id)
      }
    }
  )

  // add newly selected
  values.forEach(
    (id: string) => {
      if (
        !selectedGames.includes(id)
      ) {
        toggleGame(id)
      }
    }
  )
}}

    placeholder="Search games..."
    className="text-sm"
  />
</div>

</div>

       <button
  disabled={isSavingAssignments}
  onClick={saveAssignments}
  className={`w-full mt-8 py-4 rounded-xl font-semibold transition ${
    isSavingAssignments
      ? "bg-zinc-700 text-zinc-400 cursor-not-allowed"
      : "bg-white text-black hover:opacity-90"
  }`}
>
  {isSavingAssignments
    ? "Saving Assignments..."
    : "Save Assignments"}
</button>

      </div>

    </div>
  )
}