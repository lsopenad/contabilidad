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

export const FRECUENCIAS = ["mensual", "bimestral", "trimestral", "semestral", "anual"] as const
export type FrecuenciaSuscripcion = typeof FRECUENCIAS[number]
export const FACTOR_MENSUAL: Record<FrecuenciaSuscripcion, number> = {
  mensual: 1, bimestral: 2, trimestral: 3, semestral: 6, anual: 12,
}

export interface Suscripcion {
  id: number
  nombre: string
  importe: string
  activa: boolean
  dia_cobro?: number
  frecuencia: FrecuenciaSuscripcion
  fecha_inicio?: string
  fecha_fin?: string
  notas?: string
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
  total_suscripciones: string
}

export interface InformeAnual {
  anio: number
  meses: ResumenMes[]
  total_ingresos: string
  total_gastos: string
  total_suscripciones: string
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

export interface Proveedor {
  code: string
  name: string
  country_code: string
  logo_url?: string
}

export interface CuentaBanco {
  id: number
  connection_id: string
  provider_code: string
  provider_name: string
  status: string
  expires_at?: string
  creado_en?: string
}
