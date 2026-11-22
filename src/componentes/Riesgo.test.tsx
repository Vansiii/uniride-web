import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { nivelDe, textoCifra } from './nivelRiesgo'
import {
  BarraPercentil,
  CurvaRoc,
  GrafoAnilloVista,
  Histograma,
  Medidor,
} from './Riesgo'

afterEach(cleanup)

describe('PB-11 · componentes de riesgo', () => {
  it('nivelDe: bajo < 40, medio 40–69, alto ≥ 70', () => {
    expect(nivelDe(39)).toBe('bajo')
    expect(nivelDe(40)).toBe('medio')
    expect(nivelDe(69)).toBe('medio')
    expect(nivelDe(70)).toBe('alto')
  })

  it('textoCifra: conteos y fracciones', () => {
    expect(textoCifra('viajes7d', 8)).toBe('8 viajes en 7 días')
    expect(textoCifra('fraccionPasajero', 0.9)).toMatch(/90\s?%/)
  })

  it('Medidor: anuncia el puntaje y el nivel con texto, no solo color', () => {
    render(<Medidor puntaje={55} />)
    expect(
      screen.getByRole('img', { name: 'Puntaje de riesgo 55 de 100: Medio' }),
    ).toBeTruthy()
    expect(screen.getByText('Riesgo medio')).toBeTruthy()
  })

  it('Medidor: limita el puntaje a 0–100', () => {
    render(<Medidor puntaje={140} tamano="mini" />)
    expect(screen.getByText('100')).toBeTruthy()
  })

  it('BarraPercentil: compara hacia arriba o hacia abajo según el percentil', () => {
    render(
      <ul>
        <BarraPercentil
          factor={{ cifra: 'viajes7d', valor: 8, percentil: 99 }}
        />
        <BarraPercentil
          factor={{ cifra: 'distanciaPromedioM', valor: 300, percentil: 2 }}
        />
      </ul>,
    )
    expect(
      screen.getAllByText(
        'Más alto que el 99 % de los pares de tu organización',
      ),
    ).toHaveLength(1)
    expect(
      screen.getByRole('img', {
        name: 'Más bajo que el 98 % de los pares de tu organización',
      }),
    ).toBeTruthy()
  })

  it('Histograma: resume en su nombre y muestra el tramo al pasar el puntero', () => {
    const { container } = render(
      <Histograma tramos={[10, 5, 0, 0, 0, 0, 0, 0, 2, 1]} umbral={80} />,
    )
    expect(
      screen.getByRole('img', {
        name: '18 pares analizados; 3 sobre el umbral de alerta',
      }),
    ).toBeTruthy()
    const objetivos = container.querySelectorAll('rect[class*="objetivo"]')
    fireEvent.mouseEnter(objetivos[8])
    expect(screen.getByText('Puntaje 80–89')).toBeTruthy()
    expect(screen.getByText('2 pares')).toBeTruthy()
  })

  it('CurvaRoc: describe el punto de operación', () => {
    render(
      <CurvaRoc
        puntos={[
          { x: 0, y: 0 },
          { x: 0.1, y: 0.9 },
          { x: 1, y: 1 },
        ]}
        operacion={{ x: 0, y: 0.67 }}
      />,
    )
    expect(
      screen.getByRole('img', { name: /Curva ROC del modelo/ }),
    ).toBeTruthy()
    expect(screen.getByText('Azar')).toBeTruthy()
  })

  it('GrafoAnilloVista: lista a las personas y los viajes del grupo', () => {
    render(
      <GrafoAnilloVista
        grafo={{
          nodos: ['Ana Rojas', 'Beto Paz', 'Ceci Vaca'],
          aristas: [
            { a: 0, b: 1, viajes: 4 },
            { a: 1, b: 2, viajes: 2 },
            { a: 2, b: 0, viajes: 3 },
          ],
          viajesInternos: 9,
          proporcion: 0.95,
        }}
      />,
    )
    expect(
      screen.getByRole('img', {
        name: 'Anillo de 3 personas con 9 viajes entre ellas',
      }),
    ).toBeTruthy()
    // En la leyenda y en el título del nodo (tooltip nativo).
    expect(screen.getAllByText('Beto Paz')).toHaveLength(2)
    expect(screen.getByText(/9 viajes entre ellas/)).toBeTruthy()
  })
})
