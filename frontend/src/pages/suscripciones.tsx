import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { api } from "@/lib/api"
import { ThSort, useSorte } from "@/lib/tabla"
import { formatearEuros } from "@/lib/utils"
import { zodResolver } from "@hookform/resolvers/zod"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useState } from "react"
import { useForm } from "react-hook-form"
import { toast } from "sonner"
import { z } from "zod"

const esquema = z.object({
  nombre: z.string().min(1, "obligatorio"),
  importe: z.string().min(1).refine((v) => Number(v) > 0, "debe ser > 0"),
  categoria_id: z.string().optional(),
  dia_cobro: z.string().optional(),
  notas: z.string().optional(),
})

type Campos = z.infer<typeof esquema>
interface Categoria { id: number; nombre: string }
interface Suscripcion {
  id: number; nombre: string; importe: string; activa: boolean
  dia_cobro?: number; notas?: string; categoria?: Categoria
}

export default function PaginaSuscripciones() {
  const qc = useQueryClient()
  const [abierto, setAbierto] = useState(false)
  const [editando, setEditando] = useState<Suscripcion | null>(null)
  const [confirmandoId, setConfirmandoId] = useState<number | null>(null)

  const { data: suscripciones = [] } = useQuery<Suscripcion[]>({
    queryKey: ["suscripciones"],
    queryFn: async () => (await api.get("/suscripciones/")).data,
  })

  const { data: categorias = [] } = useQuery<Categoria[]>({
    queryKey: ["categorias", "gasto"],
    queryFn: async () => (await api.get("/categorias/?tipo=gasto")).data,
  })

  const crear = useMutation({
    mutationFn: (d: Campos) => api.post("/suscripciones/", {
      nombre: d.nombre,
      importe: d.importe,
      categoria_id: d.categoria_id ? Number(d.categoria_id) : null,
      dia_cobro: d.dia_cobro ? Number(d.dia_cobro) : null,
      notas: d.notas || null,
    }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["suscripciones"] }); setAbierto(false); toast.success("suscripción creada") },
  })

  const toggleActiva = useMutation({
    mutationFn: ({ id, activa }: { id: number; activa: boolean }) =>
      api.patch(`/suscripciones/${id}`, { activa }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["suscripciones"] }),
  })

  const eliminar = useMutation({
    mutationFn: (id: number) => api.delete(`/suscripciones/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["suscripciones"] }); toast.success("suscripción eliminada") },
  })

  const editar = useMutation({
    mutationFn: ({ id, d }: { id: number; d: Campos }) => api.patch(`/suscripciones/${id}`, {
      nombre: d.nombre,
      importe: d.importe,
      categoria_id: d.categoria_id ? Number(d.categoria_id) : null,
      dia_cobro: d.dia_cobro ? Number(d.dia_cobro) : null,
      notas: d.notas || null,
    }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["suscripciones"] }); setAbierto(false); setEditando(null); toast.success("suscripción actualizada") },
  })

  const form = useForm<Campos>({ resolver: zodResolver(esquema) })

  const totalActivas = suscripciones.filter((s) => s.activa).reduce((acc, s) => acc + Number(s.importe), 0)

  const { ordenados, campo, dir, ordenarPor } = useSorte(
    suscripciones, "nombre", "asc",
    (item, c) => {
      if (c === "importe") return Number(item.importe)
      if (c === "dia_cobro") return item.dia_cobro ?? 999
      if (c === "categoria") return item.categoria?.nombre ?? ""
      if (c === "notas") return item.notas ?? ""
      if (c === "estado") return item.activa ? 0 : 1
      return item.nombre
    },
  )

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4" style={{ borderBottom: "1px solid #0F3244", paddingBottom: "0.75rem" }}>
        <div>
          <div style={{ color: "#FFB020", fontSize: "0.70rem", letterSpacing: "0.12em" }}>SUSCRIPCIONES</div>
          <div style={{ color: "#1F4A5E", fontSize: "0.70rem" }}>recurrentes mensuales</div>
        </div>
        <div className="flex items-center gap-4">
          <span style={{ color: "#FFB020", fontSize: "1.00rem", fontWeight: 600 }}>
            {formatearEuros(totalActivas)}<span style={{ color: "#1F4A5E", fontSize: "0.70rem" }}>/mes</span>
          </span>
          <Button
            onClick={() => { setEditando(null); form.reset(); setAbierto(true) }}
            style={{ background: "#1F1400", color: "#FFB020", border: "1px solid #4D3300" }}
          >
            + nueva
          </Button>
        </div>
      </div>

      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr style={{ borderBottom: "1px solid #112B3A" }}>
            <ThSort label="nombre"    campo="nombre"    actual={campo} dir={dir} onClick={ordenarPor} color="#FFB020" />
            <ThSort label="importe"   campo="importe"   actual={campo} dir={dir} onClick={ordenarPor} color="#FFB020" />
            <ThSort label="día cobro" campo="dia_cobro" actual={campo} dir={dir} onClick={ordenarPor} color="#FFB020" />
            <ThSort label="categoría" campo="categoria" actual={campo} dir={dir} onClick={ordenarPor} color="#FFB020" />
            <ThSort label="notas"     campo="notas"     actual={campo} dir={dir} onClick={ordenarPor} color="#FFB020" />
            <ThSort label="estado"    campo="estado"    actual={campo} dir={dir} onClick={ordenarPor} color="#FFB020" />
            <th style={{ padding: "4px 12px" }} />
          </tr>
        </thead>
        <tbody>
          {ordenados.length === 0 && (
            <tr><td colSpan={7} style={{ padding: "2rem 12px", color: "#1A3F54", textAlign: "center" }}>
              — sin suscripciones —
            </td></tr>
          )}
          {ordenados.map((s) => (
            <tr
              key={s.id}
              style={{ borderBottom: "1px solid #0A2233", opacity: s.activa ? 1 : 0.4 }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "#012030")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
            >
              <td style={{ padding: "4px 12px", color: "#9BB7C4" }}>{s.nombre}</td>
              <td style={{ padding: "4px 12px", color: "#FFB020" }}>{formatearEuros(s.importe)}</td>
              <td style={{ padding: "4px 12px", color: "#3D6676" }}>{s.dia_cobro ? `día ${s.dia_cobro}` : "—"}</td>
              <td style={{ padding: "4px 12px", color: "#3D6676" }}>{s.categoria?.nombre ?? "—"}</td>
              <td style={{ padding: "4px 12px", color: "#2A5A6E", maxWidth: "10rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {s.notas ?? "—"}
              </td>
              <td style={{ padding: "4px 12px" }}>
                <button
                  onClick={() => toggleActiva.mutate({ id: s.id, activa: !s.activa })}
                  style={{ color: s.activa ? "#00ED64" : "#1F4A5E", background: "none", border: "none", cursor: "pointer", fontSize: "0.80rem" }}
                >
                  {s.activa ? "[activa]" : "[inactiva]"}
                </button>
              </td>
              <td style={{ padding: "4px 12px", whiteSpace: "nowrap" }}>
                <button
                  onClick={() => {
                    setEditando(s)
                    form.reset({
                      nombre: s.nombre,
                      importe: String(s.importe),
                      categoria_id: s.categoria ? String(s.categoria.id) : undefined,
                      dia_cobro: s.dia_cobro ? String(s.dia_cobro) : undefined,
                      notas: s.notas ?? undefined,
                    })
                    setAbierto(true)
                  }}
                  style={{ color: "#1F4A5E", background: "none", border: "none", cursor: "pointer", fontSize: "0.80rem", marginRight: "0.5rem" }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = "#FFB020")}
                  onMouseLeave={(e) => (e.currentTarget.style.color = "#1F4A5E")}
                >
                  [e]
                </button>
                {confirmandoId === s.id ? (
                  <>
                    <button
                      onClick={() => { eliminar.mutate(s.id); setConfirmandoId(null) }}
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
                    onClick={() => setConfirmandoId(s.id)}
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

      <Dialog open={abierto} onOpenChange={(v) => { setAbierto(v); if (!v) setEditando(null) }}>
        <DialogContent style={{ background: "#012030", border: "1px solid #1A3F54" }}>
          <DialogHeader>
            <DialogTitle style={{ color: "#FFB020", fontSize: "0.80rem", letterSpacing: "0.1em" }}>
              {editando ? "EDITAR SUSCRIPCIÓN" : "NUEVA SUSCRIPCIÓN"}
            </DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit((d) =>
              editando ? editar.mutate({ id: editando.id, d }) : crear.mutate(d)
            )} className="space-y-3">
              <FormField control={form.control} name="nombre" render={({ field }) => (
                <FormItem><FormLabel>nombre</FormLabel>
                  <FormControl><Input placeholder="Spotify, Netflix…" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                <FormField control={form.control} name="importe" render={({ field }) => (
                  <FormItem><FormLabel>importe (€/mes)</FormLabel>
                    <FormControl><Input placeholder="9.99" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="dia_cobro" render={({ field }) => (
                  <FormItem><FormLabel>día de cobro</FormLabel>
                    <FormControl><Input placeholder="1-31" {...field} /></FormControl>
                  </FormItem>
                )} />
              </div>
              <FormField control={form.control} name="categoria_id" render={({ field }) => (
                <FormItem><FormLabel>categoría</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl><SelectTrigger><SelectValue placeholder="— sin categoría —" /></SelectTrigger></FormControl>
                    <SelectContent>
                      {categorias.map((c) => <SelectItem key={c.id} value={String(c.id)}>{c.nombre}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </FormItem>
              )} />
              <FormField control={form.control} name="notas" render={({ field }) => (
                <FormItem><FormLabel>notas</FormLabel>
                  <FormControl><Input placeholder="plan familiar, compartida…" {...field} /></FormControl>
                </FormItem>
              )} />
              <div className="flex justify-end gap-2 pt-1">
                <Button type="button" variant="outline" onClick={() => setAbierto(false)}
                  style={{ background: "none", border: "1px solid #1A3F54", color: "#6B95A7" }}>
                  cancelar
                </Button>
                <Button type="submit" disabled={crear.isPending || editar.isPending}
                  style={{ background: "#1F1400", color: "#FFB020", border: "1px solid #4D3300" }}>
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
