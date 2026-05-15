import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

const formatadorEuros = new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" })
const formatadorFecha = new Intl.DateTimeFormat("es-ES")

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatearEuros(valor: number | string): string {
  return formatadorEuros.format(Number(valor))
}

export function formatearFecha(fecha: string): string {
  return formatadorFecha.format(new Date(fecha + "T00:00:00"))
}

export function normalizarImporte(v: string): string {
  return v.replace(",", ".")
}

export function fechaHoy(): string {
  return new Date().toISOString().slice(0, 10)
}

export const MESES_ABREV = ["ene","feb","mar","abr","may","jun","jul","ago","sep","oct","nov","dic"]
export const MESES_NOMBRE = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"]
