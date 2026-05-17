import { Button } from "@/components/ui/button"
import { api } from "@/lib/api"
import type { Categoria, CuentaBanco, Proveedor } from "@/lib/tipos"
import { formatearEuros, formatearFecha } from "@/lib/utils"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useEffect, useRef, useState } from "react"
import { useSearchParams } from "react-router-dom"
import { toast } from "sonner"

interface TransaccionPreview {
  indice: number
  fecha: string
  descripcion: string
  importe: string
  tipo: "ingreso" | "gasto"
  categoria_id?: number
  es_duplicado: boolean
  es_posible_suscripcion: boolean
  external_id?: string
}

interface PreviewResponse {
  transacciones: TransaccionPreview[]
  omitidas: number
}

type Tab = "pdf" | "banco"

// ── Tabla compartida ───────────────────────────────────────────────────────────

function TablaTransacciones({
  transacciones,
  excluidas,
  toggleExcluida,
  toggleTodas,
  nombreCategoria,
}: {
  transacciones: TransaccionPreview[]
  excluidas: Set<number>
  toggleExcluida: (i: number) => void
  toggleTodas: () => void
  nombreCategoria: (id?: number) => string
}) {
  return (
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
        {transacciones.map((t) => {
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
  )
}

// ── Tab PDF ────────────────────────────────────────────────────────────────────

function TabPDF({ categorias }: { categorias: Categoria[] }) {
  const qc = useQueryClient()
  const inputRef = useRef<HTMLInputElement>(null)
  const [preview, setPreview] = useState<PreviewResponse | null>(null)
  const [excluidas, setExcluidas] = useState<Set<number>>(new Set())
  const [cargando, setCargando] = useState(false)
  const [confirmando, setConfirmando] = useState(false)

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
    setExcluidas((prev) => prev.size === todos.length ? new Set() : new Set(todos))
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
      if (data.omitidas > 0) {
        toast.info(`${data.omitidas} transacción(es) omitidas (operaciones de bolsa)`)
      }
    } catch {
      toast.error("error al procesar el PDF")
    } finally {
      setCargando(false)
    }
  }

  const handleConfirmar = async () => {
    if (!preview) return
    const seleccionadas = preview.transacciones
      .filter((t) => !excluidas.has(t.indice))
      .map(({ fecha, descripcion, importe, tipo, categoria_id, external_id }) => ({
        fecha, descripcion, importe, tipo, categoria_id, external_id,
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

  const seleccionadas = preview ? preview.transacciones.filter((t) => !excluidas.has(t.indice)) : []
  const totalIngresos = seleccionadas.filter((t) => t.tipo === "ingreso").length
  const totalGastos = seleccionadas.filter((t) => t.tipo === "gasto").length

  return (
    <div>
      <div className="flex items-center justify-between mb-4" style={{ borderBottom: "1px solid #0F3244", paddingBottom: "0.75rem" }}>
        <div style={{ color: "#1F4A5E", fontSize: "0.70rem" }}>Trade Republic · PDF</div>
        <div className="flex items-center gap-3">
          {preview && (
            <span style={{ color: "#3D6676", fontSize: "0.70rem" }}>
              {totalIngresos} ingresos · {totalGastos} gastos seleccionados
            </span>
          )}
          <input
            ref={inputRef}
            type="file"
            accept=".pdf"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && handleArchivo(e.target.files[0])}
          />
          <Button
            onClick={() => inputRef.current?.click()}
            disabled={cargando}
            style={{ background: "#011829", color: "#5C8097", border: "1px solid #2A5A6E" }}
          >
            {cargando ? "procesando…" : "subir PDF"}
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
          — sube un PDF de Trade Republic para empezar —
        </div>
      )}

      {preview && (
        <TablaTransacciones
          transacciones={preview.transacciones}
          excluidas={excluidas}
          toggleExcluida={toggleExcluida}
          toggleTodas={toggleTodas}
          nombreCategoria={nombreCategoria}
        />
      )}
    </div>
  )
}

// ── Tab Banco ──────────────────────────────────────────────────────────────────

function TabBanco({ categorias }: { categorias: Categoria[] }) {
  const qc = useQueryClient()
  const [searchParams, setSearchParams] = useSearchParams()
  const [busqueda, setBusqueda] = useState("")
  const [conectando, setConectando] = useState(false)
  const [preview, setPreview] = useState<PreviewResponse | null>(null)
  const [excluidas, setExcluidas] = useState<Set<number>>(new Set())
  const [confirmando, setConfirmando] = useState(false)
  const [cuentaSincronizando, setCuentaSincronizando] = useState<number | null>(null)

  const { data: cuentas = [], refetch: refetchCuentas } = useQuery<CuentaBanco[]>({
    queryKey: ["cuentas-banco"],
    queryFn: async () => (await api.get("/cuentas-banco/")).data,
  })

  const { data: proveedores = [], isFetching: buscandoProveedores } = useQuery<Proveedor[]>({
    queryKey: ["proveedores", busqueda],
    queryFn: async () => (await api.get("/cuentas-banco/proveedores", { params: { query: busqueda } })).data,
    enabled: busqueda.length >= 2,
  })

  const nombreCategoria = (id?: number) =>
    id ? (categorias.find((c) => c.id === id)?.nombre ?? "—") : "—"

  // Detectar ?connection_id= al volver del OAuth de Salt Edge
  useEffect(() => {
    const connectionId = searchParams.get("connection_id")
    if (!connectionId) return

    api.post("/cuentas-banco/completar", { connection_id: connectionId })
      .then(() => {
        toast.success("banco conectado correctamente")
        refetchCuentas()
      })
      .catch(() => toast.error("error al completar la conexión con el banco"))
      .finally(() => {
        const params = new URLSearchParams(searchParams)
        params.delete("connection_id")
        setSearchParams(params, { replace: true })
      })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const handleConectar = async (provider_code: string) => {
    setConectando(true)
    try {
      const redirectUrl = `${window.location.origin}/importar`
      const { data } = await api.post("/cuentas-banco/iniciar", {
        provider_code,
        redirect_url: redirectUrl,
      })
      window.location.href = data.connect_url
    } catch {
      toast.error("error al iniciar la conexión con el banco")
      setConectando(false)
    }
  }

  const handleReconectar = async (cuenta: CuentaBanco) => {
    try {
      const redirectUrl = `${window.location.origin}/importar`
      const { data } = await api.post(`/cuentas-banco/${cuenta.id}/reconectar`, {
        provider_code: cuenta.provider_code,
        redirect_url: redirectUrl,
      })
      window.location.href = data.connect_url
    } catch {
      toast.error("error al reconectar el banco")
    }
  }

  const desconectarMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/cuentas-banco/${id}`),
    onSuccess: () => { toast.success("banco desconectado"); refetchCuentas() },
    onError: () => toast.error("error al desconectar el banco"),
  })

  const handleSincronizar = async (cuenta: CuentaBanco) => {
    setCuentaSincronizando(cuenta.id)
    setPreview(null)
    setExcluidas(new Set())
    try {
      const { data } = await api.post<PreviewResponse>(`/importar/sincronizar/${cuenta.id}`)
      setPreview(data)
      if (data.omitidas > 0) toast.info(`${data.omitidas} transacción(es) omitidas`)
      if (data.transacciones.length === 0) toast.info("no hay transacciones nuevas")
    } catch {
      toast.error("error al sincronizar el banco")
    } finally {
      setCuentaSincronizando(null)
    }
  }

  const toggleExcluida = (indice: number) =>
    setExcluidas((prev) => {
      const next = new Set(prev)
      next.has(indice) ? next.delete(indice) : next.add(indice)
      return next
    })

  const toggleTodas = () => {
    if (!preview) return
    const todos = preview.transacciones.map((t) => t.indice)
    setExcluidas((prev) => prev.size === todos.length ? new Set() : new Set(todos))
  }

  const handleConfirmar = async () => {
    if (!preview) return
    const seleccionadas = preview.transacciones
      .filter((t) => !excluidas.has(t.indice))
      .map(({ fecha, descripcion, importe, tipo, categoria_id, external_id }) => ({
        fecha, descripcion, importe, tipo, categoria_id, external_id,
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
    } catch {
      toast.error("error al confirmar la importación")
    } finally {
      setConfirmando(false)
    }
  }

  const seleccionadas = preview ? preview.transacciones.filter((t) => !excluidas.has(t.indice)) : []

  return (
    <div>
      {cuentas.length > 0 && (
        <div className="mb-5">
          <div style={{ color: "#3D6676", fontSize: "0.70rem", marginBottom: "0.5rem", letterSpacing: "0.08em" }}>
            BANCOS CONECTADOS
          </div>
          <div className="flex flex-col gap-2">
            {cuentas.map((c) => {
              const expirada = c.status === "expired" || c.status === "inactive"
              return (
                <div
                  key={c.id}
                  className="flex items-center justify-between"
                  style={{ background: "#011829", border: `1px solid ${expirada ? "#2A1A00" : "#0F3244"}`, padding: "8px 14px", borderRadius: "2px" }}
                >
                  <div className="flex items-center gap-2">
                    <span style={{ color: "#9BB7C4", fontSize: "0.80rem" }}>{c.provider_name}</span>
                    {expirada && (
                      <span style={{ background: "#2A1A00", color: "#FFAA33", fontSize: "0.65rem", padding: "1px 5px", borderRadius: "2px" }}>
                        expirada
                      </span>
                    )}
                  </div>
                  <div className="flex gap-2">
                    {expirada ? (
                      <Button
                        onClick={() => handleReconectar(c)}
                        style={{ background: "none", border: "1px solid #FFAA33", color: "#FFAA33", fontSize: "0.75rem", padding: "2px 10px" }}
                      >
                        reconectar
                      </Button>
                    ) : (
                      <Button
                        onClick={() => handleSincronizar(c)}
                        disabled={cuentaSincronizando === c.id}
                        style={{ background: "none", border: "1px solid #2A5A6E", color: "#5C8097", fontSize: "0.75rem", padding: "2px 10px" }}
                      >
                        {cuentaSincronizando === c.id ? "sincronizando…" : "sincronizar"}
                      </Button>
                    )}
                    <Button
                      onClick={() => desconectarMutation.mutate(c.id)}
                      style={{ background: "none", border: "1px solid #2A1A00", color: "#FF6B35", fontSize: "0.75rem", padding: "2px 10px" }}
                    >
                      desconectar
                    </Button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {!preview && (
        <div className="mb-5">
          <div style={{ color: "#3D6676", fontSize: "0.70rem", marginBottom: "0.5rem", letterSpacing: "0.08em" }}>
            CONECTAR NUEVO BANCO
          </div>
          <input
            type="text"
            placeholder="buscar banco (ej: Trade Republic, BBVA, ING…)"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            style={{
              width: "100%",
              maxWidth: "28rem",
              background: "#011829",
              border: "1px solid #1A3F54",
              color: "#9BB7C4",
              fontSize: "0.80rem",
              padding: "6px 10px",
              outline: "none",
              borderRadius: "2px",
            }}
          />
          {busqueda.length >= 2 && (
            <div
              style={{
                marginTop: "4px",
                background: "#011829",
                border: "1px solid #0F3244",
                maxWidth: "28rem",
                maxHeight: "14rem",
                overflowY: "auto",
              }}
            >
              {buscandoProveedores && (
                <div style={{ color: "#3D6676", fontSize: "0.75rem", padding: "8px 12px" }}>buscando…</div>
              )}
              {!buscandoProveedores && proveedores.length === 0 && (
                <div style={{ color: "#3D6676", fontSize: "0.75rem", padding: "8px 12px" }}>sin resultados</div>
              )}
              {proveedores.map((p) => (
                <button
                  key={p.code}
                  onClick={() => handleConectar(p.code)}
                  disabled={conectando}
                  className="w-full text-left flex items-center gap-3"
                  style={{ padding: "7px 12px", borderBottom: "1px solid #0A2233", cursor: "pointer", background: "transparent" }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "#012030")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                >
                  {p.logo_url && (
                    <img src={p.logo_url} alt={p.name} style={{ width: "18px", height: "18px", objectFit: "contain" }} />
                  )}
                  <span style={{ color: "#9BB7C4", fontSize: "0.80rem" }}>{p.name}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {preview && (
        <>
          <div className="flex items-center justify-between mb-3" style={{ borderBottom: "1px solid #0F3244", paddingBottom: "0.75rem" }}>
            <span style={{ color: "#3D6676", fontSize: "0.70rem" }}>
              {seleccionadas.filter((t) => t.tipo === "ingreso").length} ingresos ·{" "}
              {seleccionadas.filter((t) => t.tipo === "gasto").length} gastos seleccionados
            </span>
            <div className="flex gap-2">
              <Button
                onClick={() => { setPreview(null); setExcluidas(new Set()) }}
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
            </div>
          </div>
          <TablaTransacciones
            transacciones={preview.transacciones}
            excluidas={excluidas}
            toggleExcluida={toggleExcluida}
            toggleTodas={toggleTodas}
            nombreCategoria={nombreCategoria}
          />
        </>
      )}

      {cuentas.length === 0 && busqueda.length < 2 && !preview && (
        <div style={{ color: "#1A3F54", textAlign: "center", padding: "4rem 0", fontSize: "0.80rem" }}>
          — busca un banco para conectarlo —
        </div>
      )}
    </div>
  )
}

// ── Página principal ───────────────────────────────────────────────────────────

export default function PaginaImportar() {
  const [tab, setTab] = useState<Tab>("pdf")

  const { data: categorias = [] } = useQuery<Categoria[]>({
    queryKey: ["categorias"],
    queryFn: async () => (await api.get("/categorias/")).data,
  })

  const estiloTab = (activa: boolean): React.CSSProperties => ({
    padding: "4px 16px",
    fontSize: "0.75rem",
    cursor: "pointer",
    background: "none",
    border: "none",
    borderBottom: activa ? "1px solid #5C8097" : "1px solid transparent",
    color: activa ? "#5C8097" : "#3D6676",
    letterSpacing: "0.08em",
  })

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4" style={{ borderBottom: "1px solid #0F3244", paddingBottom: "0.75rem" }}>
        <div style={{ color: "#A5B4FC", fontSize: "0.70rem", letterSpacing: "0.12em" }}>IMPORTAR EXTRACTO</div>
        <div className="flex gap-1">
          <button style={estiloTab(tab === "pdf")} onClick={() => setTab("pdf")}>PDF</button>
          <button style={estiloTab(tab === "banco")} onClick={() => setTab("banco")}>BANCO</button>
        </div>
      </div>

      {tab === "pdf" ? (
        <TabPDF categorias={categorias} />
      ) : (
        <TabBanco categorias={categorias} />
      )}
    </div>
  )
}
