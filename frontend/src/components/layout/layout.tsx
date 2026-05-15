import { cn } from "@/lib/utils"
import { NavLink, Outlet } from "react-router-dom"

const navegacion = [
  { ruta: "/",              etiqueta: "dashboard" },
  { ruta: "/ingresos",      etiqueta: "ingresos" },
  { ruta: "/gastos",        etiqueta: "gastos" },
  { ruta: "/suscripciones", etiqueta: "suscripciones" },
  { ruta: "/presupuestos",  etiqueta: "presupuestos" },
  { ruta: "/informes",      etiqueta: "informes" },
]

export default function Layout() {
  return (
    <div className="flex h-screen" style={{ background: "#0c0c0c" }}>
      <aside className="w-48 flex flex-col" style={{ borderRight: "1px solid #1e1e1e" }}>
        <div className="p-4" style={{ borderBottom: "1px solid #1e1e1e" }}>
          <span style={{ color: "#4ec9b0", fontSize: "0.72rem", letterSpacing: "0.1em" }}>
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
                  isActive
                    ? "text-[#4ec9b0]"
                    : "text-[#555] hover:text-[#888]",
                )
              }
            >
              {({ isActive }) => (
                <>
                  <span className="mr-2 w-3 inline-block" style={{ color: "#4ec9b0" }}>
                    {isActive ? ">" : " "}
                  </span>
                  {etiqueta}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="p-3" style={{ borderTop: "1px solid #1e1e1e" }}>
          <span style={{ color: "#2a2a2a", fontSize: "0.6rem" }}>
            v2.0.0
          </span>
        </div>
      </aside>

      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  )
}
