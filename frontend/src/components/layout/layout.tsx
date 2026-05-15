import { cn } from "@/lib/utils"
import { MesProvider } from "@/lib/mes-context"
import { NavLink, Outlet } from "react-router-dom"
import { Toaster } from "sonner"

const navegacion = [
  { ruta: "/",              etiqueta: "dashboard" },
  { ruta: "/ingresos",      etiqueta: "ingresos" },
  { ruta: "/gastos",        etiqueta: "gastos" },
  { ruta: "/suscripciones", etiqueta: "suscripciones" },
  { ruta: "/presupuestos",  etiqueta: "presupuestos" },
  { ruta: "/informes",      etiqueta: "informes" },
  { ruta: "/categorias",    etiqueta: "categorias" },
]

export default function Layout() {
  return (
    <MesProvider>
      <div className="flex h-screen" style={{ background: "#001E2B" }}>
        <aside className="w-48 flex flex-col" style={{ borderRight: "1px solid #0F3244" }}>
          <div className="p-4" style={{ borderBottom: "1px solid #0F3244" }}>
            <span style={{ color: "#00ED64", fontSize: "0.77rem", letterSpacing: "0.1em" }}>
              CONTABILIDAD
            </span>
          </div>

          <nav className="flex-1 p-2 space-y-px">
            {navegacion.map(({ ruta, etiqueta }) => (
              <NavLink
                key={ruta}
                to={ruta}
                end={ruta === "/"}
                className={({ isActive }) =>
                  cn(
                    "flex items-center px-3 py-1.5 text-xs transition-colors",
                    isActive ? "text-[#00ED64]" : "text-[#3D6676] hover:text-[#5C8097]",
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    <span className="mr-2 w-3 inline-block" style={{ color: "#00ED64" }}>
                      {isActive ? ">" : " "}
                    </span>
                    {etiqueta}
                  </>
                )}
              </NavLink>
            ))}
          </nav>

          <div className="p-3" style={{ borderTop: "1px solid #0F3244" }}>
            <span style={{ color: "#1A3F54", fontSize: "0.70rem" }}>v2.0.0</span>
          </div>
        </aside>

        <main className="flex-1 overflow-auto">
          <Outlet />
        </main>
      </div>
      <Toaster
        position="bottom-right"
        theme="dark"
        toastOptions={{
          style: {
            background: "#012030",
            border: "1px solid #0F3244",
            color: "#C8DEE8",
            fontFamily: "inherit",
            fontSize: "0.80rem",
            borderRadius: "1px",
          },
        }}
      />
    </MesProvider>
  )
}
