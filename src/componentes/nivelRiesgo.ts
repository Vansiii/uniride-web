import type { CifraPar } from '../api/cliente'
import { formatoNumero, formatoPorcentaje } from '../formato'
import { t } from '../i18n'

/** PB-11: nivel de riesgo del puntaje 0–100 (bajo < 40, medio 40–69, alto ≥ 70). */
export type NivelRiesgo = 'bajo' | 'medio' | 'alto'
export const nivelDe = (puntaje: number): NivelRiesgo => {
  if (puntaje >= 70) return 'alto'
  return puntaje >= 40 ? 'medio' : 'bajo'
}

/** Texto de una cifra del par: «8 viajes en 7 días», «300 m de distancia promedio», «45 %»… */
export function textoCifra(cifra: CifraPar, valor: number): string {
  const porcentaje = cifra.startsWith('fraccion')
  return t(`fraude.factores.${cifra}`).replace(
    '{n}',
    porcentaje ? formatoPorcentaje(valor) : formatoNumero(valor),
  )
}
