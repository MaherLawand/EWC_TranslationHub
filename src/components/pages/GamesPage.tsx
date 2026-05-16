import React from "react"

type Props = {
  games: any[]

  selectedGameFilter: string

  setSelectedGameFilter: (
    gameId: string
  ) => void
  users: any[]
}

export default function GamesPage({
  games,
  selectedGameFilter,
  setSelectedGameFilter,
  users,
}: Props) {
function getGameLogo(
  logo: string
) {
  return logo
}

const selectedGame =
  games.find(
    (g) =>
      g.id ===
      selectedGameFilter
  )

const producer =
  users.find(
    (user) =>
      user.position ===
        "PRODUCER" &&

      user.assignedGames?.some(
        (assignment: any) =>
          assignment.gameId ===
          selectedGameFilter
      )
  )

const ppm =
  users.find(
    (user) =>
      user.position ===
        "POST_PRODUCTION_MANAGER" &&

      user.assignedGames?.some(
        (assignment: any) =>
          assignment.gameId ===
          selectedGameFilter
      )
  )
const [gameSearch, setGameSearch] =
  React.useState("")

const filteredGames =
  games.filter((game) =>
    game.name
      ?.toLowerCase()
      .includes(
        gameSearch.toLowerCase()
      )
  )
  return (
<>
  {selectedGameFilter &&
    selectedGame && (
      <div
        className="
          mb-5
          rounded-[24px]
          border
          border-[#242424]
          bg-[#0E0E0E]
          px-5
          py-4
          shadow-[0_10px_30px_rgba(0,0,0,0.30)]
        "
      >

        <div
          className="
            flex
            items-center
            justify-between
            gap-5
          "
        >

          {/* LEFT */}
          <div className="flex items-center gap-4 min-w-0">

            {/* LOGO */}
            <div
              className="
                w-[58px]
                h-[58px]
                rounded-2xl
                border
                border-[#242424]
                bg-[#121212]
                flex
                items-center
                justify-center
                flex-shrink-0
              "
            >

              <img
                src={selectedGame.logo}
                alt={selectedGame.name}
                className="
                  w-[38px]
                  h-[38px]
                  object-contain
                "
              />

            </div>

            {/* INFO */}
            <div className="min-w-0">

              <p
                className="
                  text-[10px]
                  uppercase
                  tracking-[0.24em]
                  text-[#D6B36A]
                  font-semibold
                  mb-1
                "
              >
                Selected Game
              </p>

              <h3
                className="
                  text-[22px]
                  font-bold
                  tracking-tight
                  text-[#F5F1E8]
                  truncate
                "
              >
                {selectedGame.name}
              </h3>

              {/* TEAM */}
              <div
                className="
                  flex
                  items-center
                  gap-5
                  mt-2
                  text-sm
                "
              >

                <div className="flex items-center gap-2">

                  <span className="text-zinc-500">
                    Producer
                  </span>

                  <span className="text-white font-medium">
                    {producer?.name ||
                      "—"}
                  </span>

                </div>

                <div className="flex items-center gap-2">

                  <span className="text-zinc-500">
                    PPM
                  </span>

                  <span className="text-white font-medium">
                    {ppm?.name || "—"}
                  </span>

                </div>

              </div>

            </div>

          </div>


        </div>

      </div>
    )}
</>
  )
}