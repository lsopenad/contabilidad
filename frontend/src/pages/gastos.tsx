import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { api } from "@/lib/api"
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
  const mes = new Date().getMonth() + 1
  const anio = new Date().getFullYear()

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

  const form = useForm<Campos>({
    resolver: zodResolver(esquema),
    defaultValues: { fecha: new Date().toISOString().slice(0, 10) },
  })

  const total = gastos.reduce((s, g) => s + Number(g.importe), 0)

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4" style={{ borderBottom: "1px solid #1e1e1e", paddingBottom: "0.75rem" }}>
        <div>
          <div style={{ color: "#f48771", fontSize: "0.65rem", letterSpacing: "0.12em" }}>GASTOS</div>
          <div style={{ color: "#333", fontSize: "0.65rem" }}>
            {new Date().toLocaleDateString("es-ES", { month: "long", year: "numeric" })}
          </div>
        </div>
        <div className="flex items-center gap-4">
          <span style={{ color: "#f48771", fontSize: "0.95rem", fontWeight: 600 }}>
            {formatearEuros(total)}
          </span>
          <Button
            onClick={() => { form.reset({ fecha: new Date().toISOString().slice(0, 10) }); setAbierto(true) }}
            style={{ background: "#3b1010", color: "#f48771", border: "1px solid #5a1a1a" }}
          >
            + nuevo
          </Button>
        </div>
      </div>

      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr style={{ borderBottom: "1px solid #1a1a1a" }}>
            {["fecha", "importe", "categoría", "descripción", ""].map((h) => (
              <th key={h} style={{ textAlign: "left", padding: "4px 12px", color: "#333" }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {gastos.length === 0 && (
            <tr><td colSpan={5} style={{ padding: "2rem 12px", color: "#2a2a2a", textAlign: "center" }}>
              — sin registros —
            </td></tr>
          )}
          {gastos.map((g) => (
            <tr
              key={g.id}
              style={{ borderBottom: "1px solid #141414" }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "#111")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
            >
              <td style={{ padding: "4px 12px", color: "#666" }}>{formatearFecha(g.fecha)}</td>
              <td style={{ padding: "4px 12px", color: "#f48771" }}>{formatearEuros(g.importe)}</td>
              <td style={{ padding: "4px 12px", color: "#555" }}>{g.categoria?.nombre ?? "—"}</td>
              <td style={{ padding: "4px 12px", color: "#444" }}>{g.descripcion ?? "—"}</td>
              <td style={{ padding: "4px 12px" }}>
                <button
                  onClick={() => eliminar.mutate(g.id)}
                  style={{ color: "#333", background: "none", border: "none", cursor: "pointer", fontSize: "0.7rem" }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = "#f48771")}
                  onMouseLeave={(e) => (e.currentTarget.style.color = "#333")}
                >
                  [x]
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <Dialog open={abierto} onOpenChange={setAbierto}>
        <DialogContent style={{ background: "#111", border: "1px solid #2a2a2a" }}>
          <DialogHeader>
            <DialogTitle style={{ color: "#f48771", fontSize: "0.75rem", letterSpacing: "0.1em" }}>
              NUEVO GASTO
            </DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit((d) => crear.mutate(d))} className="space-y-3">
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
                  style={{ background: "none", border: "1px solid #2a2a2a", color: "#555" }}>
                  cancelar
                </Button>
                <Button type="submit" disabled={crear.isPending}
                  style={{ background: "#3b1010", color: "#f48771", border: "1px solid #5a1a1a" }}>
                  {crear.isPending ? "..." : "guardar"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
