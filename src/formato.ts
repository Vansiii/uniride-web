// Formatos de DESIGN_SYSTEM.md §4.9. Nunca se formatea a mano en una pantalla.
const monto = new Intl.NumberFormat('es-BO', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})
const fecha = new Intl.DateTimeFormat('es-BO', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
})

/** `1.234,50 URC` (espacio no separable antes de la unidad). */
export const formatoMonto = (valor: number) => `${monto.format(valor)} URC`

export const formatoFecha = (iso: string) => fecha.format(new Date(iso))

/** Iniciales para el avatar: "Ana Pérez" → "AP". */
export const iniciales = (nombre: string) =>
  nombre
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('')
