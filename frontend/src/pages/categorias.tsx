import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { api } from "@/lib/api"
import { ThSort, useSorte } from "@/lib/tabla"
import { zodResolver } from "@hookform/resolvers/zod"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useState } from "react"
import { useForm } from "react-hook-form"
import { z } from "zod"

const TIPOS = ["ingreso", "gasto", "ambos"] as const
type Tipo = typeof TIPOS[number]

const colorTipo: Record<Tipo, string> = {
  ingreso: "#4ec9b0",
  gasto:   "#f48771",
  ambos:   "#888",
}

const esquema = z.object({
  nombre: z.string().min(1, "obligatorio"),
  tipo: z.enum(TIPOS),
})

type Campos = z.infer<typeof esquema>
interface Categoria { id: number; nombre: string; tipo: Tipo }

export default function PaginaCategorias() {
  const qc = useQueryClient()
  const [abierto, setAbierto] = useState(false)

  const { data: categorias = [] } = useQuery<Categoria[]>({
    queryKey: ["categorias"],
    queryFn: async () => (await api.get("/categorias/")).data,
  })

  const crear = useMutation({
    mutationFn: (d: Campos) => api.post("/categorias/", d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["categorias"] }); setAbierto(false) },
  })

  const eliminar = useMutation({
    mutationFn: (id: number) => api.delete(`/categorias/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["categorias"] }),
  })

  const form = useForm<Campos>({
    resolver: zodResolver(esquema),
    defaultValues: { nombre: "", tipo: "gasto" },
  })

  const { ordenados, campo, dir, ordenarPor } = useSorte(
    categorias, "nombre", "asc",
    (item, c) => c === "tipo" ? item.tipo : item.nombre,
  )

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4" style={{ borderBottom: "1px solid #1e1e1e", paddingBottom: "0.75rem" }}>
        <div style={{ color: "#c586c0", fontSize: "0.70rem", letterSpacing: "0.12em" }}>CATEGORÍAS</div>
        <Button
          onClick={() => { form.reset({ nombre: "", tipo: "gasto" }); setAbierto(true) }}
          style={{ background: "#1e0d1e", color: "#c586c0", border: "1px solid #3a1a3a" }}
        >
          + nueva
        </Button>
      </div>

      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr style={{ borderBottom: "1px solid #1a1a1a" }}>
            <ThSort label="nombre" campo="nombre" actual={campo} dir={dir} onClick={ordenarPor} color="#c586c0" />
            <ThSort label="tipo"   campo="tipo"   actual={campo} dir={dir} onClick={ordenarPor} color="#c586c0" />
            <th style={{ padding: "4px 12px" }} />
          </tr>
        </thead>
        <tbody>
          {ordenados.length === 0 && (
            <tr><td colSpan={3} style={{ padding: "2rem 12px", color: "#2a2a2a", textAlign: "center" }}>
              — sin categorías —
            </td></tr>
          )}
          {ordenados.map((c) => (
            <tr
              key={c.id}
              style={{ borderBottom: "1px solid #141414" }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "#111")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
            >
              <td style={{ padding: "4px 12px", color: "#aaa" }}>{c.nombre}</td>
              <td style={{ padding: "4px 12px" }}>
                <span style={{ color: colorTipo[c.tipo], fontSize: "0.70rem" }}>{c.tipo}</span>
              </td>
              <td style={{ padding: "4px 12px" }}>
                <button
                  onClick={() => eliminar.mutate(c.id)}
                  style={{ color: "#333", background: "none", border: "none", cursor: "pointer", fontSize: "0.75rem" }}
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
            <DialogTitle style={{ color: "#c586c0", fontSize: "0.80rem", letterSpacing: "0.1em" }}>
              NUEVA CATEGORÍA
            </DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit((d) => crear.mutate(d))} className="space-y-3">
              <FormField control={form.control} name="nombre" render={({ field }) => (
                <FormItem>
                  <FormLabel>nombre</FormLabel>
                  <FormControl><Input {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="tipo" render={({ field }) => (
                <FormItem>
                  <FormLabel>tipo</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {TIPOS.map((t) => (
                        <SelectItem key={t} value={t}>{t}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
              <div className="flex justify-end gap-2 pt-1">
                <Button type="button" variant="outline" onClick={() => setAbierto(false)}
                  style={{ background: "none", border: "1px solid #2a2a2a", color: "#555" }}>
                  cancelar
                </Button>
                <Button type="submit" disabled={crear.isPending}
                  style={{ background: "#1e0d1e", color: "#c586c0", border: "1px solid #3a1a3a" }}>
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
