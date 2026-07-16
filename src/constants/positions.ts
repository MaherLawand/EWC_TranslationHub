// User positions and translator-role helpers (mirrors server/src/lib/positions.ts).
// TRANSPERFECT and TARJAMA are vendor translator roles with the exact same
// visibility/behavior as TRANSLATOR.

export const TRANSLATOR_POSITIONS = ["TRANSLATOR", "TRANSPERFECT", "TARJAMA"] as const

export function isTranslatorPosition(position?: string | null): boolean {
  return !!position && (TRANSLATOR_POSITIONS as readonly string[]).includes(position)
}

// Human labels for every position value.
export const POSITION_LABELS: Record<string, string> = {
  PRODUCER: "Producer",
  POST_PRODUCTION_MANAGER: "Post Production Manager",
  TRANSLATOR: "Translator",
  TRANSPERFECT: "TransPerfect",
  TARJAMA: "Tarjama",
  EDITOR: "Editor",
  VIDEO_EDITOR: "Video Editor",
  VIEWER: "Viewer",
}

// Options for the user-position dropdown (order matters for display).
export const POSITION_OPTIONS: { value: string; label: string }[] = [
  { value: "PRODUCER", label: "Producer" },
  { value: "POST_PRODUCTION_MANAGER", label: "Post Production Manager" },
  { value: "TRANSLATOR", label: "Translator" },
  { value: "TRANSPERFECT", label: "TransPerfect" },
  { value: "TARJAMA", label: "Tarjama" },
  { value: "VIDEO_EDITOR", label: "Video Editor" },
  { value: "VIEWER", label: "Viewer" },
]

// The three roles the source-file notification pills let you choose from.
export const NOTIFY_POSITION_OPTIONS: { value: string; label: string }[] = [
  { value: "TRANSLATOR", label: "Translator" },
  { value: "TRANSPERFECT", label: "TransPerfect" },
  { value: "TARJAMA", label: "Tarjama" },
]
