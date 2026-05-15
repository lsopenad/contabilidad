import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useDialogoCrud } from "@/lib/crud"
import { api } from "@/lib/api"
import { ThSort, useSorte } from "@/lib/tabla"
import { TIPOS_CATEGORIA, type Categoria, type TipoCategoria } from "@/lib/tipos"
import { zodResolver } from "@hookform/resolvers/zod"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useForm } from "react-hook-form"
import { toast } from "sonner"
import { z } from "zod"

const colorTipo: Record<TipoCategoria, string> = {
  ingreso: "#00ED64",
  gasto:   "#FF6B35",
  ambos:   "#5C8097",
}

const esquema = z.object({
  nombre: z.string().min(1, "obligatorio"),
  tipo: z.enum(TIPOS_CATEGORIA),
})

type Campos = z.infer<typeof esquema>

export default function PaginaCategorias() {
  const qc = useQueryClient()
  const { abierto, setAbierto, editando, setEditando, confirmandoId, setConfirmandoId } = useDialogoCrud<Categoria>()

  const { data: categorias = [] } = useQuery<Categoria[]>({
    queryKey: ["categorias"],
    queryFn: async () => (await api.get("/categorias/")).data,
  })

  const crear = useMutation({
    mutationFn: (d: Campos) => api.post("/categorias/", d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["categorias"] }); setAbierto(false); toast.success("categoría creada") },
  })

  const eliminar = useMutation({
    mutationFn: (id: number) => api.delete(`/categorias/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["categorias"] }); toast.success("categoría eliminada") },
  })

  const editar = useMutation({
    mutationFn: ({ id, d }: { id: number; d: Campos }) => api.patch(`/categorias/${id}`, { nombre: d.nombre, tipo: d.tipo }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["categorias"] }); setAbierto(false); setEditando(null); toast.success("categoría actualizada") },
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
      <div className="flex items-center justify-between mb-4" style={{ borderBottom: "1px solid #0F3244", paddingBottom: "0.75rem" }}>
        <div style={{ color: "#A5B4FC", fontSize: "0.70rem", letterSpacing: "0.12em" }}>CATEGORÍAS</div>
        <Button
          onClick={() => { setEditando(null); form.reset({ nombre: "", tipo: "gasto" }); setAbierto(true) }}
          style={{ background: "#011829", color: "#5C8097", border: "1px solid #2A5A6E" }}
        >
          + nueva
        </Button>
      </div>

      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr style={{ borderBottom: "1px solid #112B3A" }}>
            <ThSort label="nombre" campo="nombre" actual={campo} dir={dir} onClick={ordenarPor} color="#5C8097" />
            <ThSort label="tipo"   campo="tipo"   actual={campo} dir={dir} onClick={ordenarPor} color="#5C8097" />
            <th style={{ padding: "4px 12px" }} />
          </tr>
        </thead>
        <tbody>
          {ordenados.length === 0 && (
            <tr><td colSpan={3} style={{ padding: "2rem 12px", color: "#1A3F54", textAlign: "center" }}>
              — sin categorías —
            </td></tr>
          )}
          {ordenados.map((c) => (
            <tr
              key={c.id}
              style={{ borderBottom: "1px solid #0A2233" }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "#012030")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
            >
              <td style={{ padding: "4px 12px", color: "#9BB7C4" }}>{c.nombre}</td>
              <td style={{ padding: "4px 12px" }}>
                <span style={{ color: colorTipo[c.tipo], fontSize: "0.70rem" }}>{c.tipo}</span>
              </td>
              <td style={{ padding: "4px 12px", whiteSpace: "nowrap" }}>
                <button
                  onClick={() => {
                    setEditando(c)
                    form.reset({ nombre: c.nombre, tipo: c.tipo })
                    setAbierto(true)
                  }}
                  style={{ color: "#1F4A5E", background: "none", border: "none", cursor: "pointer", fontSize: "0.75rem", marginRight: "0.5rem" }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = "#5C8097")}
                  onMouseLeave={(e) => (e.currentTarget.style.color = "#1F4A5E")}
                >
                  [e]
                </button>
                {confirmandoId === c.id ? (
                  <>
                    <button
                      onClick={() => { eliminar.mutate(c.id); setConfirmandoId(null) }}
                      style={{ color: "#FF6B35", background: "none", border: "none", cursor: "pointer", fontSize: "0.75rem", marginRight: "0.25rem" }}
                    >
                      [¿borrar?]
                    </button>
                    <button
                      onClick={() => setConfirmandoId(null)}
                      style={{ color: "#1F4A5E", background: "none", border: "none", cursor: "pointer", fontSize: "0.75rem" }}
                    >
                      [no]
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => setConfirmandoId(c.id)}
                    style={{ color: "#1F4A5E", background: "none", border: "none", cursor: "pointer", fontSize: "0.75rem" }}
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
            <DialogTitle style={{ color: "#5C8097", fontSize: "0.80rem", letterSpacing: "0.1em" }}>
              {editando ? "EDITAR CATEGORÍA" : "NUEVA CATEGORÍA"}
            </DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit((d) =>
              editando ? editar.mutate({ id: editando.id, d }) : crear.mutate(d)
            )} className="space-y-3">
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
                      {TIPOS_CATEGORIA.map((t) => (
                        <SelectItem key={t} value={t}>{t}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
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
