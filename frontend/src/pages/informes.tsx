import { api } from "@/lib/api"
import { ThSort, useSorte } from "@/lib/tabla"
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

  const { ordenados: mesesOrdenados, campo, dir, ordenarPor } = useSorte(
    informe?.meses ?? [], "mes", "asc",
    (item, c) => {
      if (c === "ingresos") return Number(item.total_ingresos)
      if (c === "gastos") return Number(item.total_gastos)
      if (c === "balance") return Number(item.total_ingresos) - Number(item.total_gastos)
      return item.mes
    },
  )

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
      <div className="mb-4" style={{ borderBottom: "1px solid #0F3244", paddingBottom: "0.75rem" }}>
        <span style={{ color: "#84B8C9", fontSize: "0.70rem", letterSpacing: "0.12em" }}>INFORMES {anio}</span>
      </div>

      {informe && (
        <div style={{ display: "flex", gap: "2rem", marginBottom: "1.5rem" }}>
          {[
            { label: "ingresos", valor: informe.total_ingresos, color: "#00ED64" },
            { label: "gastos",   valor: informe.total_gastos,   color: "#FF6B35" },
            { label: "balance",  valor: informe.balance,
              color: Number(informe.balance) >= 0 ? "#00ED64" : "#FF6B35" },
          ].map(({ label, valor, color }) => (
            <div key={label} style={{ borderLeft: `2px solid ${color}`, paddingLeft: "0.75rem" }}>
              <div style={{ color: "#1F4A5E", fontSize: "0.70rem", letterSpacing: "0.1em", textTransform: "uppercase" }}>{label}</div>
              <div style={{ color, fontSize: "1.15rem", fontWeight: 600 }}>{formatearEuros(valor)}</div>
            </div>
          ))}
        </div>
      )}

      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr style={{ borderBottom: "1px solid #112B3A" }}>
            <ThSort label="mes"      campo="mes"      actual={campo} dir={dir} onClick={ordenarPor} color="#84B8C9" />
            <ThSort label="ingresos" campo="ingresos" actual={campo} dir={dir} onClick={ordenarPor} color="#84B8C9" />
            <ThSort label="gastos"   campo="gastos"   actual={campo} dir={dir} onClick={ordenarPor} color="#84B8C9" />
            <ThSort label="balance"  campo="balance"  actual={campo} dir={dir} onClick={ordenarPor} color="#84B8C9" />
            <th style={{ padding: "4px 12px" }} />
          </tr>
        </thead>
        <tbody>
          {mesesOrdenados.map((m) => {
            const balance = Number(m.total_ingresos) - Number(m.total_gastos)
            return (
              <tr
                key={m.mes}
                style={{ borderBottom: "1px solid #0A2233" }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "#012030")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
              >
                <td style={{ padding: "4px 12px", color: "#3D6676" }}>{MESES[m.mes - 1]}</td>
                <td style={{ padding: "4px 12px", color: "#00ED64" }}>{formatearEuros(m.total_ingresos)}</td>
                <td style={{ padding: "4px 12px", color: "#FF6B35" }}>{formatearEuros(m.total_gastos)}</td>
                <td style={{ padding: "4px 12px", color: balance >= 0 ? "#00ED64" : "#FF6B35" }}>{formatearEuros(balance)}</td>
                <td style={{ padding: "4px 12px" }}>
                  <button
                    onClick={() => exportar(m.mes)}
                    style={{ color: "#1F4A5E", background: "none", border: "none", cursor: "pointer", fontSize: "0.80rem" }}
                    onMouseEnter={(e) => (e.currentTarget.style.color = "#00ED64")}
                    onMouseLeave={(e) => (e.currentTarget.style.color = "#1F4A5E")}
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
