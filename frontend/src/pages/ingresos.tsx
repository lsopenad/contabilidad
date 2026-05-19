import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { SelectorCategoria } from "@/components/selector-categoria"
import { useDialogoCrud } from "@/lib/crud"
import { esquemaImporte } from "@/lib/esquemas"
import { api } from "@/lib/api"
import { SelectorMes, useMes } from "@/lib/mes-context"
import { ThSort, useSorte } from "@/lib/tabla"
import { type Ingreso } from "@/lib/tipos"
import { MESES_ABREV, fechaHoy, formatearEuros, formatearFecha, normalizarImporte } from "@/lib/utils"
import { zodResolver } from "@hookform/resolvers/zod"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useEffect, useState } from "react"
import { useForm } from "react-hook-form"
import { toast } from "sonner"
import { z } from "zod"

const esquema = z.object({
  importe: esquemaImporte,
  fecha: z.string().min(1, "obligatorio"),
  categoria_id: z.string().optional(),
  descripcion: z.string().optional(),
})

type Campos = z.infer<typeof esquema>

function ChipsMeses({ mesesSeleccionados, onChangeMesesExtra, mesesEliminar, onChangeMesesEliminar, mesBase, mesesExistentes = [] }: {
  mesesSeleccionados: number[]
  onChangeMesesExtra: (meses: number[]) => void
  mesesEliminar: number[]
  onChangeMesesEliminar: (meses: number[]) => void
  mesBase: number
  mesesExistentes?: number[]
}) {
  function toggle(m: number) {
    if (m === mesBase) return
    if (mesesExistentes.includes(m)) {
      onChangeMesesEliminar(
        mesesEliminar.includes(m)
          ? mesesEliminar.filter((x) => x !== m)
          : [...mesesEliminar, m]
      )
    } else {
      onChangeMesesExtra(
        mesesSeleccionados.includes(m)
          ? mesesSeleccionados.filter((x) => x !== m)
          : [...mesesSeleccionados, m]
      )
    }
  }
  return (
    <div>
      <div style={{ color: "#3D6676", fontSize: "0.70rem", marginBottom: "6px" }}>meses con copia:</div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "4px" }}>
        {MESES_ABREV.map((nombre, i) => {
          const m = i + 1
          const esBase = m === mesBase
          const existe = mesesExistentes.includes(m)
          const eliminando = existe && mesesEliminar.includes(m)
          const sel = !existe && mesesSeleccionados.includes(m)
          return (
            <button
              key={m}
              type="button"
              disabled={esBase}
              onClick={() => toggle(m)}
              style={{
                padding: "2px 8px",
                fontSize: "0.68rem",
                border: `1px solid ${esBase ? "#112B3A" : eliminando ? "#FF6B35" : existe ? "#0E7490" : sel ? "#7DD3FC" : "#1A3F54"}`,
                background: eliminando ? "#1A0A00" : existe ? "#083344" : sel ? "#0A2535" : "transparent",
                color: esBase ? "#1F4A5E" : eliminando ? "#FF6B35" : existe ? "#22D3EE" : sel ? "#7DD3FC" : "#3D6676",
                cursor: esBase ? "default" : "pointer",
                textDecoration: eliminando ? "line-through" : "none",
              }}
            >
              {nombre}
            </button>
          )
        })}
      </div>
    </div>
  )
}

