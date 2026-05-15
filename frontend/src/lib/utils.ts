import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatearEuros(valor: number | string): string {
  return new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency: "EUR",
  }).format(Number(valor))
}

export function formatearFecha(fecha: string): string {
  return new Intl.DateTimeFormat("es-ES").format(new Date(fecha + "T00:00:00"))
}
