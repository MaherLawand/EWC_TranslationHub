import React from "react"

export function useGames({
  activePage,
  selectedGameFilter,
  fetchUsers,
}: any) {
  const [games, setGames] =
    React.useState<any[]>([])

  const [gameSearch, setGameSearch] =
    React.useState("")

  const [gameUsers, setGameUsers] = React.useState<{
    producers: any[]
    ppms: any[]
    users: any[]
  }>({ producers: [], ppms: [], users: [] })

  const [showAssignGamesModal, setShowAssignGamesModal] =
    React.useState(false)

  const [selectedUserForGames, setSelectedUserForGames] =
    React.useState<any>(null)

  const [selectedGames, setSelectedGames] =
    React.useState<string[]>([])

  const [isSavingAssignments, setIsSavingAssignments] =
    React.useState(false)

  const filteredGames = Array.isArray(games)
    ? games.filter((game) =>
        game.name?.toLowerCase().includes(gameSearch.toLowerCase())
      )
    : []

  React.useEffect(() => {
    const shouldFetch =
      activePage === "Broadcast" ||
      activePage === "my-games"

    if (!shouldFetch) return

    fetchGames()
  }, [activePage])

  React.useEffect(() => {
    const shouldFetch =
      activePage === "Broadcast" ||
      activePage === "my-games"

    if (!shouldFetch) return

    // A comma-joined value is a multi-game (whole-week) filter — there's no single
    // game to load assignees for, so clear and skip.
    if (!selectedGameFilter || selectedGameFilter.includes(",")) {
      setGameUsers({ producers: [], ppms: [], users: [] })
      return
    }

    fetchGameUsers(selectedGameFilter)
  }, [activePage, selectedGameFilter])

  async function fetchGames() {
    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/games`,
        { credentials: "include" }
      )
      if (!response.ok) throw new Error("Failed to fetch games")
      const data = await response.json()
      setGames(data)
    } catch (error) {
      console.error("Failed to fetch games:", error)
    }
  }

  async function fetchGameUsers(gameId: string) {
    try {
      if (!gameId) {
        setGameUsers({ producers: [], ppms: [], users: [] })
        return
      }
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/games/${gameId}/users`,
        { credentials: "include" }
      )
      if (!response.ok) throw new Error("Failed to fetch game users")
      const data = await response.json()
      setGameUsers({
        producers: Array.isArray(data.producers) ? data.producers : [],
        ppms: Array.isArray(data.ppms) ? data.ppms : [],
        users: Array.isArray(data.users) ? data.users : [],
      })
    } catch (error) {
      console.error(error)
      setGameUsers({ producers: [], ppms: [], users: [] })
    }
  }

  function openAssignGamesModal(user: any) {
    setSelectedUserForGames(user)
    setSelectedGames(
      user.assignedGames.map((assignment: any) => assignment.gameId)
    )
    setShowAssignGamesModal(true)
  }

  function toggleGame(gameId: string) {
    setSelectedGames((prev) =>
      prev.includes(gameId)
        ? prev.filter((id) => id !== gameId)
        : [...prev, gameId]
    )
  }

  async function saveAssignments() {
    try {
      setIsSavingAssignments(true)
      const res = await fetch(
        `${import.meta.env.VITE_API_URL}/auth/users/${selectedUserForGames.id}/games`,
        {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ gameIds: selectedGames }),
        }
      )
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.message || "Failed to save game assignments")
      }
      await fetchUsers()
      setShowAssignGamesModal(false)
    } catch (error) {
      console.error(error)
    } finally {
      setIsSavingAssignments(false)
    }
  }

  return {
    games,
    gameSearch,
    setGameSearch,
    gameUsers,
    filteredGames,
    showAssignGamesModal,
    setShowAssignGamesModal,
    selectedUserForGames,
    selectedGames,
    isSavingAssignments,
    fetchGames,
    openAssignGamesModal,
    toggleGame,
    saveAssignments,
  }
}
