import { api } from "@/lib/api"
import { formatearEuros } from "@/lib/utils"
import { useQuery } from "@tanstack/react-query"

const MESES = ["ene","feb","mar","abr","may","jun","jul","ago","sep","oct","nov","dic"]

interface ResumenMes {
  mes: number; anio: number
  total_ingresos: string; total_gastos: string
}
interface InformeAnual {
  anio: number; meses: ResumenMes[]
  total_ingresos: string; total_gastos: string; balance: string
}

export default function PaginaInformes() {
  const anio = new Date().getFullYear()

  const { data: informe } = useQuery<InformeAnual>({
    queryKey: ["informes", "anual", anio],
    queryFn: async () => (await api.get(`/informes/anual/${anio}`)).data,
  })

  const exportar = async (mes: number) => {
    const response = await api.get(`/excel/mes?mes=${mes}&anio=${anio}`, { responseType: "blob" })
    const url = URL.createObjectURL(new Blob([response.data]))
    const a = document.createElement("a")
    a.href = url
    a.download = `contabilidad_${anio}_${String(mes).padStart(2, "0")}.xlsx`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="p-6">
      <div className="mb-4" style={{ borderBottom: "1px solid #1e1e1e", paddingBottom: "0.75rem" }}>
        <span style={{ color: "#aaa", fontSize: "0.65rem", letterSpacing: "0.12em" }}>INFORMES {anio}</span>
      </div>

      {informe && (
        <div style={{ display: "flex", gap: "2rem", marginBottom: "1.5rem" }}>
          {[
            { label: "ingresos", valor: informe.total_ingresos, color: "#4ec9b0" },
            { label: "gastos",   valor: informe.total_gastos,   color: "#f48771" },
            { label: "balance",  valor: informe.balance,
              color: Number(informe.balance) >= 0 ? "#4ec9b0" : "#f48771" },
          ].map(({ label, valor, color }) => (
            <div key={label} style={{ borderLeft: `2px solid ${color}`, paddingLeft: "0.75rem" }}>
              <div style={{ color: "#333", fontSize: "0.6rem", letterSpacing: "0.1em", textTransform: "uppercase" }}>{label}</div>
              <div style={{ color, fontSize: "1.1rem", fontWeight: 600 }}>{formatearEuros(valor)}</div>
            </div>
          ))}
        </div>
      )}

      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr style={{ borderBottom: "1px solid #1a1a1a" }}>
            {["mes", "ingresos", "gastos", "balance", ""].map((h) => (
              <th key={h} style={{ textAlign: "left", padding: "4px 12px", color: "#333" }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {informe?.meses.map((m) => {
            const balance = Number(m.total_ingresos) - Number(m.total_gastos)
            return (
              <tr
                key={m.mes}
                style={{ borderBottom: "1px solid #141414" }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "#111")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
              >
                <td style={{ padding: "4px 12px", color: "#555" }}>{MESES[m.mes - 1]}</td>
                <td style={{ padding: "4px 12px", color: "#4ec9b0" }}>{formatearEuros(m.total_ingresos)}</td>
                <td style={{ padding: "4px 12px", color: "#f48771" }}>{formatearEuros(m.total_gastos)}</td>
                <td style={{ padding: "4px 12px", color: balance >= 0 ? "#4ec9b0" : "#f48771" }}>{formatearEuros(balance)}</td>
                <td style={{ padding: "4px 12px" }}>
                  <button
                    onClick={() => exportar(m.mes)}
                    style={{ color: "#333", background: "none", border: "none", cursor: "pointer", fontSize: "0.7rem" }}
                    onMouseEnter={(e) => (e.currentTarget.style.color = "#4ec9b0")}
                    onMouseLeave={(e) => (e.currentTarget.style.color = "#333")}
                    title="exportar xlsx"
                  >
                    [↓]
                  </button>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
