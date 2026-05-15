import { normalizarImporte } from "@/lib/utils"
import { z } from "zod"

export const esquemaImporte = z
  .string()
  .min(1, "obligatorio")
  .refine((v) => Number(normalizarImporte(v)) > 0, "debe ser > 0")
