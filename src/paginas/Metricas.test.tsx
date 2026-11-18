import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import * as api from '../api/cliente'
import App from '../App'

vi.mock('../api/cliente', async (original) => ({
  ...(await original<typeof import('../api/cliente')>()),
  renovarSesion: vi.fn().mockResolvedValue(true),
  consultarYo: vi.fn(),
  consultarMetricas: vi.fn(),
}))

const superAdmin = {
  id: '1',
  nombreCompleto: 'Vansi',
  correo: 'super@uniride.bo',
  rolPlataforma: 'super_admin' as const,
  organizacionActiva: null,
  membresias: [],
}
const admin = {
  ...superAdmin,
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
const fila = (
  nombre: string,
  viajesPagados: number,
  miembrosActivos = 5,
  co2Kg = 1,
) => ({
  organizacionId: nombre,
  nombre,
  viajesPagados,
  miembrosActivos,
  co2Kg,
  sinActividad: viajesPagados === 0,
})
const metricas = (
  extra: Partial<api.MetricasPlataforma> = {},
): api.MetricasPlataforma => ({
  periodo: '30d',
  global: {
    organizacionesActivas: 3,
    miembrosActivos: 15,
    viajesPagados: 7,
    pasajeros: 9,
    co2Kg: 12.5,
    fallidasOExpiradas: 2,
  },
  porOrganizacion: [
    fila('UAGRM', 5, 5, 8),
    fila('Empresa X', 2),
    fila('Vacía', 0),
  ],
  ...extra,
})

function abrir() {
  render(
    <MemoryRouter initialEntries={['/plataforma/metricas']}>
      <App />
    </MemoryRouter>,
  )
}
const nombres = () =>
  screen
    .getAllByRole('rowheader')
    .map((c) => c.textContent?.replace('Sin actividad', ''))

describe('Métricas globales (super administrador)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(api.consultarYo).mockResolvedValue(superAdmin)
    vi.mocked(api.consultarMetricas).mockResolvedValue(metricas())
  })
  afterEach(cleanup)

  it('CA-1/CA-2/CA-5: cifras globales, fila por organización y marca «Sin actividad»', async () => {
    abrir()
    expect(await screen.findByText('Organizaciones activas')).toBeTruthy()
    expect(screen.getByText('12,5')).toBeTruthy()
    expect(screen.getByText('Reservas fallidas o expiradas')).toBeTruthy()
    expect(nombres()).toEqual(['Empresa X', 'UAGRM', 'Vacía'])
    expect(screen.getByText('Sin actividad')).toBeTruthy()
    expect(api.consultarMetricas).toHaveBeenCalledWith('30d')
  })

  it('CA-2: la tabla se ordena por columna y se invierte con un segundo clic', async () => {
    abrir()
    await screen.findByText('Organizaciones activas')
    const tabla = screen.getByRole('table')
    fireEvent.click(
      within(tabla).getByRole('button', { name: 'Viajes pagados' }),
    )
    expect(nombres()).toEqual(['Vacía', 'Empresa X', 'UAGRM'])
    fireEvent.click(
      within(tabla).getByRole('button', { name: 'Viajes pagados' }),
    )
    expect(nombres()).toEqual(['UAGRM', 'Empresa X', 'Vacía'])
  })

  it('CA-4: cambiar de período vuelve a pedir ese período', async () => {
    abrir()
    await screen.findByText('Organizaciones activas')
    fireEvent.click(screen.getByRole('button', { name: '7 días' }))
    await waitFor(() =>
      expect(api.consultarMetricas).toHaveBeenLastCalledWith('7d'),
    )
  })

  it('CA-9: sin actividad muestra ceros y el texto de vacío', async () => {
    vi.mocked(api.consultarMetricas).mockResolvedValue(
      metricas({
        global: {
          organizacionesActivas: 0,
          miembrosActivos: 0,
          viajesPagados: 0,
          pasajeros: 0,
          co2Kg: 0,
          fallidasOExpiradas: 0,
        },
        porOrganizacion: [],
      }),
    )
    abrir()
    expect(
      await screen.findByText('Aún no hay actividad en la plataforma.'),
    ).toBeTruthy()
  })

  it('si la API falla muestra el error y «Reintentar» recarga', async () => {
    vi.mocked(api.consultarMetricas).mockRejectedValueOnce(new Error('x'))
    abrir()
    fireEvent.click(await screen.findByRole('button', { name: 'Reintentar' }))
    expect(await screen.findByText('Organizaciones activas')).toBeTruthy()
  })

  it('CA-6: un administrador de organización no ve la pantalla ni llama a la API', async () => {
    vi.mocked(api.consultarYo).mockResolvedValue(admin)
    abrir()
    await waitFor(() =>
      expect(screen.queryByText('Métricas de la plataforma')).toBeNull(),
    )
    expect(api.consultarMetricas).not.toHaveBeenCalled()
  })
})
