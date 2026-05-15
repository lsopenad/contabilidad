export const TIPOS_CATEGORIA = ["ingreso", "gasto", "ambos"] as const
export type TipoCategoria = typeof TIPOS_CATEGORIA[number]

export interface CategoriaResumen {
  id: number
  nombre: string
}

export interface Categoria extends CategoriaResumen {
  tipo: TipoCategoria
}

export interface Ingreso {
  id: number
  importe: string
  fecha: string
  descripcion?: string
  categoria?: CategoriaResumen
  repeticion_id?: string
}

export interface Gasto {
  id: number
  importe: string
  fecha: string
  descripcion?: string
  categoria?: CategoriaResumen
  repeticion_id?: string
}

export interface Suscripcion {
  id: number
  nombre: string
  importe: string
  activa: boolean
  dia_cobro?: number
  notas?: string
  categoria?: CategoriaResumen
}

export interface Presupuesto {
  id: number
  importe: string
  mes: number
  anio: number
  categoria_id: number
  categoria: CategoriaResumen
  repeticion_id?: string
}

export interface ResumenMes {
  mes: number
  anio: number
  total_ingresos: string
  total_gastos: string
}

export interface InformeAnual {
  anio: number
  meses: ResumenMes[]
  total_ingresos: string
  total_gastos: string
  balance: string
}

export interface GastoCategoria {
  categoria_id: number
  categoria_nombre: string
  total: string
}

export interface GrupoPresupuesto {
  id: number
  nombre: string
  importe: string
  mes: number
  anio: number
  categorias: CategoriaResumen[]
  total_gastado: string
  repeticion_id?: string
}

export interface Movimiento {
  id: number
  importe: string
  fecha: string
  descripcion?: string
  categoria?: { nombre: string }
  tipo: "ingreso" | "gasto"
}
