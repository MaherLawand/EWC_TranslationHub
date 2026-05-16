import React from "react"

export default function DeliveryCard({
  delivery,
  onUpdate,
}: {
  delivery: any
  onUpdate: (delivery: any) => void
}) {
  const [value, setValue] =
    React.useState(
      delivery.deliveryLink || ""
    )

  const [saving, setSaving] =
    React.useState(false)

  async function saveLink() {
    try {
      setSaving(true)

      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/orders/deliveries/${delivery.id}`,
        {
          method: "PATCH",

          credentials: "include",

          headers: {
            "Content-Type":
              "application/json",
          },

          body: JSON.stringify({
            deliveryLink: value,
          }),
        }
      )

      const updated =
        await response.json()

      onUpdate(updated)
    } catch (error) {
      console.error(error)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 space-y-3">

      <div className="flex items-center justify-between">
        <p className="font-medium">
          {delivery.language}
        </p>

        <button
          onClick={saveLink}
          disabled={saving}
          className="bg-white text-black px-3 py-1 rounded-lg text-sm font-medium"
        >
          {saving
            ? "Saving..."
            : "Save"}
        </button>
      </div>

      <input
        value={value}
        onChange={(e) =>
          setValue(e.target.value)
        }
        placeholder="Paste delivery drive link..."
        className="w-full bg-black border border-zinc-700 rounded-xl px-4 py-3 outline-none"
      />

    </div>
  )
}