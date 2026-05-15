import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { api } from "@/lib/api"
import { SelectorMes, useMes } from "@/lib/mes-context"
import { ThSort, useSorte } from "@/lib/tabla"
import { formatearEuros, formatearFecha } from "@/lib/utils"
import { zodResolver } from "@hookform/resolvers/zod"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useState } from "react"
import { useForm } from "react-hook-form"
import { z } from "zod"

const esquema = z.object({
  importe: z.string().min(1).refine((v) => Number(v) > 0, "debe ser > 0"),
  fecha: z.string().min(1, "obligatorio"),
  categoria_id: z.string().optional(),
  descripcion: z.string().optional(),
})

type Campos = z.infer<typeof esquema>
interface Categoria { id: number; nombre: string }
interface Gasto { id: number; importe: string; fecha: string; descripcion?: string; categoria?: Categoria }

export default function PaginaGastos() {
  const qc = useQueryClient()
  const [abierto, setAbierto] = useState(false)
  const [editando, setEditando] = useState<Gasto | null>(null)
  const { mes, anio } = useMes()

  const { data: gastos = [] } = useQuery<Gasto[]>({
    queryKey: ["gastos", mes, anio],
    queryFn: async () => (await api.get(`/gastos/?mes=${mes}&anio=${anio}`)).data,
  })

  const { data: categorias = [] } = useQuery<Categoria[]>({
    queryKey: ["categorias", "gasto"],
    queryFn: async () => (await api.get("/categorias/?tipo=gasto")).data,
  })

  const crear = useMutation({
    mutationFn: (d: Campos) => api.post("/gastos/", {
      importe: d.importe, fecha: d.fecha,
      categoria_id: d.categoria_id ? Number(d.categoria_id) : null,
      descripcion: d.descripcion || null,
    }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["gastos"] }); setAbierto(false) },
  })

  const eliminar = useMutation({
    mutationFn: (id: number) => api.delete(`/gastos/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["gastos"] }),
  })

  const editar = useMutation({
    mutationFn: ({ id, d }: { id: number; d: Campos }) => api.patch(`/gastos/${id}`, {
      importe: d.importe, fecha: d.fecha,
      categoria_id: d.categoria_id ? Number(d.categoria_id) : null,
      descripcion: d.descripcion || null,
    }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["gastos"] }); setAbierto(false); setEditando(null) },
  })

  const form = useForm<Campos>({
    resolver: zodResolver(esquema),
    defaultValues: { fecha: new Date().toISOString().slice(0, 10) },
  })

  const total = gastos.reduce((s, g) => s + Number(g.importe), 0)

  const { ordenados, campo, dir, ordenarPor } = useSorte(
    gastos, "fecha", "desc",
    (item, c) => {
      if (c === "fecha") return item.fecha
      if (c === "importe") return Number(item.importe)
      if (c === "categoria") return item.categoria?.nombre ?? ""
      return item.descripcion ?? ""
    },
  )

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4" style={{ borderBottom: "1px solid #0F3244", paddingBottom: "0.75rem" }}>
        <div>
          <div style={{ color: "#FF6B35", fontSize: "0.70rem", letterSpacing: "0.12em" }}>GASTOS</div>
          <SelectorMes />
        </div>
        <div className="flex items-center gap-4">
          <span style={{ color: "#FF6B35", fontSize: "1.00rem", fontWeight: 600 }}>
            {formatearEuros(total)}
          </span>
          <Button
            onClick={() => { setEditando(null); form.reset({ fecha: new Date().toISOString().slice(0, 10) }); setAbierto(true) }}
            style={{ background: "#1F0D05", color: "#FF6B35", border: "1px solid #4D1E09" }}
          >
            + nuevo
          </Button>
        </div>
      </div>

      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr style={{ borderBottom: "1px solid #112B3A" }}>
            <ThSort label="fecha"       campo="fecha"       actual={campo} dir={dir} onClick={ordenarPor} color="#FF6B35" />
            <ThSort label="importe"     campo="importe"     actual={campo} dir={dir} onClick={ordenarPor} color="#FF6B35" />
            <ThSort label="categoría"   campo="categoria"   actual={campo} dir={dir} onClick={ordenarPor} color="#FF6B35" />
            <ThSort label="descripción" campo="descripcion" actual={campo} dir={dir} onClick={ordenarPor} color="#FF6B35" />
            <th style={{ padding: "4px 12px" }} />
          </tr>
        </thead>
        <tbody>
          {ordenados.length === 0 && (
            <tr><td colSpan={5} style={{ padding: "2rem 12px", color: "#1A3F54", textAlign: "center" }}>
              — sin registros —
            </td></tr>
          )}
          {ordenados.map((g) => (
            <tr
              key={g.id}
              style={{ borderBottom: "1px solid #0A2233" }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "#012030")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
            >
              <td style={{ padding: "4px 12px", color: "#4E7A8A" }}>{formatearFecha(g.fecha)}</td>
              <td style={{ padding: "4px 12px", color: "#FF6B35" }}>{formatearEuros(g.importe)}</td>
              <td style={{ padding: "4px 12px", color: "#3D6676" }}>{g.categoria?.nombre ?? "—"}</td>
              <td style={{ padding: "4px 12px", color: "#2A5A6E" }}>{g.descripcion ?? "—"}</td>
              <td style={{ padding: "4px 12px", whiteSpace: "nowrap" }}>
                <button
                  onClick={() => {
                    setEditando(g)
                    form.reset({
                      importe: g.importe,
                      fecha: g.fecha,
                      categoria_id: g.categoria ? String(g.categoria.id) : undefined,
                      descripcion: g.descripcion ?? undefined,
                    })
                    setAbierto(true)
                  }}
                  style={{ color: "#1F4A5E", background: "none", border: "none", cursor: "pointer", fontSize: "0.80rem", marginRight: "0.5rem" }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = "#FF6B35")}
                  onMouseLeave={(e) => (e.currentTarget.style.color = "#1F4A5E")}
                >
                  [e]
                </button>
                <button
                  onClick={() => eliminar.mutate(g.id)}
                  style={{ color: "#1F4A5E", background: "none", border: "none", cursor: "pointer", fontSize: "0.80rem" }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = "#FF6B35")}
                  onMouseLeave={(e) => (e.currentTarget.style.color = "#1F4A5E")}
                >
                  [x]
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <Dialog open={abierto} onOpenChange={(v) => { setAbierto(v); if (!v) setEditando(null) }}>
        <DialogContent style={{ background: "#012030", border: "1px solid #2a2a2a" }}>
          <DialogHeader>
            <DialogTitle style={{ color: "#FF6B35", fontSize: "0.80rem", letterSpacing: "0.1em" }}>
              {editando ? "EDITAR GASTO" : "NUEVO GASTO"}
            </DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit((d) =>
              editando ? editar.mutate({ id: editando.id, d }) : crear.mutate(d)
            )} className="space-y-3">
              <FormField control={form.control} name="importe" render={({ field }) => (
                <FormItem><FormLabel>importe (€)</FormLabel>
                  <FormControl><Input placeholder="0.00" {...field} /></FormControl>
                  <FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="fecha" render={({ field }) => (
                <FormItem><FormLabel>fecha</FormLabel>
                  <FormControl><Input type="date" {...field} /></FormControl>
                  <FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="categoria_id" render={({ field }) => (
                <FormItem><FormLabel>categoría</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger><SelectValue placeholder="— sin categoría —" /></SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {categorias.map((c) => (
                        <SelectItem key={c.id} value={String(c.id)}>{c.nombre}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormItem>
              )} />
              <FormField control={form.control} name="descripcion" render={({ field }) => (
                <FormItem><FormLabel>descripción</FormLabel>
                  <FormControl><Input {...field} /></FormControl>
                </FormItem>
              )} />
              <div className="flex justify-end gap-2 pt-1">
                <Button type="button" variant="outline" onClick={() => setAbierto(false)}
                  style={{ background: "none", border: "1px solid #2a2a2a", color: "#3D6676" }}>
                  cancelar
                </Button>
                <Button type="submit" disabled={crear.isPending || editar.isPending}
                  style={{ background: "#1F0D05", color: "#FF6B35", border: "1px solid #4D1E09" }}>
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
