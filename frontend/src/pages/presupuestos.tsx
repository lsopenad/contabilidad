import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { api } from "@/lib/api"
import { formatearEuros } from "@/lib/utils"
import { zodResolver } from "@hookform/resolvers/zod"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useState } from "react"
import { useForm } from "react-hook-form"
import { z } from "zod"

const esquema = z.object({
  categoria_id: z.string().min(1, "obligatorio"),
  importe: z.string().min(1).refine((v) => Number(v) > 0, "debe ser > 0"),
  mes: z.string().min(1),
  anio: z.string().min(1),
})

type Campos = z.infer<typeof esquema>
interface Categoria { id: number; nombre: string }
interface Presupuesto { id: number; importe: string; mes: number; anio: number; categoria: Categoria }

const MESES = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"]

export default function PaginaPresupuestos() {
  const qc = useQueryClient()
  const [abierto, setAbierto] = useState(false)
  const mesActual = new Date().getMonth() + 1
  const anioActual = new Date().getFullYear()

  const { data: presupuestos = [] } = useQuery<Presupuesto[]>({
    queryKey: ["presupuestos", mesActual, anioActual],
    queryFn: async () => (await api.get(`/presupuestos/?mes=${mesActual}&anio=${anioActual}`)).data,
  })
  const { data: categorias = [] } = useQuery<Categoria[]>({
    queryKey: ["categorias", "gasto"],
    queryFn: async () => (await api.get("/categorias/?tipo=gasto")).data,
  })

  const guardar = useMutation({
    mutationFn: (d: Campos) => api.put("/presupuestos/", {
      categoria_id: Number(d.categoria_id), importe: d.importe,
      mes: Number(d.mes), anio: Number(d.anio),
    }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["presupuestos"] }); setAbierto(false) },
  })

  const eliminar = useMutation({
    mutationFn: (id: number) => api.delete(`/presupuestos/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["presupuestos"] }),
  })

  const form = useForm<Campos>({
    resolver: zodResolver(esquema),
    defaultValues: { mes: String(mesActual), anio: String(anioActual) },
  })

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4" style={{ borderBottom: "1px solid #1e1e1e", paddingBottom: "0.75rem" }}>
        <div>
          <div style={{ color: "#aaa", fontSize: "0.65rem", letterSpacing: "0.12em" }}>PRESUPUESTOS</div>
          <div style={{ color: "#333", fontSize: "0.65rem" }}>{MESES[mesActual - 1].toLowerCase()} {anioActual}</div>
        </div>
        <Button
          onClick={() => { form.reset({ mes: String(mesActual), anio: String(anioActual) }); setAbierto(true) }}
          style={{ background: "#0d2420", color: "#4ec9b0", border: "1px solid #1a4035" }}
        >
          + nuevo
        </Button>
      </div>

      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr style={{ borderBottom: "1px solid #1a1a1a" }}>
            {["categoría", "presupuesto", ""].map((h) => (
              <th key={h} style={{ textAlign: "left", padding: "4px 12px", color: "#333" }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {presupuestos.length === 0 && (
            <tr><td colSpan={3} style={{ padding: "2rem 12px", color: "#2a2a2a", textAlign: "center" }}>
              — sin presupuestos —
            </td></tr>
          )}
          {presupuestos.map((p) => (
            <tr
              key={p.id}
              style={{ borderBottom: "1px solid #141414" }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "#111")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
            >
              <td style={{ padding: "4px 12px", color: "#aaa" }}>{p.categoria.nombre}</td>
              <td style={{ padding: "4px 12px", color: "#4ec9b0" }}>{formatearEuros(p.importe)}</td>
              <td style={{ padding: "4px 12px" }}>
                <button
                  onClick={() => eliminar.mutate(p.id)}
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
            <DialogTitle style={{ color: "#aaa", fontSize: "0.75rem", letterSpacing: "0.1em" }}>
              NUEVO PRESUPUESTO
            </DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit((d) => guardar.mutate(d))} className="space-y-3">
              <FormField control={form.control} name="categoria_id" render={({ field }) => (
                <FormItem><FormLabel>categoría</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl><SelectTrigger><SelectValue placeholder="— seleccionar —" /></SelectTrigger></FormControl>
                    <SelectContent>
                      {categorias.map((c) => <SelectItem key={c.id} value={String(c.id)}>{c.nombre}</SelectItem>)}
                    </SelectContent>
                  </Select>
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
                        {MESES.map((m, i) => <SelectItem key={i + 1} value={String(i + 1)}>{m.toLowerCase()}</SelectItem>)}
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
                  style={{ background: "none", border: "1px solid #2a2a2a", color: "#555" }}>
                  cancelar
                </Button>
                <Button type="submit" disabled={guardar.isPending}
                  style={{ background: "#0d2420", color: "#4ec9b0", border: "1px solid #1a4035" }}>
                  {guardar.isPending ? "..." : "guardar"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
