import React from "react"
import { toast } from "react-toastify"

export function useUsers() {
  const [users, setUsers] =
    React.useState<any[]>([])

  const [lockedUsers, setLockedUsers] =
    React.useState<{ email: string; remainingSeconds: number }[]>([])

  const [isClearingLockout, setIsClearingLockout] =
    React.useState<string | null>(null) // email currently being cleared

  const [usersPage, setUsersPage] =
    React.useState(1)

  const [usersTotalPages, setUsersTotalPages] =
    React.useState(1)

  const [isLoadingUsers, setIsLoadingUsers] =
    React.useState(false)

  const [userSearch, setUserSearch] =
    React.useState("")

  const [showUserModal, setShowUserModal] =
    React.useState(false)

  const [selectedUser, setSelectedUser] =
    React.useState<any>(null)

  const [isEditingUser, setIsEditingUser] =
    React.useState(false)

  const [userForm, setUserForm] = React.useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    role: "",
    isActive: "",
    department: "",
    position: "",
  })

  const [isSavingUser, setIsSavingUser] =
    React.useState(false)

  // Abort ref so we can cancel in-flight fetches when params change
  const abortRef = React.useRef<AbortController | null>(null)

  async function fetchUsers(page = 1, search = "") {
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller
    setIsLoadingUsers(true)
    try {
      const params = new URLSearchParams()
      params.append("page", String(page))
      if (search.trim()) params.append("search", search.trim())

      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/auth/getAllUsers?${params.toString()}`,
        { credentials: "include", signal: controller.signal }
      )
      if (!response.ok) throw new Error("Failed to fetch users")
      const data = await response.json()
      setUsers(Array.isArray(data.users) ? data.users : [])
      setUsersTotalPages(data.totalPages || 1)
      setUsersPage(data.page || page)
    } catch (error: any) {
      if (error?.name !== "AbortError") console.error("Failed to fetch users:", error)
    } finally {
      if (abortRef.current === controller) setIsLoadingUsers(false)
    }
  }

  // Re-fetch whenever search changes (debounced 300 ms)
  const searchDebounceRef = React.useRef<ReturnType<typeof setTimeout> | null>(null)
  React.useEffect(() => {
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current)
    searchDebounceRef.current = setTimeout(() => {
      fetchUsers(1, userSearch)
    }, 300)
    return () => {
      if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current)
    }
  }, [userSearch])

  function openCreateUserModal() {
    setIsEditingUser(false)
    setSelectedUser(null)
    setUserForm({
      firstName: "",
      lastName: "",
      email: "",
      password: "",
      role: "",
      isActive: "",
      department: "",
      position: "",
    })
    setShowUserModal(true)
  }

  function openEditUserModal(user: any) {
    setIsEditingUser(true)
    setSelectedUser(user)
    setUserForm({
      firstName: user.firstName || "",
      lastName: user.lastName || "",
      email: user.email || "",
      password: "",
      role: user.role || "USER",
      department: user.department || "BROADCAST",
      position: user.position || "",
      isActive: user.isActive || false,
    })
    setShowUserModal(true)
  }

  async function createUser() {
    if (isSavingUser) return
    try {
      setIsSavingUser(true)
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/auth/users`,
        {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(userForm),
        }
      )
      const data = await response.json()
      if (!response.ok) {
        toast.error(data.message || "Failed to create user")
        return
      }
      // Re-fetch page 1 so new user appears at top
      await fetchUsers(1, userSearch)
      setShowUserModal(false)
    } catch (error) {
      console.error(error)
    } finally {
      setIsSavingUser(false)
    }
  }

  async function updateUser() {
    if (isSavingUser) return
    try {
      setIsSavingUser(true)
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/auth/users/${selectedUser.id}`,
        {
          method: "PATCH",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(userForm),
        }
      )
      if (!response.ok) throw new Error("Failed to update user")
      const updated = await response.json()
      // Update in-place so we don't lose page position
      setUsers((prev) =>
        prev.map((u) => (u.id === updated.id ? updated : u))
      )
      setShowUserModal(false)
    } catch (error) {
      console.error(error)
    } finally {
      setIsSavingUser(false)
    }
  }

  async function fetchLockedUsers() {
    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/auth/locked-users`,
        { credentials: "include" }
      )
      if (!response.ok) return
      const data = await response.json()
      setLockedUsers(Array.isArray(data) ? data : [])
    } catch {
      // silently ignore — non-critical
    }
  }

  async function clearLockout(email: string) {
    if (isClearingLockout) return
    try {
      setIsClearingLockout(email)
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/auth/users/clear-lockout`,
        {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email }),
        }
      )
      const data = await response.json()
      if (!response.ok) {
        toast.error(data.message || "Failed to clear lockout")
        return
      }
      toast.success(`Lockout cleared for ${email}`)
      setLockedUsers((prev) => prev.filter((u) => u.email !== email))
    } catch {
      toast.error("Failed to clear lockout")
    } finally {
      setIsClearingLockout(null)
    }
  }

  async function deleteUser(userId: string) {
    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/auth/users/${userId}`,
        { method: "DELETE", credentials: "include" }
      )
      const data = await response.json()
      if (!response.ok) {
        toast.error(data.message || "Failed to delete user")
        return
      }
      // Re-fetch current page so counts stay accurate
      await fetchUsers(usersPage, userSearch)
    } catch (error) {
      console.error(error)
    }
  }

  return {
    users,
    setUsers,
    usersPage,
    usersTotalPages,
    isLoadingUsers,
    fetchUsers,
    userSearch,
    setUserSearch,
    showUserModal,
    setShowUserModal,
    selectedUser,
    isEditingUser,
    userForm,
    setUserForm,
    isSavingUser,
    openCreateUserModal,
    openEditUserModal,
    createUser,
    updateUser,
    deleteUser,
    lockedUsers,
    fetchLockedUsers,
    clearLockout,
    isClearingLockout,
  }
}
