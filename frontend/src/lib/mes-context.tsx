import { MESES_ABREV } from "@/lib/utils"
import { createContext, useContext, useState } from "react"

interface MesContextValue {
  mes: number
  anio: number
  etiqueta: string
  irAnterior: () => void
  irSiguiente: () => void
  irHoy: () => void
}

const MesContext = createContext<MesContextValue | null>(null)

export function MesProvider({ children }: { children: React.ReactNode }) {
  const hoy = new Date()
  const [mes, setMes] = useState(hoy.getMonth() + 1)
  const [anio, setAnio] = useState(hoy.getFullYear())

  const irAnterior = () => {
    if (mes === 1) { setMes(12); setAnio((a) => a - 1) }
    else setMes((m) => m - 1)
  }

  const irSiguiente = () => {
    if (mes === 12) { setMes(1); setAnio((a) => a + 1) }
    else setMes((m) => m + 1)
  }

  const irHoy = () => {
    const h = new Date()
    setMes(h.getMonth() + 1)
    setAnio(h.getFullYear())
  }

  return (
    <MesContext.Provider value={{ mes, anio, etiqueta: `${MESES_ABREV[mes - 1]} ${anio}`, irAnterior, irSiguiente, irHoy }}>
      {children}
    </MesContext.Provider>
  )
}

export function useMes() {
  const ctx = useContext(MesContext)
  if (!ctx) throw new Error("useMes debe usarse dentro de MesProvider")
  return ctx
}

export function SelectorMes() {
  const { etiqueta, irAnterior, irSiguiente, irHoy } = useMes()
  const hoy = new Date()
  const esHoy = etiqueta === `${MESES_ABREV[hoy.getMonth()]} ${hoy.getFullYear()}`

  const btn = {
    background: "none", border: "none", cursor: "pointer",
    color: "#6198AE", fontSize: "0.70rem", padding: "0 2px", lineHeight: 1,
  }

  return (
    <div style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}>
      <button style={btn} onClick={irAnterior}
        onMouseEnter={(e) => (e.currentTarget.style.color = "#7DD3FC")}
        onMouseLeave={(e) => (e.currentTarget.style.color = "#6198AE")}
      >[&lt;]</button>
      <span style={{ color: "#7DD3FC", fontSize: "0.70rem", minWidth: "5.5rem", textAlign: "center" }}>
        {etiqueta}
      </span>
      <button style={btn} onClick={irSiguiente}
        onMouseEnter={(e) => (e.currentTarget.style.color = "#7DD3FC")}
        onMouseLeave={(e) => (e.currentTarget.style.color = "#6198AE")}
      >[&gt;]</button>
      {!esHoy && (
        <button style={{ ...btn, color: "#00ED64", marginLeft: "0.25rem" }} onClick={irHoy}
          onMouseEnter={(e) => (e.currentTarget.style.color = "#7EFFC0")}
          onMouseLeave={(e) => (e.currentTarget.style.color = "#00ED64")}
        >[hoy]</button>
      )}
    </div>
  )
}
