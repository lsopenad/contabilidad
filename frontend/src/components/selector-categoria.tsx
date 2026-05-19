import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectSeparator, SelectTrigger, SelectValue } from "@/components/ui/select"
import { api } from "@/lib/api"
import { type CategoriaResumen, type TipoCategoria } from "@/lib/tipos"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"

const NUEVA = "__nueva__"

interface Props {
  value?: string
  onChange: (value: string) => void
  tipo: TipoCategoria
}

export function SelectorCategoria({ value, onChange, tipo }: Props) {
  const qc = useQueryClient()
  const [dialogoAbierto, setDialogoAbierto] = useState(false)
  const [nombreNueva, setNombreNueva] = useState("")

  const { data: categorias = [] } = useQuery<CategoriaResumen[]>({
    queryKey: ["categorias", tipo],
    queryFn: async () => (await api.get(`/categorias/?tipo=${tipo}`)).data,
  })

  const crear = useMutation({
    mutationFn: (nombre: string) => api.post("/categorias/", { nombre, tipo }),
    onSuccess: async (res) => {
      await qc.invalidateQueries({ queryKey: ["categorias"] })
      onChange(String(res.data.id))
      setDialogoAbierto(false)
      setNombreNueva("")
      toast.success("categoría creada")
    },
    onError: () => toast.error("error al crear categoría"),
  })

  const handleChange = (val: string) => {
    if (val === NUEVA) {
      setDialogoAbierto(true)
    } else {
      onChange(val)
    }
  }

  return (
    <>
      <Select onValueChange={handleChange} value={value}>
        <SelectTrigger><SelectValue placeholder="— sin categoría —" /></SelectTrigger>
        <SelectContent className="max-h-60 overflow-y-auto">
          {categorias.map((c) => (
            <SelectItem key={c.id} value={String(c.id)}>{c.nombre}</SelectItem>
          ))}
          <SelectSeparator />
          <SelectItem value={NUEVA} style={{ color: "#7DD3FC" }}>＋ nueva categoría</SelectItem>
        </SelectContent>
      </Select>

      <Dialog open={dialogoAbierto} onOpenChange={(v) => { setDialogoAbierto(v); if (!v) setNombreNueva("") }}>
        <DialogContent style={{ background: "#012030", border: "1px solid #1A3F54" }}>
          <DialogHeader>
            <DialogTitle style={{ color: "#A5B4FC", fontSize: "0.80rem", letterSpacing: "0.1em" }}>
              NUEVA CATEGORÍA
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Input
              placeholder="nombre de la categoría"
              value={nombreNueva}
              onChange={(e) => setNombreNueva(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && nombreNueva.trim()) crear.mutate(nombreNueva.trim())
              }}
              autoFocus
            />
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setDialogoAbierto(false)}
                style={{ background: "none", border: "1px solid #1A3F54", color: "#6B95A7" }}>
                cancelar
              </Button>
              <Button
                type="button"
                disabled={!nombreNueva.trim() || crear.isPending}
                onClick={() => crear.mutate(nombreNueva.trim())}
                style={{ background: "#011829", color: "#5C8097", border: "1px solid #2A5A6E" }}
              >
                {crear.isPending ? "..." : "crear"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
