import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import * as api from '../api/cliente'
import App from '../App'

vi.mock('../api/cliente', async (original) => ({
  ...(await original<typeof import('../api/cliente')>()),
  renovarSesion: vi.fn().mockResolvedValue(true),
  consultarYo: vi.fn(),
  listarOrganizaciones: vi.fn(),
  crearOrganizacion: vi.fn(),
  reenviarInvitacion: vi.fn(),
}))

const superAdmin = {
  id: '1',
  nombreCompleto: 'Super Admin',
  correo: 'admin@uniride.bo',
  rolPlataforma: 'super_admin',
  organizacionActiva: null,
  membresias: [],
}
const fila: api.Organizacion = {
  id: 'o1',
  nombre: 'UAGRM',
  tipo: 'universidad',
  estado: 'activa',
  precioMaximoUrc: 20,
  admin: { nombre: 'Ana Pérez', correo: 'ana@uagrm.edu.bo' },
  estadoInvitacion: 'no_enviada',
  creadoEn: '2026-10-21T10:00:00.000Z',
}

function abrir(ruta: string) {
  render(
    <MemoryRouter initialEntries={[ruta]}>
      <App />
    </MemoryRouter>,
  )
}

describe('Organizaciones (super administrador)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(api.consultarYo).mockResolvedValue(superAdmin)
    vi.mocked(api.listarOrganizaciones).mockResolvedValue([fila])
  })
  afterEach(cleanup)

  it('CA-8: el listado muestra los datos y el estado de la invitación', async () => {
    abrir('/organizaciones')
    expect(await screen.findByText('UAGRM')).toBeTruthy()
    expect(screen.getByText('Universidad')).toBeTruthy()
    expect(screen.getByText('20.00')).toBeTruthy()
    expect(screen.getByText('ana@uagrm.edu.bo')).toBeTruthy()
    expect(screen.getByText('No enviada')).toBeTruthy()
  })

  it('reenviar la invitación llama a la API y avisa', async () => {
    vi.mocked(api.reenviarInvitacion).mockResolvedValue()
    abrir('/organizaciones')
    fireEvent.click(
      await screen.findByRole('button', { name: 'Reenviar invitación' }),
    )
    await waitFor(() =>
      expect(api.reenviarInvitacion).toHaveBeenCalledWith('o1'),
    )
    expect(await screen.findByRole('status')).toBeTruthy()
  })

  it('un usuario que no es super administrador vuelve al inicio', async () => {
    vi.mocked(api.consultarYo).mockResolvedValue({
      ...superAdmin,
      rolPlataforma: null,
    })
    abrir('/organizaciones')
    expect(await screen.findByRole('heading', { name: /Hola/ })).toBeTruthy()
    expect(api.listarOrganizaciones).not.toHaveBeenCalled()
  })

  it('CA-3: el formulario marca los campos inválidos y no llama a la API', async () => {
    abrir('/organizaciones/nueva')
    fireEvent.click(
      await screen.findByRole('button', { name: 'Guardar organización' }),
    )
    expect(
      await screen.findByText('Escribe el nombre de la organización.'),
    ).toBeTruthy()
    expect(screen.getByText(/mayor que cero/)).toBeTruthy()
    expect(screen.getByText(/correo válido/)).toBeTruthy()
    expect(api.crearOrganizacion).not.toHaveBeenCalled()
  })

  it('CA-1: con datos válidos crea la organización y vuelve al listado', async () => {
    vi.mocked(api.crearOrganizacion).mockResolvedValue(fila)
    abrir('/organizaciones/nueva')
    const poner = (nombre: string, valor: string) =>
      fireEvent.change(screen.getByLabelText(nombre), {
        target: { value: valor },
      })
    await screen.findByLabelText('Nombre de la organización')
    poner('Nombre de la organización', ' UAGRM ')
    poner('Precio máximo por viaje (Bs)', '20')
    poner('Nombre del administrador', 'Ana Pérez')
    poner('Correo del administrador', 'ana@uagrm.edu.bo')
    fireEvent.click(
      screen.getByRole('button', { name: 'Guardar organización' }),
    )
    await waitFor(() =>
      expect(api.crearOrganizacion).toHaveBeenCalledWith({
        nombre: 'UAGRM',
        tipo: 'universidad',
        precioMaximoUrc: 20,
        adminNombre: 'Ana Pérez',
        adminCorreo: 'ana@uagrm.edu.bo',
      }),
    )
    expect(await screen.findByText('UAGRM')).toBeTruthy()
  })

  it('CA-2: un nombre duplicado se muestra en el campo, sin código técnico', async () => {
    vi.mocked(api.crearOrganizacion).mockRejectedValue(
      new api.ErrorApi(409, 'ORGANIZACION_NOMBRE_DUPLICADO'),
    )
    abrir('/organizaciones/nueva')
    await screen.findByLabelText('Nombre de la organización')
    const poner = (nombre: string, valor: string) =>
      fireEvent.change(screen.getByLabelText(nombre), {
        target: { value: valor },
      })
    poner('Nombre de la organización', 'uagrm')
    poner('Precio máximo por viaje (Bs)', '20')
    poner('Nombre del administrador', 'Ana')
    poner('Correo del administrador', 'ana@uagrm.edu.bo')
    fireEvent.click(
      screen.getByRole('button', { name: 'Guardar organización' }),
    )
    expect(
      await screen.findByText('Ya existe una organización con ese nombre.'),
    ).toBeTruthy()
  })
})
