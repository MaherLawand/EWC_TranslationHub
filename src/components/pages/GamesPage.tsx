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

const assignedUsers =
  users
    .filter((user) =>
      user.assignedGames?.some(
        (assignment: any) =>
          assignment.gameId ===
          selectedGameFilter
      )
    )
    .filter(
      (
        user,
        index,
        self
      ) =>
        index ===
        self.findIndex(
          (u) => u.id === user.id
        )
    )

const producers =
  assignedUsers.filter(
    (user) =>
      user.position ===
      "PRODUCER"
  )

const ppms =
  assignedUsers.filter(
    (user) =>
      user.position ===
      "POST_PRODUCTION_MANAGER"
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

                <div className="flex items-start gap-2">

  <span className="text-zinc-500 whitespace-nowrap">
    Producers
  </span>

  <div className="flex flex-wrap gap-2">

    {producers.length > 0 ? (
      producers.map(
        (producer: any) => (
          <span
            key={producer.id}
            className="
              px-2.5
              py-1
              rounded-lg
              bg-[#171717]
              border
              border-[#2A2A2A]
              text-white
              text-xs
              font-medium
            "
          >
            {producer.firstName}{" "}
{producer.lastName}
          </span>
        )
      )
    ) : (
      <span className="text-white font-medium">
        —
      </span>
    )}

  </div>

</div>

<div className="flex items-start gap-2">

  <span className="text-zinc-500 whitespace-nowrap">
    PPMs
  </span>

  <div className="flex flex-wrap gap-2">

    {ppms.length > 0 ? (
      ppms.map(
        (ppm: any) => (
          <span
            key={ppm.id}
            className="
              px-2.5
              py-1
              rounded-lg
              bg-[#171717]
              border
              border-[#2A2A2A]
              text-white
              text-xs
              font-medium
            "
          >
            {ppm.firstName}{" "}
{ppm.lastName}
          </span>
        )
      )
    ) : (
      <span className="text-white font-medium">
        —
      </span>
    )}

  </div>

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