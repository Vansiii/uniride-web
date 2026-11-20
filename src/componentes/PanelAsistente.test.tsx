import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import * as api from '../api/cliente'
import { PanelAsistente } from './PanelAsistente'

vi.mock('../api/cliente', async (original) => ({
  ...(await original<typeof import('../api/cliente')>()),
  consultarAsistente: vi.fn(),
}))

describe('PanelAsistente', () => {
  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
  })
  it('renderiza el disparador discreto', () => {
    render(
      <MemoryRouter>
        <PanelAsistente />
      </MemoryRouter>,
    )

    expect(
      screen.getByRole('button', { name: /abrir asistente/i }),
    ).toBeTruthy()
    expect(screen.getByText('Asistente')).toBeTruthy()
  })

  it('abre el panel al presionar el disparador y muestra sugerencias', () => {
    render(
      <MemoryRouter>
        <PanelAsistente />
      </MemoryRouter>,
    )

    const disparador = screen.getByRole('button', { name: /abrir asistente/i })
    fireEvent.click(disparador)

    expect(screen.getByRole('dialog')).toBeTruthy()
    expect(screen.getByText('Asistente UniRide')).toBeTruthy()
    expect(screen.getByText('¿Cómo funciona el pago?')).toBeTruthy()
  })

  it('muestra la respuesta con pasos y botón de acción al consultar', async () => {
    vi.mocked(api.consultarAsistente).mockResolvedValueOnce({
      modo: 'guia',
      mensaje: 'El pasaje queda protegido en garantía al reservar.',
      pasos: [
        'Reservas tu asiento con saldo en garantía',
        'Escaneas el QR al subir',
        'Se libera el pago al bajar',
      ],
      accion: {
        ruta: '/billetera',
        etiquetaBoton: 'Ver Billetera',
      },
    })

    render(
      <MemoryRouter>
        <PanelAsistente />
      </MemoryRouter>,
    )

    fireEvent.click(screen.getByRole('button', { name: /abrir asistente/i }))

    const campo = screen.getByLabelText(/escribe tu duda/i)
    fireEvent.change(campo, { target: { value: 'como funciona el pago?' } })

    const botonEnviar = screen.getByRole('button', { name: 'Consultar' })
    fireEvent.click(botonEnviar)

    expect(
      await screen.findByText(
        'El pasaje queda protegido en garantía al reservar.',
      ),
    ).toBeTruthy()
    expect(
      screen.getByText('Reservas tu asiento con saldo en garantía'),
    ).toBeTruthy()
    expect(screen.getByRole('button', { name: /ver billetera/i })).toBeTruthy()
  })

  it('se cierra al presionar el botón de cerrar', () => {
    render(
      <MemoryRouter>
        <PanelAsistente />
      </MemoryRouter>,
    )

    fireEvent.click(screen.getByRole('button', { name: /abrir asistente/i }))
    expect(screen.getByRole('dialog')).toBeTruthy()

    const botonCerrar = screen.getByRole('button', { name: /cerrar panel/i })
    fireEvent.click(botonCerrar)

    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('avisa el límite de consultas y permite volver a empezar', async () => {
    vi.mocked(api.consultarAsistente)
      .mockRejectedValueOnce(new api.ErrorApi(429, 'LIMITE_ALCANZADO'))
      .mockResolvedValueOnce({ modo: 'guia', mensaje: 'Respuesta lista.' })

    render(
      <MemoryRouter>
        <PanelAsistente />
      </MemoryRouter>,
    )
    fireEvent.click(screen.getByRole('button', { name: /abrir asistente/i }))
    fireEvent.click(screen.getByText('¿Cómo funciona el pago?'))
    expect(await screen.findByRole('alert')).toBeTruthy()
    expect(screen.getByText(/muchas consultas seguidas/i)).toBeTruthy()

    fireEvent.click(screen.getByText('¿Cómo vinculo mi celular?'))
    expect(await screen.findByText('Respuesta lista.')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Nueva consulta' }))
    expect(screen.getByText('¿Cómo funciona el pago?')).toBeTruthy()
  })
})
