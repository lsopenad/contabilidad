import { Button } from "@/components/ui/button"
import { api } from "@/lib/api"
import { formatearEuros, formatearFecha } from "@/lib/utils"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { useRef, useState } from "react"
import { toast } from "sonner"
import type { Categoria } from "@/lib/tipos"

interface TransaccionPreview {
  indice: number
  fecha: string
  descripcion: string
  importe: string
  tipo: "ingreso" | "gasto"
  categoria_id?: number
  es_duplicado: boolean
  es_posible_suscripcion: boolean
  transaction_id?: string
}

interface PreviewResponse {
  transacciones: TransaccionPreview[]
  omitidas: number
  groq_error?: string
}

export default function PaginaImportar() {
  const qc = useQueryClient()
  const inputRef = useRef<HTMLInputElement>(null)
  const [preview, setPreview] = useState<PreviewResponse | null>(null)
  const [excluidas, setExcluidas] = useState<Set<number>>(new Set())
  const [cargando, setCargando] = useState(false)
  const [confirmando, setConfirmando] = useState(false)

  const { data: categorias = [] } = useQuery<Categoria[]>({
    queryKey: ["categorias"],
    queryFn: async () => (await api.get("/categorias/")).data,
  })

  const nombreCategoria = (id?: number) =>
    id ? (categorias.find((c) => c.id === id)?.nombre ?? "—") : "—"

  const toggleExcluida = (indice: number) =>
    setExcluidas((prev) => {
      const next = new Set(prev)
      next.has(indice) ? next.delete(indice) : next.add(indice)
      return next
    })

  const toggleTodas = () => {
    if (!preview) return
    const todos = preview.transacciones.map((t) => t.indice)
    setExcluidas((prev) =>
      prev.size === todos.length ? new Set() : new Set(todos)
    )
  }

  const handleArchivo = async (archivo: File) => {
    setCargando(true)
    setPreview(null)
    setExcluidas(new Set())
    try {
      const form = new FormData()
      form.append("archivo", archivo)
      const { data } = await api.post<PreviewResponse>("/importar/previsualizar", form, {
        headers: { "Content-Type": "multipart/form-data" },
      })
      setPreview(data)
      if (data.groq_error) {
        toast.warning(`normalización desactivada: ${data.groq_error}`)
      }
      if (data.omitidas > 0) {
        toast.info(`${data.omitidas} transacción(es) omitidas (operaciones de bolsa)`)
      }
    } catch {
      toast.error("error al procesar el CSV")
    } finally {
      setCargando(false)
    }
  }

  const handleConfirmar = async () => {
    if (!preview) return
    const seleccionadas = preview.transacciones
      .filter((t) => !excluidas.has(t.indice))
      .map(({ fecha, descripcion, importe, tipo, categoria_id, transaction_id }) => ({
        fecha, descripcion, importe, tipo, categoria_id, transaction_id,
      }))

    if (seleccionadas.length === 0) {
      toast.error("no hay transacciones seleccionadas")
      return
    }

    setConfirmando(true)
    try {
      const { data } = await api.post("/importar/confirmar", { transacciones: seleccionadas })
      toast.success(`importadas: ${data.ingresos_creados} ingresos · ${data.gastos_creados} gastos`)
      qc.invalidateQueries({ queryKey: ["ingresos"] })
      qc.invalidateQueries({ queryKey: ["gastos"] })
      qc.invalidateQueries({ queryKey: ["informes"] })
      setPreview(null)
      setExcluidas(new Set())
      if (inputRef.current) inputRef.current.value = ""
    } catch {
      toast.error("error al confirmar la importación")
    } finally {
      setConfirmando(false)
    }
  }

  const seleccionadas = preview
    ? preview.transacciones.filter((t) => !excluidas.has(t.indice))
    : []
  const totalIngresos = seleccionadas.filter((t) => t.tipo === "ingreso").length
  const totalGastos = seleccionadas.filter((t) => t.tipo === "gasto").length

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4" style={{ borderBottom: "1px solid #0F3244", paddingBottom: "0.75rem" }}>
        <div>
          <div style={{ color: "#A5B4FC", fontSize: "0.70rem", letterSpacing: "0.12em" }}>IMPORTAR EXTRACTO</div>
          <div style={{ color: "#1F4A5E", fontSize: "0.70rem" }}>Trade Republic · CSV</div>
        </div>
        <div className="flex items-center gap-3">
          {preview && (
            <span style={{ color: "#3D6676", fontSize: "0.70rem" }}>
              {totalIngresos} ingresos · {totalGastos} gastos seleccionados
            </span>
          )}
          <input
            ref={inputRef}
            type="file"
            accept=".csv"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && handleArchivo(e.target.files[0])}
          />
          <Button
            onClick={() => inputRef.current?.click()}
            disabled={cargando}
            style={{ background: "#011829", color: "#5C8097", border: "1px solid #2A5A6E" }}
          >
            {cargando ? "procesando…" : "subir CSV"}
          </Button>
          {preview && (
            <>
              <Button
                onClick={() => { setPreview(null); setExcluidas(new Set()); if (inputRef.current) inputRef.current.value = "" }}
                style={{ background: "none", border: "1px solid #1A3F54", color: "#3D6676" }}
              >
                cancelar
              </Button>
              <Button
                onClick={handleConfirmar}
                disabled={confirmando || seleccionadas.length === 0}
                style={{ background: "#011829", color: "#00ED64", border: "1px solid #00ED64" }}
              >
                {confirmando ? "importando…" : `confirmar (${seleccionadas.length})`}
              </Button>
            </>
          )}
        </div>
      </div>

      {!preview && !cargando && (
        <div style={{ color: "#1A3F54", textAlign: "center", padding: "4rem 0", fontSize: "0.80rem" }}>
          — sube un CSV de Trade Republic para empezar —
        </div>
      )}

      {preview && (
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ borderBottom: "1px solid #112B3A" }}>
              <th style={{ padding: "4px 8px", textAlign: "left" }}>
                <input
                  type="checkbox"
                  checked={excluidas.size === 0}
                  onChange={toggleTodas}
                  style={{ accentColor: "#5C8097" }}
                />
              </th>
              {["fecha", "descripción", "importe", "tipo", "categoría"].map((h) => (
                <th key={h} style={{ padding: "4px 12px", color: "#5C8097", fontSize: "0.70rem", textAlign: "left", letterSpacing: "0.08em" }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {preview.transacciones.map((t) => {
              const excluida = excluidas.has(t.indice)
              return (
                <tr
                  key={t.indice}
                  style={{ borderBottom: "1px solid #0A2233", opacity: excluida ? 0.35 : 1 }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "#012030")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                >
                  <td style={{ padding: "4px 8px" }}>
                    <input
                      type="checkbox"
                      checked={!excluida}
                      onChange={() => toggleExcluida(t.indice)}
                      style={{ accentColor: "#5C8097" }}
                    />
                  </td>
                  <td style={{ padding: "4px 12px", color: "#4E7A8A", fontSize: "0.80rem", whiteSpace: "nowrap" }}>
                    {formatearFecha(t.fecha)}
                  </td>
                  <td style={{ padding: "4px 12px", color: "#9BB7C4", fontSize: "0.80rem", maxWidth: "22rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {t.descripcion}
                    {t.es_duplicado && (
                      <span style={{ marginLeft: "0.4rem", background: "#2A1A00", color: "#FFAA33", fontSize: "0.65rem", padding: "1px 5px", borderRadius: "2px" }}>
                        duplicado
                      </span>
                    )}
                    {t.es_posible_suscripcion && (
                      <span style={{ marginLeft: "0.4rem", background: "#1A1A2E", color: "#A5B4FC", fontSize: "0.65rem", padding: "1px 5px", borderRadius: "2px" }}>
                        suscripción?
                      </span>
                    )}
                  </td>
                  <td style={{ padding: "4px 12px", color: t.tipo === "ingreso" ? "#00ED64" : "#FF6B35", fontSize: "0.80rem", whiteSpace: "nowrap", textAlign: "right" }}>
                    {t.tipo === "ingreso" ? "+" : "-"}{formatearEuros(t.importe)}
                  </td>
                  <td style={{ padding: "4px 12px", color: "#3D6676", fontSize: "0.70rem" }}>
                    {t.tipo === "ingreso" ? "ingreso" : "gasto"}
                  </td>
                  <td style={{ padding: "4px 12px", color: "#3D6676", fontSize: "0.75rem" }}>
                    {nombreCategoria(t.categoria_id)}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      )}
    </div>
  )
}
