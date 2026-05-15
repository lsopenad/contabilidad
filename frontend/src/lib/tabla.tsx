import { ArrowDown, ArrowUp } from "lucide-react"
import { useState } from "react"

export type Direccion = "asc" | "desc"

export function useSorte<T>(
  datos: T[],
  campoInicial: string,
  dirInicial: Direccion,
  valorDe: (item: T, campo: string) => string | number,
) {
  const [campo, setCampo] = useState(campoInicial)
  const [dir, setDir] = useState<Direccion>(dirInicial)

  const ordenarPor = (c: string) => {
    if (c === campo) {
      setDir((d) => (d === "asc" ? "desc" : "asc"))
    } else {
      setCampo(c)
      setDir("asc")
    }
  }

  const ordenados = [...datos].sort((a, b) => {
    const va = valorDe(a, campo)
    const vb = valorDe(b, campo)
    if (va < vb) return dir === "asc" ? -1 : 1
    if (va > vb) return dir === "asc" ? 1 : -1
    return 0
  })

  return { ordenados, campo, dir, ordenarPor }
}

export function ThSort({ label, campo, actual, dir, onClick, color = "#4ec9b0" }: {
  label: string
  campo: string
  actual: string
  dir: Direccion
  onClick: (c: string) => void
  color?: string
}) {
  const activo = campo === actual
  return (
    <th
      onClick={() => onClick(campo)}
      style={{
        textAlign: "left",
        padding: "4px 12px",
        color: activo ? "#888" : "#333",
        cursor: "pointer",
        userSelect: "none",
        whiteSpace: "nowrap",
      }}
    >
      {label}
      {activo && (
        <span style={{ marginLeft: "0.3rem", display: "inline-flex", verticalAlign: "middle", color }}>
          {dir === "asc" ? <ArrowUp size={10} /> : <ArrowDown size={10} />}
        </span>
      )}
    </th>
  )
}
