import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useDialogoCrud } from "@/lib/crud"
import { esquemaImporte } from "@/lib/esquemas"
import { api } from "@/lib/api"
import { SelectorMes, useMes } from "@/lib/mes-context"
import { ThSort, useSorte } from "@/lib/tabla"
import { type Categoria, type GrupoPresupuesto, type Presupuesto } from "@/lib/tipos"
import { SelectorCategoria } from "@/components/selector-categoria"
import { MESES_NOMBRE, formatearEuros, normalizarImporte } from "@/lib/utils"
import { zodResolver } from "@hookform/resolvers/zod"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useState } from "react"
import { useForm } from "react-hook-form"
import { toast } from "sonner"
import { z } from "zod"

const esquema = z.object({
  categoria_id: z.string().min(1, "obligatorio"),
  importe: esquemaImporte,
  mes: z.string().min(1),
  anio: z.string().min(1),
})

type Campos = z.infer<typeof esquema>

const esquemaGrupo = z.object({
  nombre: z.string().min(1, "obligatorio"),
  importe: esquemaImporte,
  mes: z.string().min(1),
  anio: z.string().min(1),
})

type CamposGrupo = z.infer<typeof esquemaGrupo>

export default function PaginaPresupuestos() {
  const qc = useQueryClient()
  const { abierto, setAbierto, editando, setEditando, confirmandoId, setConfirmandoId } = useDialogoCrud<Presupuesto>()
  const {
    abierto: abiertoGrupo, setAbierto: setAbiertoGrupo,
    editando: editandoGrupo, setEditando: setEditandoGrupo,
    confirmandoId: confirmandoGrupoId, setConfirmandoId: setConfirmandoGrupoId,
  } = useDialogoCrud<GrupoPresupuesto>()
  const { mes, anio } = useMes()

  const [catIdsSeleccionadas, setCatIdsSeleccionadas] = useState<number[]>([])

  const { data: presupuestos = [] } = useQuery<Presupuesto[]>({
    queryKey: ["presupuestos", mes, anio],
    queryFn: async () => (await api.get(`/presupuestos/?mes=${mes}&anio=${anio}`)).data,
  })

  const { data: grupos = [] } = useQuery<GrupoPresupuesto[]>({
    queryKey: ["grupos-presupuesto", mes, anio],
    queryFn: async () => (await api.get(`/grupos-presupuesto/?mes=${mes}&anio=${anio}`)).data,
  })

  const { data: categoriasGasto = [] } = useQuery<Categoria[]>({
    queryKey: ["categorias"],
    queryFn: async () => (await api.get("/categorias/")).data,
    select: (cats) => cats.filter((c) => c.tipo === "gasto" || c.tipo === "ambos"),
  })

  const guardar = useMutation({
    mutationFn: (d: Campos) => api.put("/presupuestos/", {
      categoria_id: Number(d.categoria_id), importe: normalizarImporte(d.importe),
      mes: Number(d.mes), anio: Number(d.anio),
    }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["presupuestos"] }); setAbierto(false); toast.success("presupuesto guardado") },
  })

  const eliminar = useMutation({
    mutationFn: (id: number) => api.delete(`/presupuestos/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["presupuestos"] }); toast.success("presupuesto eliminado") },
  })

  const guardarGrupo = useMutation({
    mutationFn: (d: CamposGrupo) => {
      const body = {
        nombre: d.nombre,
        importe: normalizarImporte(d.importe),
        mes: Number(d.mes),
        anio: Number(d.anio),
        categoria_ids: catIdsSeleccionadas,
      }
      return editandoGrupo
        ? api.patch(`/grupos-presupuesto/${editandoGrupo.id}`, { nombre: body.nombre, importe: body.importe, categoria_ids: body.categoria_ids })
        : api.post("/grupos-presupuesto/", body)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["grupos-presupuesto"] })
      setAbiertoGrupo(false)
      setEditandoGrupo(null)
      toast.success(editandoGrupo ? "grupo actualizado" : "grupo creado")
    },
  })

  const eliminarGrupo = useMutation({
    mutationFn: (id: number) => api.delete(`/grupos-presupuesto/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["grupos-presupuesto"] }); toast.success("grupo eliminado") },
  })

  const form = useForm<Campos>({
    resolver: zodResolver(esquema),
    defaultValues: { mes: String(mes), anio: String(anio) },
  })

  const formGrupo = useForm<CamposGrupo>({
    resolver: zodResolver(esquemaGrupo),
    defaultValues: { mes: String(mes), anio: String(anio) },
  })

  const { ordenados, campo, dir, ordenarPor } = useSorte(
    presupuestos, "categoria", "asc",
    (item, c) => c === "importe" ? Number(item.importe) : item.categoria.nombre,
  )

  function abrirNuevoGrupo() {
    setEditandoGrupo(null)
    setCatIdsSeleccionadas([])
    formGrupo.reset({ mes: String(mes), anio: String(anio) })
    setAbiertoGrupo(true)
  }

  function abrirEditarGrupo(g: GrupoPresupuesto) {
    setEditandoGrupo(g)
    setCatIdsSeleccionadas(g.categorias.map((c) => c.id))
    formGrupo.reset({ nombre: g.nombre, importe: String(g.importe), mes: String(g.mes), anio: String(g.anio) })
    setAbiertoGrupo(true)
  }

  function toggleCategoria(id: number) {
    setCatIdsSeleccionadas((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    )
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4" style={{ borderBottom: "1px solid #0F3244", paddingBottom: "0.75rem" }}>
        <div>
          <div style={{ color: "#A5B4FC", fontSize: "0.70rem", letterSpacing: "0.12em" }}>PRESUPUESTOS</div>
          <SelectorMes />
        </div>
        <Button
          onClick={() => { setEditando(null); form.reset({ mes: String(mes), anio: String(anio) }); setAbierto(true) }}
          style={{ background: "#011829", color: "#5C8097", border: "1px solid #2A5A6E" }}
        >
          + nuevo
        </Button>
      </div>

      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr style={{ borderBottom: "1px solid #112B3A" }}>
            <ThSort label="categoría"   campo="categoria" actual={campo} dir={dir} onClick={ordenarPor} color="#5C8097" />
            <ThSort label="presupuesto" campo="importe"   actual={campo} dir={dir} onClick={ordenarPor} color="#5C8097" />
            <th style={{ padding: "4px 12px" }} />
          </tr>
        </thead>
        <tbody>
          {ordenados.length === 0 && (
            <tr><td colSpan={3} style={{ padding: "2rem 12px", color: "#1A3F54", textAlign: "center" }}>
              — sin presupuestos —
            </td></tr>
          )}
          {ordenados.map((p) => (
            <tr
              key={p.id}
              style={{ borderBottom: "1px solid #0A2233" }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "#012030")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
            >
              <td style={{ padding: "4px 12px", color: "#4E7A8A" }}>{p.categoria.nombre}</td>
              <td style={{ padding: "4px 12px", color: "#5C8097" }}>{formatearEuros(p.importe)}</td>
              <td style={{ padding: "4px 12px", whiteSpace: "nowrap" }}>
                <button
                  onClick={() => {
                    setEditando(p)
                    form.reset({
                      categoria_id: String(p.categoria_id),
                      importe: String(p.importe),
                      mes: String(p.mes),
                      anio: String(p.anio),
                    })
                    setAbierto(true)
                  }}
                  style={{ color: "#1F4A5E", background: "none", border: "none", cursor: "pointer", fontSize: "0.80rem", marginRight: "0.5rem" }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = "#5C8097")}
                  onMouseLeave={(e) => (e.currentTarget.style.color = "#1F4A5E")}
                >
                  [e]
                </button>
                {confirmandoId === p.id ? (
                  <>
                    <button
                      onClick={() => { eliminar.mutate(p.id); setConfirmandoId(null) }}
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
                    onClick={() => setConfirmandoId(p.id)}
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

      {/* Grupos de presupuesto */}
      <div className="flex items-center justify-between mt-8 mb-3" style={{ borderBottom: "1px solid #0F3244", paddingBottom: "0.5rem" }}>
        <div style={{ color: "#A5B4FC", fontSize: "0.70rem", letterSpacing: "0.12em" }}>GRUPOS DE PRESUPUESTO</div>
        <Button onClick={abrirNuevoGrupo} style={{ background: "#011829", color: "#5C8097", border: "1px solid #2A5A6E" }}>
          + nuevo grupo
        </Button>
      </div>

      {grupos.length === 0 ? (
        <div style={{ color: "#1A3F54", fontSize: "0.80rem", padding: "1rem 0" }}>— sin grupos —</div>
      ) : (
        <div className="space-y-3">
          {grupos.map((g) => {
            const pct = Math.min(100, (Number(g.total_gastado) / Number(g.importe)) * 100)
            const colorBarra = Number(g.total_gastado) > Number(g.importe) ? "#FF6B35" : "#00ED64"
            return (
              <div key={g.id} style={{ border: "1px solid #0F3244", padding: "0.75rem 1rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "4px" }}>
                  <span style={{ color: "#9BB7C4", fontSize: "0.85rem" }}>{g.nombre}</span>
                  <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                    <span style={{ color: "#3D6676", fontSize: "0.77rem" }}>
                      {formatearEuros(g.total_gastado)}
                      <span style={{ color: "#1F4A5E" }}> / {formatearEuros(g.importe)}</span>
                    </span>
                    <button
                      onClick={() => abrirEditarGrupo(g)}
                      style={{ color: "#1F4A5E", background: "none", border: "none", cursor: "pointer", fontSize: "0.75rem" }}
                      onMouseEnter={(e) => (e.currentTarget.style.color = "#5C8097")}
                      onMouseLeave={(e) => (e.currentTarget.style.color = "#1F4A5E")}
                    >[e]</button>
                    {confirmandoGrupoId === g.id ? (
                      <>
                        <button
                          onClick={() => { eliminarGrupo.mutate(g.id); setConfirmandoGrupoId(null) }}
                          style={{ color: "#FF6B35", background: "none", border: "none", cursor: "pointer", fontSize: "0.75rem" }}
                        >[¿borrar?]</button>
                        <button
                          onClick={() => setConfirmandoGrupoId(null)}
                          style={{ color: "#1F4A5E", background: "none", border: "none", cursor: "pointer", fontSize: "0.75rem" }}
                        >[no]</button>
                      </>
                    ) : (
                      <button
                        onClick={() => setConfirmandoGrupoId(g.id)}
                        style={{ color: "#1F4A5E", background: "none", border: "none", cursor: "pointer", fontSize: "0.75rem" }}
                        onMouseEnter={(e) => (e.currentTarget.style.color = "#FF6B35")}
                        onMouseLeave={(e) => (e.currentTarget.style.color = "#1F4A5E")}
                      >[x]</button>
                    )}
                  </div>
                </div>
                <div style={{ height: "2px", background: "#112B3A", marginBottom: "6px" }}>
                  <div style={{ height: "100%", width: `${pct}%`, background: colorBarra, transition: "width 0.3s" }} />
                </div>
                {g.categorias.length > 0 && (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "0.25rem" }}>
                    {g.categorias.map((c) => (
                      <span key={c.id} style={{ fontSize: "0.70rem", color: "#2A5A6E", border: "1px solid #112B3A", padding: "1px 6px" }}>
                        {c.nombre}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Dialog presupuesto individual */}
      <Dialog open={abierto} onOpenChange={(v) => { setAbierto(v); if (!v) setEditando(null) }}>
        <DialogContent style={{ background: "#012030", border: "1px solid #1A3F54" }}>
          <DialogHeader>
            <DialogTitle style={{ color: "#5C8097", fontSize: "0.80rem", letterSpacing: "0.1em" }}>
              {editando ? "EDITAR PRESUPUESTO" : "NUEVO PRESUPUESTO"}
            </DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit((d) => guardar.mutate(d))} className="space-y-3">
              <FormField control={form.control} name="categoria_id" render={({ field }) => (
                <FormItem><FormLabel>categoría</FormLabel>
                  <SelectorCategoria tipo="gasto" value={field.value} onChange={field.onChange} />
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="importe" render={({ field }) => (
                <FormItem><FormLabel>importe (€)</FormLabel>
                  <FormControl><Input placeholder="0.00" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                <FormField control={form.control} name="mes" render={({ field }) => (
                  <FormItem><FormLabel>mes</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                      <SelectContent>
                        {MESES_NOMBRE.map((m, i) => <SelectItem key={i + 1} value={String(i + 1)}>{m.toLowerCase()}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </FormItem>
                )} />
                <FormField control={form.control} name="anio" render={({ field }) => (
                  <FormItem><FormLabel>año</FormLabel>
                    <FormControl><Input {...field} /></FormControl>
                  </FormItem>
                )} />
              </div>
              <div className="flex justify-end gap-2 pt-1">
                <Button type="button" variant="outline" onClick={() => setAbierto(false)}
                  style={{ background: "none", border: "1px solid #1A3F54", color: "#6B95A7" }}>
                  cancelar
                </Button>
                <Button type="submit" disabled={guardar.isPending}
                  style={{ background: "#011829", color: "#5C8097", border: "1px solid #2A5A6E" }}>
                  {guardar.isPending ? "..." : "guardar"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Dialog grupo */}
      <Dialog open={abiertoGrupo} onOpenChange={(v) => { setAbiertoGrupo(v); if (!v) setEditandoGrupo(null) }}>
        <DialogContent style={{ background: "#012030", border: "1px solid #1A3F54" }}>
          <DialogHeader>
            <DialogTitle style={{ color: "#5C8097", fontSize: "0.80rem", letterSpacing: "0.1em" }}>
              {editandoGrupo ? "EDITAR GRUPO" : "NUEVO GRUPO"}
            </DialogTitle>
          </DialogHeader>
          <Form {...formGrupo}>
            <form onSubmit={formGrupo.handleSubmit((d) => guardarGrupo.mutate(d))} className="space-y-3">
              <FormField control={formGrupo.control} name="nombre" render={({ field }) => (
                <FormItem><FormLabel>nombre</FormLabel>
                  <FormControl><Input {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={formGrupo.control} name="importe" render={({ field }) => (
                <FormItem><FormLabel>importe (€)</FormLabel>
                  <FormControl><Input placeholder="0.00" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                <FormField control={formGrupo.control} name="mes" render={({ field }) => (
                  <FormItem><FormLabel>mes</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                      <SelectContent>
                        {MESES_NOMBRE.map((m, i) => <SelectItem key={i + 1} value={String(i + 1)}>{m.toLowerCase()}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </FormItem>
                )} />
                <FormField control={formGrupo.control} name="anio" render={({ field }) => (
                  <FormItem><FormLabel>año</FormLabel>
                    <FormControl><Input {...field} /></FormControl>
                  </FormItem>
                )} />
              </div>
              <div>
                <div style={{ color: "#5C8097", fontSize: "0.75rem", marginBottom: "0.5rem" }}>categorías</div>
                <div style={{ maxHeight: "160px", overflowY: "auto", display: "flex", flexDirection: "column", gap: "4px" }}>
                  {categoriasGasto.map((c) => (
                    <label key={c.id} style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer", fontSize: "0.80rem", color: "#4E7A8A" }}>
                      <input
                        type="checkbox"
                        checked={catIdsSeleccionadas.includes(c.id)}
                        onChange={() => toggleCategoria(c.id)}
                        style={{ accentColor: "#5C8097" }}
                      />
                      {c.nombre}
                    </label>
                  ))}
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-1">
                <Button type="button" variant="outline" onClick={() => setAbiertoGrupo(false)}
                  style={{ background: "none", border: "1px solid #1A3F54", color: "#6B95A7" }}>
                  cancelar
                </Button>
                <Button type="submit" disabled={guardarGrupo.isPending}
                  style={{ background: "#011829", color: "#5C8097", border: "1px solid #2A5A6E" }}>
                  {guardarGrupo.isPending ? "..." : "guardar"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
