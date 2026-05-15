import { api } from "@/lib/api"
import { SelectorMes, useMes } from "@/lib/mes-context"
import { formatearEuros, formatearFecha } from "@/lib/utils"
import { useQuery } from "@tanstack/react-query"

interface ResumenMes { mes: number; anio: number; total_ingresos: string; total_gastos: string }
interface Movimiento { id: number; importe: string; fecha: string; descripcion?: string; categoria?: { nombre: string }; tipo: "ingreso" | "gasto" }
interface GastoCategoria { categoria_id: number; categoria_nombre: string; total: string }
interface Presupuesto { id: number; importe: string; mes: number; anio: number; categoria: { id: number; nombre: string } }
interface Suscripcion { id: number; nombre: string; importe: string; activa: boolean }

const MESES = ["enero","febrero","marzo","abril","mayo","junio","julio","agosto","septiembre","octubre","noviembre","diciembre"]

export default function PaginaDashboard() {
  const { mes, anio } = useMes()

  const { data: resumen } = useQuery<ResumenMes>({
    queryKey: ["informes", "mes", mes, anio],
    queryFn: async () => (await api.get(`/informes/mes?mes=${mes}&anio=${anio}`)).data,
  })

  const { data: ingresosRaw = [] } = useQuery<Movimiento[]>({
    queryKey: ["ingresos", mes, anio],
    queryFn: async () => (await api.get(`/ingresos/?mes=${mes}&anio=${anio}&limite=5`)).data
      .map((i: Movimiento) => ({ ...i, tipo: "ingreso" as const })),
  })

  const { data: gastosRaw = [] } = useQuery<Movimiento[]>({
    queryKey: ["gastos", mes, anio],
    queryFn: async () => (await api.get(`/gastos/?mes=${mes}&anio=${anio}&limite=5`)).data
      .map((g: Movimiento) => ({ ...g, tipo: "gasto" as const })),
  })

  const { data: categorias = [] } = useQuery<GastoCategoria[]>({
    queryKey: ["informes", "categorias", mes, anio],
    queryFn: async () => (await api.get(`/informes/gastos-por-categoria?mes=${mes}&anio=${anio}`)).data,
  })

  const { data: presupuestos = [] } = useQuery<Presupuesto[]>({
    queryKey: ["presupuestos", mes, anio],
    queryFn: async () => (await api.get(`/presupuestos/?mes=${mes}&anio=${anio}`)).data,
  })

  const { data: suscripciones = [] } = useQuery<Suscripcion[]>({
    queryKey: ["suscripciones"],
    queryFn: async () => (await api.get("/suscripciones/")).data,
  })

  const movimientos = [...ingresosRaw, ...gastosRaw]
    .sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime())
    .slice(0, 8)

  const balance = resumen ? Number(resumen.total_ingresos) - Number(resumen.total_gastos) : 0
  const suscripcionesActivas = suscripciones.filter((s) => s.activa)
  const totalSus = suscripcionesActivas.reduce((acc, s) => acc + Number(s.importe), 0)
  const maxCategoria = categorias.length ? Math.max(...categorias.map((c) => Number(c.total))) : 1

  const presupuestoPorCategoria = Object.fromEntries(
    presupuestos.map((p) => [p.categoria.id, Number(p.importe)])
  )

  return (
    <div className="p-6 space-y-6">
      {/* Cabecera */}
      <div style={{ borderBottom: "1px solid #1e1e1e", paddingBottom: "0.75rem" }}>
        <span style={{ color: "#4ec9b0", fontSize: "0.65rem", letterSpacing: "0.12em" }}>
          DASHBOARD
        </span>
        <SelectorMes />
      </div>

      {/* KPIs */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "1px", background: "#1e1e1e" }}>
        {[
          { label: "ingresos",      valor: resumen?.total_ingresos ?? "0", color: "#4ec9b0" },
          { label: "gastos",        valor: resumen?.total_gastos   ?? "0", color: "#f48771" },
          { label: "balance",       valor: String(balance),                color: balance >= 0 ? "#4ec9b0" : "#f48771" },
          { label: "suscripciones", valor: String(totalSus),               color: "#ce9178" },
        ].map(({ label, valor, color }) => (
          <div key={label} style={{ background: "#0c0c0c", padding: "1rem 1.25rem" }}>
            <div style={{ color: "#333", fontSize: "0.6rem", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "0.3rem" }}>
              {label}
            </div>
            <div style={{ color, fontSize: "1.1rem", fontWeight: 600 }}>
              {formatearEuros(valor)}
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "2rem" }}>
        {/* Últimos movimientos */}
        <div>
          <div style={{ color: "#333", fontSize: "0.6rem", letterSpacing: "0.12em", marginBottom: "0.5rem" }}>
            ÚLTIMOS MOVIMIENTOS
          </div>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <tbody>
              {movimientos.length === 0 && (
                <tr><td style={{ color: "#2a2a2a", fontSize: "0.75rem", padding: "0.5rem 0" }}>— sin movimientos —</td></tr>
              )}
              {movimientos.map((m) => (
                <tr key={`${m.tipo}-${m.id}`} style={{ borderBottom: "1px solid #141414" }}>
                  <td style={{ padding: "3px 0", color: "#444", fontSize: "0.7rem", width: "5rem" }}>
                    {formatearFecha(m.fecha)}
                  </td>
                  <td style={{ padding: "3px 8px", color: "#555", fontSize: "0.75rem" }}>
                    {m.categoria?.nombre ?? m.descripcion ?? "—"}
                  </td>
                  <td style={{ padding: "3px 0", textAlign: "right", color: m.tipo === "ingreso" ? "#4ec9b0" : "#f48771", fontSize: "0.75rem" }}>
                    {m.tipo === "ingreso" ? "+" : "-"}{formatearEuros(m.importe)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Gastos por categoría */}
        <div>
          <div style={{ color: "#333", fontSize: "0.6rem", letterSpacing: "0.12em", marginBottom: "0.5rem" }}>
            GASTOS POR CATEGORÍA
          </div>
          <div className="space-y-2">
            {categorias.length === 0 && (
              <div style={{ color: "#2a2a2a", fontSize: "0.75rem" }}>— sin gastos —</div>
            )}
            {categorias.map((c) => {
              const presupuesto = presupuestoPorCategoria[c.categoria_id ?? 0]
              const pct = presupuesto
                ? Math.min(100, (Number(c.total) / presupuesto) * 100)
                : (Number(c.total) / maxCategoria) * 100
              const colorBarra = presupuesto && Number(c.total) > presupuesto ? "#f48771" : "#4ec9b0"
              return (
                <div key={c.categoria_id}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "2px" }}>
                    <span style={{ color: "#666", fontSize: "0.72rem" }}>{c.categoria_nombre}</span>
                    <span style={{ color: "#555", fontSize: "0.72rem" }}>
                      {formatearEuros(c.total)}
                      {presupuesto ? <span style={{ color: "#333" }}> / {formatearEuros(presupuesto)}</span> : null}
                    </span>
                  </div>
                  <div style={{ height: "2px", background: "#1a1a1a" }}>
                    <div style={{ height: "100%", width: `${pct}%`, background: colorBarra, transition: "width 0.3s" }} />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Suscripciones activas */}
      {suscripcionesActivas.length > 0 && (
        <div>
          <div style={{ color: "#333", fontSize: "0.6rem", letterSpacing: "0.12em", marginBottom: "0.5rem" }}>
            SUSCRIPCIONES ACTIVAS
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
            {suscripcionesActivas.map((s) => (
              <div
                key={s.id}
                style={{ border: "1px solid #1e1e1e", padding: "0.25rem 0.75rem", fontSize: "0.72rem" }}
              >
                <span style={{ color: "#555" }}>{s.nombre}</span>
                <span style={{ color: "#ce9178", marginLeft: "0.5rem" }}>{formatearEuros(s.importe)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
