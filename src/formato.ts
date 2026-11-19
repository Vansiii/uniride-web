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
const numero = new Intl.NumberFormat('es-BO', { maximumFractionDigits: 1 })
const fechaLarga = new Intl.DateTimeFormat('es-BO', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
})
const hora = new Intl.DateTimeFormat('es-BO', {
  hour: '2-digit',
  minute: '2-digit',
})
const relativo = new Intl.RelativeTimeFormat('es', { numeric: 'auto' })

/** `1.234,50 URC` (espacio no separable antes de la unidad). */
export const formatoMonto = (valor: number) => `${monto.format(valor)} URC`

export const formatoFecha = (iso: string) => fecha.format(new Date(iso))

/** `1.234,5`: cifras de los reportes, con un decimal como máximo. */
export const formatoNumero = (valor: number) => numero.format(valor)

/** `12 %` a partir de una fracción (0,12). */
export const formatoPorcentaje = (fraccion: number) =>
  `${numero.format(Math.round(fraccion * 1000) / 10)} %`

/** «miércoles, 18 de noviembre». */
export const formatoFechaLarga = (d: Date) => fechaLarga.format(d)

export const formatoHora = (d: Date) => hora.format(d)

/** «hace 3 días», «dentro de 2 horas», «ayer»: la unidad más grande que cabe. */
export function formatoRelativo(iso: string, ahora = Date.now()): string {
  const segundos = (new Date(iso).getTime() - ahora) / 1000
  const unidades: [Intl.RelativeTimeFormatUnit, number][] = [
    ['day', 86400],
    ['hour', 3600],
    ['minute', 60],
  ]
  for (const [unidad, tamano] of unidades)
    if (Math.abs(segundos) >= tamano)
      return relativo.format(Math.round(segundos / tamano), unidad)
  return relativo.format(0, 'minute')
}

/** Iniciales para el avatar: "Ana Pérez" → "AP". */
export const iniciales = (nombre: string) =>
  nombre
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('')

/** CSV con `;` (Excel en es-BO usa la coma decimal); comillas solo donde hacen falta. */
export const aCsv = (filas: (string | number)[][]) =>
  filas
    .map((fila) =>
      fila
        .map((celda) => {
          const texto = typeof celda === 'number' ? numero.format(celda) : celda
          return /[;"\n]/.test(texto)
            ? `"${texto.replaceAll('"', '""')}"`
            : texto
        })
        .join(';'),
    )
    .join('\r\n')

/** Descarga un reporte CSV generado en el navegador (no sale nada del equipo). */
export function descargarCsv(nombre: string, filas: (string | number)[][]) {
  // BOM para que Excel reconozca UTF-8 (tildes, CO₂).
  const blob = new Blob(['﻿', aCsv(filas)], {
    type: 'text/csv;charset=utf-8',
  })
  const url = URL.createObjectURL(blob)
  const enlace = document.createElement('a')
  enlace.href = url
  enlace.download = `${nombre}-${new Date().toISOString().slice(0, 10)}.csv`
  enlace.click()
  URL.revokeObjectURL(url)
}

/** Compara sin tildes ni mayúsculas: «jose» encuentra «José». */
export const contiene = (texto: string, busqueda: string) => {
  const normal = (s: string) =>
    s
      .normalize('NFD')
      .replace(/\p{Diacritic}/gu, '')
      .toLowerCase()
  return normal(texto).includes(normal(busqueda.trim()))
}
