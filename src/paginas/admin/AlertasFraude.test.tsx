import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import * as api from '../../api/cliente'
import App from '../../App'

vi.mock('../../api/cliente', async (original) => ({
  ...(await original<typeof import('../../api/cliente')>()),
  renovarSesion: vi.fn().mockResolvedValue(true),
  consultarYo: vi.fn(),
  listarAlertasFraude: vi.fn(),
  listarBloqueosVigentes: vi.fn(),
}))

const admin = {
  id: '1',
  nombreCompleto: 'Rosa Méndez',
  correo: 'rosa@uagrm.edu.bo',
  rolPlataforma: null,
  organizacionActiva: 'org-a',
  membresias: [
    {
      organizacionId: 'org-a',
      organizacion: 'UAGRM',
      rol: 'admin_organizacion' as const,
      estado: 'aprobada' as const,
    },
  ],
}
const miembro = {
  ...admin,
  membresias: [{ ...admin.membresias[0], rol: 'miembro' as const }],
}
const alerta = (n: number, extra: Partial<api.AlertaFraude> = {}) =>
  ({
    id: `a-${n}`,
    creadoEn: new Date(2026, 10, 17, 10, n).toISOString(),
    patron: 'viajes_repetidos',
    personas: [
      { nombre: 'Carlos Justiniano', rol: 'conductor' },
      { nombre: 'Ana Rojas', rol: 'pasajero' },
    ],
    cantidad: 3,
    bloqueoHasta: new Date(2026, 10, 24, 10, 0).toISOString(),
    ...extra,
  }) satisfies api.AlertaFraude

function abrir() {
  render(
    <MemoryRouter initialEntries={['/organizacion/alertas']}>
      <App />
    </MemoryRouter>,
  )
}

describe('Alertas de fraude (administrador de organización)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(api.consultarYo).mockResolvedValue(admin)
    vi.mocked(api.listarAlertasFraude).mockResolvedValue({
      alertas: [alerta(1)],
    })
    vi.mocked(api.listarBloqueosVigentes).mockResolvedValue({ bloqueos: [] })
  })
  afterEach(cleanup)

  it('CA-1: muestra la alerta con patrón, personas con rol, cifras y fin del bloqueo', async () => {
    abrir()
    expect(
      await screen.findByRole('cell', { name: 'Viajes repetidos' }),
    ).toBeTruthy()
    expect(
      screen.getByText(
        /Carlos Justiniano \(conductor\) · Ana Rojas \(pasajero\)/,
      ),
    ).toBeTruthy()
    expect(
      screen.getByText(/3 reservas · Bloqueo hasta 24\/11\/2026/),
    ).toBeTruthy()
  })

  it('CA-2: lista los bloqueos vigentes y, sin ellos, lo dice', async () => {
    vi.mocked(api.listarBloqueosVigentes).mockResolvedValue({
      bloqueos: [
        {
          tipo: 'cuenta',
          patron: 'verificaciones_fallidas',
          personas: [{ nombre: 'Luis Pérez', rol: 'pasajero' }],
          hasta: new Date(2026, 10, 20, 8, 0).toISOString(),
        },
      ],
    })
    abrir()
    expect(await screen.findByText('Luis Pérez (pasajero)')).toBeTruthy()
    expect(screen.getByText('Cuenta')).toBeTruthy()
    cleanup()
    vi.mocked(api.listarBloqueosVigentes).mockResolvedValue({ bloqueos: [] })
    abrir()
    expect(await screen.findByText('No hay bloqueos vigentes.')).toBeTruthy()
  })

  it('CA-3: sin alertas muestra «Sin alertas por ahora.»', async () => {
    vi.mocked(api.listarAlertasFraude).mockResolvedValue({ alertas: [] })
    abrir()
    expect(await screen.findByText('Sin alertas por ahora.')).toBeTruthy()
  })

  it('CA-4: «Cargar más» pide la página siguiente con el cursor y la agrega', async () => {
    vi.mocked(api.listarAlertasFraude)
      .mockResolvedValueOnce({ alertas: [alerta(1)], siguiente: 'cursor-1' })
      .mockResolvedValueOnce({
        alertas: [
          alerta(2, {
            patron: 'sin_desplazamiento',
            cantidad: undefined,
            distanciaM: 400,
          }),
        ],
      })
    abrir()
    fireEvent.click(await screen.findByRole('button', { name: 'Cargar más' }))
    expect(
      await screen.findByRole('cell', { name: 'Viaje sin desplazamiento' }),
    ).toBeTruthy()
    expect(screen.getByRole('cell', { name: 'Viajes repetidos' })).toBeTruthy()
    expect(api.listarAlertasFraude).toHaveBeenLastCalledWith(
      undefined,
      'cursor-1',
    )
    expect(screen.queryByRole('button', { name: 'Cargar más' })).toBeNull()
  })

  it('CA-5: filtrar por patrón vuelve a pedir solo ese patrón', async () => {
    abrir()
    await screen.findByRole('cell', { name: 'Viajes repetidos' })
    const sel = screen.getByDisplayValue('Todos')
    fireEvent.change(sel, { target: { value: 'sin_desplazamiento' } })
    await waitFor(() =>
      expect(api.listarAlertasFraude).toHaveBeenLastCalledWith(
        'sin_desplazamiento',
      ),
    )
  })

  it('CA-8: la pantalla es solo lectura, sin botones para levantar o editar', async () => {
    abrir()
    await screen.findByRole('cell', { name: 'Viajes repetidos' })
    expect(
      screen.queryByRole('button', {
        name: /levantar|quitar|eliminar|editar/i,
      }),
    ).toBeNull()
  })

  it('si la API falla muestra el error y «Reintentar» recarga', async () => {
    vi.mocked(api.listarAlertasFraude).mockRejectedValueOnce(new Error('x'))
    abrir()
    fireEvent.click(await screen.findByRole('button', { name: 'Reintentar' }))
    expect(
      await screen.findByRole('cell', { name: 'Viajes repetidos' }),
    ).toBeTruthy()
  })

  it('CA-7: un miembro común no ve la pantalla ni llama a la API', async () => {
    vi.mocked(api.consultarYo).mockResolvedValue(miembro)
    abrir()
    await waitFor(() =>
      expect(screen.queryByText('Alertas de fraude')).toBeNull(),
    )
    expect(api.listarAlertasFraude).not.toHaveBeenCalled()
  })
})
