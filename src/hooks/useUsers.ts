import React from "react"

export function useUsers() {
  const [users, setUsers] =
    React.useState<any[]>([])

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

  async function fetchUsers() {
    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/auth/getAllUsers`,
        { credentials: "include" }
      )
      if (!response.ok) throw new Error("Failed to fetch users")
      const data = await response.json()
      setUsers(Array.isArray(data.users) ? data.users : [])
    } catch (error) {
      console.error("Failed to fetch users:", error)
    }
  }

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
      role: user.role || "EDITOR",
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
        alert(data.message)
        return
      }
      setUsers((prev) => [data, ...prev])
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

  async function deleteUser(userId: string) {
    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/auth/users/${userId}`,
        { method: "DELETE", credentials: "include" }
      )
      const data = await response.json()
      if (!response.ok) {
        alert(data.message)
        return
      }
      setUsers((prev) => prev.filter((u) => u.id !== userId))
    } catch (error) {
      console.error(error)
    }
  }

  return {
    users,
    setUsers,
    userSearch,
    setUserSearch,
    showUserModal,
    setShowUserModal,
    selectedUser,
    isEditingUser,
    userForm,
    setUserForm,
    isSavingUser,
    fetchUsers,
    openCreateUserModal,
    openEditUserModal,
    createUser,
    updateUser,
    deleteUser,
  }
}
