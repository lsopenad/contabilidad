import { Route, Routes } from "react-router-dom"
import Layout from "@/components/layout/layout"
import PaginaDashboard from "@/pages/dashboard"
import PaginaIngresos from "@/pages/ingresos"
import PaginaGastos from "@/pages/gastos"
import PaginaSuscripciones from "@/pages/suscripciones"
import PaginaPresupuestos from "@/pages/presupuestos"
import PaginaInformes from "@/pages/informes"
import PaginaCategorias from "@/pages/categorias"
import PaginaImportar from "@/pages/importar"
import PaginaAdmin from "@/pages/admin"

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<PaginaDashboard />} />
        <Route path="ingresos" element={<PaginaIngresos />} />
        <Route path="gastos" element={<PaginaGastos />} />
        <Route path="suscripciones" element={<PaginaSuscripciones />} />
        <Route path="presupuestos" element={<PaginaPresupuestos />} />
        <Route path="informes" element={<PaginaInformes />} />
        <Route path="categorias" element={<PaginaCategorias />} />
        <Route path="importar" element={<PaginaImportar />} />
        <Route path="admin" element={<PaginaAdmin />} />
      </Route>
    </Routes>
  )
}
