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
  renovarSesion: vi.fn().mockResolvedValue(false),
  consultarInvitacion: vi.fn(),
  aceptarInvitacion: vi.fn(),
  consultarYo: vi.fn(),
}))

const info: api.InvitacionPublica = {
  organizacion: 'UAGRM',
  correo: 'ana@uagrm.edu.bo',
  nombre: 'Ana Pérez',
  cuentaExistente: false,
}
const usuario = {
  id: '1',
  nombreCompleto: 'Ana Pérez',
  correo: 'ana@uagrm.edu.bo',
  rolPlataforma: null,
  organizacionActiva: 'o1',
  membresias: [],
}

function abrir() {
  render(
    <MemoryRouter initialEntries={['/invitaciones/token-123']}>
      <App />
    </MemoryRouter>,
  )
}

describe('Aceptar invitación', () => {
  beforeEach(() => vi.clearAllMocks())
  afterEach(cleanup)

  it('CA-4: cuenta nueva, acepta con nombre y contraseña y entra al panel', async () => {
    vi.mocked(api.consultarInvitacion).mockResolvedValue(info)
    vi.mocked(api.aceptarInvitacion).mockResolvedValue()
    vi.mocked(api.consultarYo).mockResolvedValue(usuario)
    abrir()
    expect(await screen.findByText(/administrar UAGRM/)).toBeTruthy()
    fireEvent.change(screen.getByLabelText('Contraseña'), {
      target: { value: 'Clave1234' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Aceptar invitación' }))
    await waitFor(() =>
      expect(api.aceptarInvitacion).toHaveBeenCalledWith(
        'token-123',
        'Clave1234',
        'Ana Pérez',
      ),
    )
    expect(
      await screen.findByRole('heading', { name: 'Hola, Ana Pérez' }),
    ).toBeTruthy()
  })

  it('RN-7: con cuenta existente solo pide la contraseña', async () => {
    vi.mocked(api.consultarInvitacion).mockResolvedValue({
      ...info,
      cuentaExistente: true,
    })
    abrir()
    await screen.findByText(/Ya tienes una cuenta/)
    expect(screen.queryByLabelText('Tu nombre completo')).toBeNull()
  })

  it('CA-5: una invitación vencida muestra el motivo y no el formulario', async () => {
    vi.mocked(api.consultarInvitacion).mockRejectedValue(
      new api.ErrorApi(410, 'INVITACION_VENCIDA'),
    )
    abrir()
    const alerta = await screen.findByRole('alert')
    expect(alerta.textContent).toContain('venció o ya fue usada')
    expect(alerta.textContent).not.toContain('INVITACION_VENCIDA')
    expect(
      screen.queryByRole('button', { name: 'Aceptar invitación' }),
    ).toBeNull()
  })

  it('una contraseña débil se informa sin código técnico', async () => {
    vi.mocked(api.consultarInvitacion).mockResolvedValue(info)
    vi.mocked(api.aceptarInvitacion).mockRejectedValue(
      new api.ErrorApi(400, 'CONTRASENA_DEBIL'),
    )
    abrir()
    await screen.findByText(/administrar UAGRM/)
    fireEvent.change(screen.getByLabelText('Contraseña'), {
      target: { value: 'corta' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Aceptar invitación' }))
    expect((await screen.findByRole('alert')).textContent).toContain(
      'al menos 8 caracteres',
    )
  })
})
