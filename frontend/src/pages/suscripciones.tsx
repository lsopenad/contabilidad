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
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["suscripciones"] }); setAbierto(false) },
  })

  const toggleActiva = useMutation({
    mutationFn: ({ id, activa }: { id: number; activa: boolean }) =>
      api.patch(`/suscripciones/${id}`, { activa }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["suscripciones"] }),
  })

  const eliminar = useMutation({
    mutationFn: (id: number) => api.delete(`/suscripciones/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["suscripciones"] }),
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
      <div className="flex items-center justify-between mb-4" style={{ borderBottom: "1px solid #1e1e1e", paddingBottom: "0.75rem" }}>
        <div>
          <div style={{ color: "#ce9178", fontSize: "0.70rem", letterSpacing: "0.12em" }}>SUSCRIPCIONES</div>
          <div style={{ color: "#333", fontSize: "0.70rem" }}>recurrentes mensuales</div>
        </div>
        <div className="flex items-center gap-4">
          <span style={{ color: "#ce9178", fontSize: "1.00rem", fontWeight: 600 }}>
            {formatearEuros(totalActivas)}<span style={{ color: "#333", fontSize: "0.70rem" }}>/mes</span>
          </span>
          <Button
            onClick={() => { form.reset(); setAbierto(true) }}
            style={{ background: "#38260e", color: "#ce9178", border: "1px solid #4a3010" }}
          >
            + nueva
          </Button>
        </div>
      </div>

      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr style={{ borderBottom: "1px solid #1a1a1a" }}>
            <ThSort label="nombre"    campo="nombre"    actual={campo} dir={dir} onClick={ordenarPor} color="#ce9178" />
            <ThSort label="importe"   campo="importe"   actual={campo} dir={dir} onClick={ordenarPor} color="#ce9178" />
            <ThSort label="día cobro" campo="dia_cobro" actual={campo} dir={dir} onClick={ordenarPor} color="#ce9178" />
            <ThSort label="categoría" campo="categoria" actual={campo} dir={dir} onClick={ordenarPor} color="#ce9178" />
            <ThSort label="notas"     campo="notas"     actual={campo} dir={dir} onClick={ordenarPor} color="#ce9178" />
            <ThSort label="estado"    campo="estado"    actual={campo} dir={dir} onClick={ordenarPor} color="#ce9178" />
            <th style={{ padding: "4px 12px" }} />
          </tr>
        </thead>
        <tbody>
          {ordenados.length === 0 && (
            <tr><td colSpan={7} style={{ padding: "2rem 12px", color: "#2a2a2a", textAlign: "center" }}>
              — sin suscripciones —
            </td></tr>
          )}
          {ordenados.map((s) => (
            <tr
              key={s.id}
              style={{ borderBottom: "1px solid #141414", opacity: s.activa ? 1 : 0.4 }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "#111")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
            >
              <td style={{ padding: "4px 12px", color: "#aaa" }}>{s.nombre}</td>
              <td style={{ padding: "4px 12px", color: "#ce9178" }}>{formatearEuros(s.importe)}</td>
              <td style={{ padding: "4px 12px", color: "#555" }}>{s.dia_cobro ? `día ${s.dia_cobro}` : "—"}</td>
              <td style={{ padding: "4px 12px", color: "#555" }}>{s.categoria?.nombre ?? "—"}</td>
              <td style={{ padding: "4px 12px", color: "#444", maxWidth: "10rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {s.notas ?? "—"}
              </td>
              <td style={{ padding: "4px 12px" }}>
                <button
                  onClick={() => toggleActiva.mutate({ id: s.id, activa: !s.activa })}
                  style={{ color: s.activa ? "#4ec9b0" : "#333", background: "none", border: "none", cursor: "pointer", fontSize: "0.80rem" }}
                >
                  {s.activa ? "[activa]" : "[inactiva]"}
                </button>
              </td>
              <td style={{ padding: "4px 12px" }}>
                <button
                  onClick={() => eliminar.mutate(s.id)}
                  style={{ color: "#333", background: "none", border: "none", cursor: "pointer", fontSize: "0.80rem" }}
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
            <DialogTitle style={{ color: "#ce9178", fontSize: "0.80rem", letterSpacing: "0.1em" }}>
              NUEVA SUSCRIPCIÓN
            </DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit((d) => crear.mutate(d))} className="space-y-3">
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
                  style={{ background: "none", border: "1px solid #2a2a2a", color: "#555" }}>
                  cancelar
                </Button>
                <Button type="submit" disabled={crear.isPending}
                  style={{ background: "#38260e", color: "#ce9178", border: "1px solid #4a3010" }}>
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
