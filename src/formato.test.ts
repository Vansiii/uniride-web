import { describe, expect, it } from 'vitest'
import { aCsv, contiene, formatoPorcentaje, formatoRelativo } from './formato'

describe('formato', () => {
  it('aCsv separa con ; y escapa comillas, ; y saltos de línea', () => {
    expect(
      aCsv([
        ['Nombre', 'CO₂'],
        ['A "B"; C', 12.5],
      ]),
    ).toBe('Nombre;CO₂\r\n"A ""B""; C";12,5')
  })

  it('formatoRelativo usa la unidad más grande que cabe', () => {
    const ahora = new Date(2026, 10, 18, 12).getTime()
    expect(
      formatoRelativo(new Date(2026, 10, 15, 12).toISOString(), ahora),
    ).toBe('hace 3 días')
    expect(
      formatoRelativo(new Date(2026, 10, 18, 10).toISOString(), ahora),
    ).toBe('hace 2 horas')
  })

  it('contiene ignora tildes y mayúsculas', () => {
    expect(contiene('José Pérez', ' jose pe')).toBe(true)
    expect(contiene('Ana', 'luis')).toBe(false)
  })

  it('formatoPorcentaje redondea a un decimal', () => {
    expect(formatoPorcentaje(0.1234)).toBe('12,3 %')
  })
})
