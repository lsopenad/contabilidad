import { api } from "@/lib/api"
import { SelectorMes, useMes } from "@/lib/mes-context"
import { type GastoCategoria, type Movimiento, type Presupuesto, type ResumenMes, type Suscripcion } from "@/lib/tipos"
import { formatearEuros, formatearFecha } from "@/lib/utils"
import { useQuery } from "@tanstack/react-query"

export default function PaginaDashboard() {
  const { mes, anio } = useMes()

  const { data: resumen } = useQuery<ResumenMes>({
    queryKey: ["informes", "mes", mes, anio],
    queryFn: async () => (await api.get(`/informes/mes?mes=${mes}&anio=${anio}`)).data,
  })

  const { data: ingresosRaw = [] } = useQuery<Movimiento[]>({
    queryKey: ["ingresos", mes, anio],
    queryFn: async () => (await api.get(`/ingresos/?mes=${mes}&anio=${anio}`)).data
      .map((i: Movimiento) => ({ ...i, tipo: "ingreso" as const })),
  })

  const { data: gastosRaw = [] } = useQuery<Movimiento[]>({
    queryKey: ["gastos", mes, anio],
    queryFn: async () => (await api.get(`/gastos/?mes=${mes}&anio=${anio}`)).data
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

  const suscripcionesActivas = suscripciones.filter((s) => s.activa)
  const totalSus = suscripcionesActivas.reduce((acc, s) => acc + Number(s.importe), 0)
  const balance = resumen ? Number(resumen.total_ingresos) - Number(resumen.total_gastos) - totalSus : 0
const presupuestoPorCategoria = Object.fromEntries(
    presupuestos.map((p) => [p.categoria.id, Number(p.importe)])
  )

  return (
    <div className="p-6 space-y-6">
      <div style={{ borderBottom: "1px solid #0F3244", paddingBottom: "0.75rem" }}>
        <span style={{ color: "#A5B4FC", fontSize: "0.70rem", letterSpacing: "0.12em" }}>
          DASHBOARD
        </span>
        <SelectorMes />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "1px", background: "#0F3244" }}>
        {[
          { label: "ingresos",      valor: resumen?.total_ingresos ?? "0", color: "#00ED64" },
          { label: "gastos",        valor: resumen?.total_gastos   ?? "0", color: "#FF6B35" },
          { label: "balance",       valor: String(balance),                color: balance >= 0 ? "#00ED64" : "#FF6B35" },
          { label: "suscripciones", valor: String(totalSus),               color: "#FFB020" },
        ].map(({ label, valor, color }) => (
          <div key={label} style={{ background: "#001E2B", padding: "1rem 1.25rem" }}>
            <div style={{ color: "#1F4A5E", fontSize: "0.70rem", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "0.3rem" }}>
              {label}
            </div>
            <div style={{ color, fontSize: "1.15rem", fontWeight: 600 }}>
              {formatearEuros(valor)}
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "2rem" }}>
        <div>
          <div style={{ color: "#1F4A5E", fontSize: "0.70rem", letterSpacing: "0.12em", marginBottom: "0.5rem" }}>
            ÚLTIMOS MOVIMIENTOS
          </div>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <tbody>
              {movimientos.length === 0 && (
                <tr><td style={{ color: "#1A3F54", fontSize: "0.80rem", padding: "0.5rem 0" }}>— sin movimientos —</td></tr>
              )}
              {movimientos.map((m) => (
                <tr key={`${m.tipo}-${m.id}`} style={{ borderBottom: "1px solid #0A2233" }}>
                  <td style={{ padding: "3px 0", color: "#2A5A6E", fontSize: "0.80rem", width: "5rem" }}>
                    {formatearFecha(m.fecha)}
                  </td>
                  <td style={{ padding: "3px 8px", color: "#3D6676", fontSize: "0.80rem" }}>
                    {m.categoria?.nombre ?? m.descripcion ?? "—"}
                  </td>
                  <td style={{ padding: "3px 0", textAlign: "right", color: m.tipo === "ingreso" ? "#00ED64" : "#FF6B35", fontSize: "0.80rem" }}>
                    {m.tipo === "ingreso" ? "+" : "-"}{formatearEuros(m.importe)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div>
          <div style={{ color: "#1F4A5E", fontSize: "0.70rem", letterSpacing: "0.12em", marginBottom: "0.5rem" }}>
            GASTOS POR CATEGORÍA
          </div>
          <div className="space-y-2">
            {categorias.length === 0 && (
              <div style={{ color: "#1A3F54", fontSize: "0.80rem" }}>— sin gastos —</div>
            )}
            {categorias.map((c) => {
              const presupuesto = presupuestoPorCategoria[c.categoria_id ?? 0]
              const pct = presupuesto ? Math.min(100, (Number(c.total) / presupuesto) * 100) : null
              const colorBarra = presupuesto && Number(c.total) > presupuesto ? "#FF6B35" : "#00ED64"
              return (
                <div key={c.categoria_id}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "2px" }}>
                    <span style={{ color: "#4E7A8A", fontSize: "0.77rem" }}>{c.categoria_nombre}</span>
                    <span style={{ color: "#3D6676", fontSize: "0.77rem" }}>
                      {formatearEuros(c.total)}
                      {presupuesto ? <span style={{ color: "#1F4A5E" }}> / {formatearEuros(presupuesto)}</span> : null}
                    </span>
                  </div>
                  {pct !== null && (
                  <div style={{ height: "2px", background: "#112B3A" }}>
                    <div style={{ height: "100%", width: `${pct}%`, background: colorBarra, transition: "width 0.3s" }} />
                  </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {suscripcionesActivas.length > 0 && (
        <div>
          <div style={{ color: "#1F4A5E", fontSize: "0.70rem", letterSpacing: "0.12em", marginBottom: "0.5rem" }}>
            SUSCRIPCIONES ACTIVAS
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
            {suscripcionesActivas.map((s) => (
              <div
                key={s.id}
                style={{ border: "1px solid #0F3244", padding: "0.25rem 0.75rem", fontSize: "0.77rem" }}
              >
                <span style={{ color: "#3D6676" }}>{s.nombre}</span>
                <span style={{ color: "#FFB020", marginLeft: "0.5rem" }}>{formatearEuros(s.importe)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
