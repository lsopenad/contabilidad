import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { api } from "@/lib/api"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useState } from "react"
import { toast } from "sonner"

const TEXTO_CONFIRMACION = "BORRAR"

interface Conteo {
  gastos: number
  ingresos: number
}

export default function PaginaAdmin() {
  const qc = useQueryClient()
  const [textoConfirmacion, setTextoConfirmacion] = useState("")

  const { data: conteo } = useQuery<Conteo>({
    queryKey: ["admin-conteo"],
    queryFn: () => api.get("/admin/conteo").then((r) => r.data),
  })

  const { mutate: borrarDatos, isPending } = useMutation({
    mutationFn: () => api.delete("/admin/datos"),
    onSuccess: () => {
      toast.success("Todos los gastos e ingresos han sido eliminados")
      setTextoConfirmacion("")
      qc.invalidateQueries()
    },
    onError: () => {
      toast.error("Error al borrar los datos")
    },
  })

  const confirmacionValida = textoConfirmacion === TEXTO_CONFIRMACION

  return (
    <div className="p-6 max-w-lg">
      <h1 className="text-sm font-medium mb-6" style={{ color: "#8ABDD0" }}>
        admin
      </h1>

      <div
        className="p-4 space-y-4"
        style={{ border: "1px solid #0F3244", background: "#00111A" }}
      >
        <div className="space-y-1">
          <p className="text-xs font-medium" style={{ color: "#C8DEE8" }}>
            borrar gastos e ingresos
          </p>
          <p className="text-xs" style={{ color: "#6198AE" }}>
            Elimina permanentemente todos los registros de gastos e ingresos.
            Las categorías, presupuestos y suscripciones no se modifican.
          </p>
        </div>

        {conteo && (
          <p className="text-xs" style={{ color: "#FF6B35" }}>
            Se borrarán {conteo.gastos} gasto{conteo.gastos !== 1 ? "s" : ""} e{" "}
            {conteo.ingresos} ingreso{conteo.ingresos !== 1 ? "s" : ""}
          </p>
        )}

        <div className="space-y-2">
          <p className="text-xs" style={{ color: "#6198AE" }}>
            Escribe <span style={{ color: "#C8DEE8" }}>BORRAR</span> para confirmar
          </p>
          <Input
            value={textoConfirmacion}
            onChange={(e) => setTextoConfirmacion(e.target.value)}
            placeholder="BORRAR"
            className="h-7 text-xs"
            style={{
              background: "#001E2B",
              border: "1px solid #0F3244",
              color: "#C8DEE8",
              borderRadius: "1px",
            }}
          />
        </div>

        <Button
          variant="destructive"
          size="sm"
          className="text-xs h-7 px-3"
          disabled={!confirmacionValida || isPending}
          onClick={() => borrarDatos()}
          style={{ borderRadius: "1px" }}
        >
          {isPending ? "borrando..." : "borrar todo"}
        </Button>
      </div>
    </div>
  )
}