export default function PaginaIngresos() {
  const qc = useQueryClient()
  const { abierto, setAbierto, editando, setEditando, confirmandoId, setConfirmandoId } = useDialogoCrud<Ingreso>()
  const { mes, anio } = useMes()

  const [mesesExtra, setMesesExtra] = useState<number[]>([])
  const [mesesEliminar, setMesesEliminar] = useState<number[]>([])
  const [seleccionados, setSeleccionados] = useState<Set<number>>(new Set())
  const [confirmandoBulk, setConfirmandoBulk] = useState(false)
  const [dialogoCategoriaBulk, setDialogoCategoriaBulk] = useState(false)
  const [categoriaBulkId, setCategoriaBulkId] = useState<string | undefined>(undefined)

  useEffect(() => { setSeleccionados(new Set()) }, [mes, anio])

  const { data: ingresos = [] } = useQuery<Ingreso[]>({
    queryKey: ["ingresos", mes, anio],
    queryFn: async () => (await api.get(`/ingresos/?mes=${mes}&anio=${anio}`)).data,
  })

  const { data: hermanosIngreso = [] } = useQuery<Ingreso[]>({
    queryKey: ["ingresos-hermanos", editando?.repeticion_id],
    queryFn: async () => (await api.get(`/ingresos/?repeticion_id=${editando!.repeticion_id}`)).data,
    enabled: !!editando?.repeticion_id,
  })

  const mesesExistentes = hermanosIngreso
    .filter((h) => h.id !== editando?.id)
    .map((h) => new Date(h.fecha + "T12:00:00").getMonth() + 1)

  const crear = useMutation({
    mutationFn: (d: Campos) => api.post("/ingresos/", {
      importe: normalizarImporte(d.importe), fecha: d.fecha,
      categoria_id: d.categoria_id ? Number(d.categoria_id) : null,
      descripcion: d.descripcion || null,
      meses_extra: mesesExtra,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ingresos"] })
      qc.invalidateQueries({ queryKey: ["ingresos-hermanos"] })
      qc.invalidateQueries({ queryKey: ["informes"] })
      setAbierto(false)
      setMesesExtra([])
      setMesesEliminar([])
      toast.success("ingreso creado")
    },
  })

  const eliminar = useMutation({
    mutationFn: (id: number) => api.delete(`/ingresos/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["ingresos"] }); qc.invalidateQueries({ queryKey: ["informes"] }); toast.success("ingreso eliminado") },
  })

  const editar = useMutation({
    mutationFn: (d: Campos) => api.patch(`/ingresos/${editando!.id}`, {
      importe: normalizarImporte(d.importe), fecha: d.fecha,
      categoria_id: d.categoria_id ? Number(d.categoria_id) : null,
      descripcion: d.descripcion || null,
      meses_extra: mesesExtra,
      meses_eliminar: mesesEliminar,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ingresos"] })
      qc.invalidateQueries({ queryKey: ["ingresos-hermanos"] })
      qc.invalidateQueries({ queryKey: ["informes"] })
      setAbierto(false)
      setEditando(null)
      setMesesExtra([])
      setMesesEliminar([])
      toast.success("ingreso actualizado")
    },
  })

  const eliminarBulk = useMutation({
    mutationFn: (ids: number[]) => api.delete("/ingresos/bulk", { data: { ids } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ingresos"] })
      qc.invalidateQueries({ queryKey: ["informes"] })
      setSeleccionados(new Set())
      setConfirmandoBulk(false)
      toast.success("ingresos eliminados")
    },
  })

  const editarCategoriaBulk = useMutation({
    mutationFn: ({ ids, categoria_id }: { ids: number[]; categoria_id: number | null }) =>
      api.patch("/ingresos/bulk-categoria", { ids, categoria_id }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ingresos"] })
      qc.invalidateQueries({ queryKey: ["informes"] })
      setSeleccionados(new Set())
      setDialogoCategoriaBulk(false)
      setCategoriaBulkId(undefined)
      toast.success("categoría actualizada")
    },
  })

  const form = useForm<Campos>({
    resolver: zodResolver(esquema),
    defaultValues: { fecha: fechaHoy() },
  })

  const fechaWatched = form.watch("fecha")
  const mesBase = fechaWatched
    ? new Date(fechaWatched + "T12:00:00").getMonth() + 1
    : new Date().getMonth() + 1

  const total = ingresos.reduce((s, i) => s + Number(i.importe), 0)

  const { ordenados, campo, dir, ordenarPor } = useSorte(
    ingresos, "fecha", "desc",
    (item, c) => {
      if (c === "fecha") return item.fecha
      if (c === "importe") return Number(item.importe)
      if (c === "categoria") return item.categoria?.nombre ?? ""
      return item.descripcion ?? ""
    },
  )

  function abrirNuevo() {
    setEditando(null)
    setMesesExtra([])
    setMesesEliminar([])
    form.reset({ fecha: fechaHoy() })
    setAbierto(true)
  }

  function abrirEditar(ing: Ingreso) {
    setEditando(ing)
    setMesesExtra([])
    setMesesEliminar([])
    form.reset({
      importe: ing.importe,
      fecha: ing.fecha,
      categoria_id: ing.categoria ? String(ing.categoria.id) : undefined,
      descripcion: ing.descripcion ?? undefined,
    })
    setAbierto(true)
  }

  function toggleSeleccion(id: number) {
    setSeleccionados(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function toggleTodo() {
    if (seleccionados.size === ordenados.length && ordenados.length > 0) {
      setSeleccionados(new Set())
    } else {
      setSeleccionados(new Set(ordenados.map(i => i.id)))
    }
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4" style={{ borderBottom: "1px solid #0F3244", paddingBottom: "0.75rem" }}>
        <div>
          <div style={{ color: "#A5B4FC", fontSize: "0.70rem", letterSpacing: "0.12em" }}>INGRESOS</div>
          <SelectorMes />
        </div>
        <div className="flex items-center gap-4">
          <span style={{ color: "#00ED64", fontSize: "1.00rem", fontWeight: 600 }}>
            {formatearEuros(total)}
          </span>
          <Button onClick={abrirNuevo} style={{ background: "#011829", color: "#5C8097", border: "1px solid #2A5A6E" }}>
            + nuevo
          </Button>
        </div>
      </div>

      {seleccionados.size > 0 && (
        <div style={{ display: "flex", alignItems: "center", gap: "12px", padding: "6px 0", marginBottom: "6px", borderBottom: "1px solid #1A3F54" }}>
          <span style={{ color: "#5C8097", fontSize: "0.75rem" }}>{seleccionados.size} seleccionado{seleccionados.size !== 1 ? "s" : ""}</span>
          <button
            onClick={() => setDialogoCategoriaBulk(true)}
            style={{ color: "#5C8097", background: "none", border: "1px solid #2A5A6E", cursor: "pointer", fontSize: "0.75rem", padding: "2px 8px" }}
          >
            editar categoría
          </button>
          <button
            onClick={() => setConfirmandoBulk(true)}
            style={{ color: "#FF6B35", background: "none", border: "1px solid #FF6B35", cursor: "pointer", fontSize: "0.75rem", padding: "2px 8px" }}
          >
            borrar
          </button>
          <button
            onClick={() => setSeleccionados(new Set())}
            style={{ color: "#1F4A5E", background: "none", border: "none", cursor: "pointer", fontSize: "0.75rem" }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "#5C8097")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "#1F4A5E")}
          >
            deseleccionar
          </button>
        </div>
      )}

      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr style={{ borderBottom: "1px solid #112B3A" }}>
            <th style={{ padding: "4px 8px", textAlign: "left" }}>
              <input
                type="checkbox"
                checked={seleccionados.size === ordenados.length && ordenados.length > 0}
                onChange={toggleTodo}
                style={{ accentColor: "#5C8097" }}
              />
            </th>
            <ThSort label="fecha"       campo="fecha"       actual={campo} dir={dir} onClick={ordenarPor} color="#5C8097" />
            <ThSort label="importe"     campo="importe"     actual={campo} dir={dir} onClick={ordenarPor} color="#5C8097" />
            <ThSort label="categoría"   campo="categoria"   actual={campo} dir={dir} onClick={ordenarPor} color="#5C8097" />
            <ThSort label="descripción" campo="descripcion" actual={campo} dir={dir} onClick={ordenarPor} color="#5C8097" />
            <th style={{ padding: "4px 12px" }} />
          </tr>
        </thead>
        <tbody>
          {ordenados.length === 0 && (
            <tr><td colSpan={6} style={{ padding: "2rem 12px", color: "#1A3F54", textAlign: "center" }}>
              — sin registros —
            </td></tr>
          )}
          {ordenados.map((ing) => (
            <tr
              key={ing.id}
              style={{ borderBottom: "1px solid #0A2233", cursor: "default" }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "#012030")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
            >
              <td style={{ padding: "4px 8px" }}>
                <input
                  type="checkbox"
                  checked={seleccionados.has(ing.id)}
                  onChange={() => toggleSeleccion(ing.id)}
                  style={{ accentColor: "#5C8097" }}
                />
              </td>
              <td style={{ padding: "4px 12px", color: "#4E7A8A" }}>
                {formatearFecha(ing.fecha)}
                {ing.repeticion_id && <span style={{ color: "#7DD3FC", marginLeft: "4px", fontSize: "0.70rem" }}>↻</span>}
              </td>
              <td style={{ padding: "4px 12px", color: "#00ED64" }}>{formatearEuros(ing.importe)}</td>
              <td style={{ padding: "4px 12px", color: "#3D6676" }}>{ing.categoria?.nombre ?? "—"}</td>
              <td style={{ padding: "4px 12px", color: "#2A5A6E" }}>{ing.descripcion ?? "—"}</td>
              <td style={{ padding: "4px 12px", whiteSpace: "nowrap" }}>
                <button
                  onClick={() => abrirEditar(ing)}
                  style={{ color: "#1F4A5E", background: "none", border: "none", cursor: "pointer", fontSize: "0.80rem", marginRight: "0.5rem" }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = "#5C8097")}
                  onMouseLeave={(e) => (e.currentTarget.style.color = "#1F4A5E")}
                >
                  [e]
                </button>
                {confirmandoId === ing.id ? (
                  <>
                    <button
                      onClick={() => { eliminar.mutate(ing.id); setConfirmandoId(null) }}
                      style={{ color: "#FF6B35", background: "none", border: "none", cursor: "pointer", fontSize: "0.80rem", marginRight: "0.25rem" }}
                    >
                      [¿borrar?]
                    </button>
                    <button
                      onClick={() => setConfirmandoId(null)}
                      style={{ color: "#1F4A5E", background: "none", border: "none", cursor: "pointer", fontSize: "0.80rem" }}
                    >
                      [no]
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => setConfirmandoId(ing.id)}
                    style={{ color: "#1F4A5E", background: "none", border: "none", cursor: "pointer", fontSize: "0.80rem" }}
                    onMouseEnter={(e) => (e.currentTarget.style.color = "#FF6B35")}
                    onMouseLeave={(e) => (e.currentTarget.style.color = "#1F4A5E")}
                  >
                    [x]
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <Dialog open={confirmandoBulk} onOpenChange={setConfirmandoBulk}>
        <DialogContent style={{ background: "#012030", border: "1px solid #1A3F54" }}>
          <DialogHeader>
            <DialogTitle style={{ color: "#FF6B35", fontSize: "0.80rem", letterSpacing: "0.1em" }}>
              CONFIRMAR BORRADO
            </DialogTitle>
          </DialogHeader>
          <p style={{ color: "#5C8097", fontSize: "0.85rem" }}>
            ¿Borrar {seleccionados.size} ingreso{seleccionados.size !== 1 ? "s" : ""}? Esta acción no se puede deshacer.
          </p>
          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="outline" onClick={() => setConfirmandoBulk(false)}
              style={{ background: "none", border: "1px solid #1A3F54", color: "#6B95A7" }}>
              cancelar
            </Button>
            <Button
              onClick={() => eliminarBulk.mutate([...seleccionados])}
              disabled={eliminarBulk.isPending}
              style={{ background: "#1A0A00", color: "#FF6B35", border: "1px solid #FF6B35" }}>
              {eliminarBulk.isPending ? "..." : "borrar"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={dialogoCategoriaBulk} onOpenChange={(v) => { setDialogoCategoriaBulk(v); if (!v) setCategoriaBulkId(undefined) }}>
        <DialogContent style={{ background: "#012030", border: "1px solid #1A3F54" }}>
          <DialogHeader>
            <DialogTitle style={{ color: "#5C8097", fontSize: "0.80rem", letterSpacing: "0.1em" }}>
              EDITAR CATEGORÍA EN MASA
            </DialogTitle>
          </DialogHeader>
          <p style={{ color: "#3D6676", fontSize: "0.75rem" }}>
            {seleccionados.size} ingreso{seleccionados.size !== 1 ? "s" : ""} seleccionados · se actualizarán también los hermanos vinculados
          </p>
          <SelectorCategoria tipo="ingreso" value={categoriaBulkId} onChange={setCategoriaBulkId} />
          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="outline" onClick={() => setDialogoCategoriaBulk(false)}
              style={{ background: "none", border: "1px solid #1A3F54", color: "#6B95A7" }}>
              cancelar
            </Button>
            <Button
              onClick={() => editarCategoriaBulk.mutate({ ids: [...seleccionados], categoria_id: categoriaBulkId ? Number(categoriaBulkId) : null })}
              disabled={editarCategoriaBulk.isPending}
              style={{ background: "#011829", color: "#5C8097", border: "1px solid #2A5A6E" }}>
              {editarCategoriaBulk.isPending ? "..." : "guardar"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={abierto} onOpenChange={(v) => { setAbierto(v); if (!v) { setEditando(null); setMesesExtra([]); setMesesEliminar([]) } }}>
        <DialogContent style={{ background: "#012030", border: "1px solid #1A3F54" }}>
          <DialogHeader>
            <DialogTitle style={{ color: "#5C8097", fontSize: "0.80rem", letterSpacing: "0.1em" }}>
              {editando ? "EDITAR INGRESO" : "NUEVO INGRESO"}
            </DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit((d) => editando ? editar.mutate(d) : crear.mutate(d))} className="space-y-3">
              <FormField control={form.control} name="importe" render={({ field }) => (
                <FormItem>
                  <FormLabel>importe (€)</FormLabel>
                  <FormControl><Input placeholder="0.00" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="fecha" render={({ field }) => (
                <FormItem>
                  <FormLabel>fecha</FormLabel>
                  <FormControl><Input type="date" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="categoria_id" render={({ field }) => (
                <FormItem>
                  <FormLabel>categoría</FormLabel>
                  <SelectorCategoria tipo="ingreso" value={field.value} onChange={field.onChange} />
                </FormItem>
              )} />
              <FormField control={form.control} name="descripcion" render={({ field }) => (
                <FormItem>
                  <FormLabel>descripción</FormLabel>
                  <FormControl><Input {...field} /></FormControl>
                </FormItem>
              )} />

              <ChipsMeses
                mesesSeleccionados={mesesExtra}
                onChangeMesesExtra={setMesesExtra}
                mesesEliminar={mesesEliminar}
                onChangeMesesEliminar={setMesesEliminar}
                mesBase={mesBase}
                mesesExistentes={mesesExistentes}
              />

              <div className="flex justify-end gap-2 pt-1">
                <Button type="button" variant="outline" onClick={() => setAbierto(false)}
                  style={{ background: "none", border: "1px solid #1A3F54", color: "#6B95A7" }}>
                  cancelar
                </Button>
                <Button type="submit" disabled={crear.isPending || editar.isPending}
                  style={{ background: "#011829", color: "#5C8097", border: "1px solid #2A5A6E" }}>
                  {crear.isPending || editar.isPending ? "..." : "guardar"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
