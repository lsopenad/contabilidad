import { useState } from "react"

export function useDialogoCrud<T>() {
  const [abierto, setAbierto] = useState(false)
  const [editando, setEditando] = useState<T | null>(null)
  const [confirmandoId, setConfirmandoId] = useState<number | null>(null)
  return { abierto, setAbierto, editando, setEditando, confirmandoId, setConfirmandoId }
}
