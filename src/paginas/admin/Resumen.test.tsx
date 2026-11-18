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
  consultarResumen: vi.fn(),
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
const resumen = (extra: Partial<api.ResumenOrganizacion> = {}) => ({
  periodo: '30d' as const,
  viajesPagados: 12,
  miembrosActivos: 40,
  pasajeros: 25,
  co2Kg: 31.4,
  ...extra,
})

function abrir() {
  render(
    <MemoryRouter initialEntries={['/organizacion/resumen']}>
      <App />
    </MemoryRouter>,
  )
}

describe('Resumen de la organización (administrador)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(api.consultarYo).mockResolvedValue(admin)
    vi.mocked(api.consultarResumen).mockResolvedValue(resumen())
  })
  afterEach(cleanup)

  it('CA-1/CA-2: muestra las cuatro cifras y rotula el CO₂ como estimado', async () => {
    abrir()
    expect(await screen.findByText('Viajes pagados')).toBeTruthy()
    expect(screen.getByText('12')).toBeTruthy()
    expect(screen.getByText('40')).toBeTruthy()
    expect(screen.getByText('25')).toBeTruthy()
    expect(screen.getByText('31,4')).toBeTruthy()
    expect(screen.getByText('Estimado')).toBeTruthy()
    expect(api.consultarResumen).toHaveBeenCalledWith('30d')
  })

  it('CA-3: cambiar de período vuelve a pedir ese período', async () => {
    abrir()
    await screen.findByText('Viajes pagados')
    fireEvent.click(screen.getByRole('button', { name: '7 días' }))
    await waitFor(() =>
      expect(api.consultarResumen).toHaveBeenLastCalledWith('7d'),
    )
  })

  it('CA-6: sin viajes pagados muestra el estado vacío', async () => {
    vi.mocked(api.consultarResumen).mockResolvedValue(
      resumen({ viajesPagados: 0, pasajeros: 0, co2Kg: 0 }),
    )
    abrir()
    expect(await screen.findByText('Aún no hay viajes pagados.')).toBeTruthy()
  })

  it('si la API falla muestra el error y «Reintentar» recarga', async () => {
    vi.mocked(api.consultarResumen).mockRejectedValueOnce(new Error('x'))
    abrir()
    fireEvent.click(await screen.findByRole('button', { name: 'Reintentar' }))
    expect(await screen.findByText('Viajes pagados')).toBeTruthy()
  })

  it('CA-8: un miembro común no ve la pantalla ni llama a la API', async () => {
    vi.mocked(api.consultarYo).mockResolvedValue(miembro)
    abrir()
    await waitFor(() => expect(screen.queryByText('Resumen')).toBeNull())
    expect(api.consultarResumen).not.toHaveBeenCalled()
  })
})
