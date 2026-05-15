import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { api } from "@/lib/api"
import { SelectorMes, useMes } from "@/lib/mes-context"
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
interface Ingreso { id: number; importe: string; fecha: string; descripcion?: string; categoria?: Categoria }

export default function PaginaIngresos() {
  const qc = useQueryClient()
  const [abierto, setAbierto] = useState(false)
  const { mes, anio } = useMes()

  const { data: ingresos = [] } = useQuery<Ingreso[]>({
    queryKey: ["ingresos", mes, anio],
    queryFn: async () => (await api.get(`/ingresos/?mes=${mes}&anio=${anio}`)).data,
  })

  const { data: categorias = [] } = useQuery<Categoria[]>({
    queryKey: ["categorias", "ingreso"],
    queryFn: async () => (await api.get("/categorias/?tipo=ingreso")).data,
  })

  const crear = useMutation({
    mutationFn: (d: Campos) => api.post("/ingresos/", {
      importe: d.importe, fecha: d.fecha,
      categoria_id: d.categoria_id ? Number(d.categoria_id) : null,
      descripcion: d.descripcion || null,
    }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["ingresos"] }); setAbierto(false) },
  })

  const eliminar = useMutation({
    mutationFn: (id: number) => api.delete(`/ingresos/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["ingresos"] }),
  })

  const form = useForm<Campos>({
    resolver: zodResolver(esquema),
    defaultValues: { fecha: new Date().toISOString().slice(0, 10) },
  })

  const total = ingresos.reduce((s, i) => s + Number(i.importe), 0)

  return (
    <div className="p-6">
      {/* Cabecera */}
      <div className="flex items-center justify-between mb-4" style={{ borderBottom: "1px solid #1e1e1e", paddingBottom: "0.75rem" }}>
        <div>
          <div style={{ color: "#4ec9b0", fontSize: "0.65rem", letterSpacing: "0.12em" }}>INGRESOS</div>
          <SelectorMes />
        </div>
        <div className="flex items-center gap-4">
          <span style={{ color: "#4ec9b0", fontSize: "0.95rem", fontWeight: 600 }}>
            {formatearEuros(total)}
          </span>
          <Button
            onClick={() => { form.reset({ fecha: new Date().toISOString().slice(0, 10) }); setAbierto(true) }}
            style={{ background: "#0d2420", color: "#4ec9b0", border: "1px solid #1a4035" }}
          >
            + nuevo
          </Button>
        </div>
      </div>

      {/* Tabla */}
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr style={{ borderBottom: "1px solid #1a1a1a" }}>
            {["fecha", "importe", "categoría", "descripción", ""].map((h) => (
              <th key={h} style={{ textAlign: "left", padding: "4px 12px", color: "#333" }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {ingresos.length === 0 && (
            <tr><td colSpan={5} style={{ padding: "2rem 12px", color: "#2a2a2a", textAlign: "center" }}>
              — sin registros —
            </td></tr>
          )}
          {ingresos.map((ing) => (
            <tr
              key={ing.id}
              style={{ borderBottom: "1px solid #141414", cursor: "default" }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "#111")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
            >
              <td style={{ padding: "4px 12px", color: "#666" }}>{formatearFecha(ing.fecha)}</td>
              <td style={{ padding: "4px 12px", color: "#4ec9b0" }}>{formatearEuros(ing.importe)}</td>
              <td style={{ padding: "4px 12px", color: "#555" }}>{ing.categoria?.nombre ?? "—"}</td>
              <td style={{ padding: "4px 12px", color: "#444" }}>{ing.descripcion ?? "—"}</td>
              <td style={{ padding: "4px 12px" }}>
                <button
                  onClick={() => eliminar.mutate(ing.id)}
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
            <DialogTitle style={{ color: "#4ec9b0", fontSize: "0.75rem", letterSpacing: "0.1em" }}>
              NUEVO INGRESO
            </DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit((d) => crear.mutate(d))} className="space-y-3">
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
                <FormItem>
                  <FormLabel>descripción</FormLabel>
                  <FormControl><Input {...field} /></FormControl>
                </FormItem>
              )} />
              <div className="flex justify-end gap-2 pt-1">
                <Button type="button" variant="outline" onClick={() => setAbierto(false)}
                  style={{ background: "none", border: "1px solid #2a2a2a", color: "#555" }}>
                  cancelar
                </Button>
                <Button type="submit" disabled={crear.isPending}
                  style={{ background: "#0d2420", color: "#4ec9b0", border: "1px solid #1a4035" }}>
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
