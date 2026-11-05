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
  iniciarSesion: vi.fn(),
  consultarYo: vi.fn(),
  cerrarSesion: vi.fn().mockResolvedValue(undefined),
}))

const usuario = {
  id: '1',
  nombreCompleto: 'Ana Pérez',
  correo: 'ana@uagrm.edu.bo',
  rolPlataforma: null,
  organizacionActiva: null,
  membresias: [],
}

function abrir() {
  render(
    <MemoryRouter initialEntries={['/iniciar-sesion']}>
      <App />
    </MemoryRouter>,
  )
  return screen.findByRole('heading', { name: 'Iniciar sesión' })
}

function escribir(correo: string, contrasena: string) {
  fireEvent.change(screen.getByLabelText('Correo'), {
    target: { value: correo },
  })
  fireEvent.change(screen.getByLabelText('Contraseña'), {
    target: { value: contrasena },
  })
  fireEvent.click(screen.getByRole('button', { name: 'Entrar' }))
}

describe('Pantalla Iniciar sesión', () => {
  beforeEach(() => vi.clearAllMocks())
  afterEach(cleanup)

  it('muestra los errores de cada campo y no llama a la API si faltan datos', async () => {
    await abrir()
    fireEvent.click(screen.getByRole('button', { name: 'Entrar' }))
    expect(await screen.findByText(/correo válido/)).toBeTruthy()
    expect(screen.getByText('Escribe tu contraseña.')).toBeTruthy()
    expect(api.iniciarSesion).not.toHaveBeenCalled()
  })

  it('el error de un campo se borra al corregirlo y la contraseña se puede mostrar', async () => {
    await abrir()
    fireEvent.click(screen.getByRole('button', { name: 'Entrar' }))
    expect(await screen.findByText('Escribe tu contraseña.')).toBeTruthy()
    const campo = screen.getByLabelText('Contraseña')
    fireEvent.change(campo, { target: { value: 'x' } })
    expect(screen.queryByText('Escribe tu contraseña.')).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Mostrar contraseña' }))
    expect(campo.getAttribute('type')).toBe('text')
    expect(
      screen.getByRole('button', { name: 'Ocultar contraseña' }),
    ).toBeTruthy()
  })

  it('CA-1: con credenciales correctas entra al panel', async () => {
    vi.mocked(api.iniciarSesion).mockResolvedValue()
    vi.mocked(api.consultarYo).mockResolvedValue(usuario)
    await abrir()
    escribir('ana@uagrm.edu.bo', 'Clave1234')
    expect(
      await screen.findByRole('heading', { name: 'Hola, Ana Pérez' }),
    ).toBeTruthy()
    expect(api.iniciarSesion).toHaveBeenCalledWith(
      'ana@uagrm.edu.bo',
      'Clave1234',
    )
  })

  it('CA-2: credenciales inválidas muestran un mensaje genérico, sin código técnico', async () => {
    vi.mocked(api.iniciarSesion).mockRejectedValue(
      new api.ErrorApi(401, 'CREDENCIALES_INVALIDAS'),
    )
    await abrir()
    escribir('ana@uagrm.edu.bo', 'mala')
    const alerta = await screen.findByRole('alert')
    expect(alerta.textContent).toContain('Correo o contraseña incorrectos')
    expect(alerta.textContent).not.toContain('CREDENCIALES_INVALIDAS')
  })

  it('CA-6: cuenta bloqueada indica cuándo reintentar', async () => {
    vi.mocked(api.iniciarSesion).mockRejectedValue(
      new api.ErrorApi(429, 'SESION_BLOQUEADA', {
        reintentarEn: new Date().toISOString(),
      }),
    )
    await abrir()
    escribir('ana@uagrm.edu.bo', 'mala')
    await waitFor(() =>
      expect(screen.getByRole('alert').textContent).toContain(
        'Demasiados intentos',
      ),
    )
  })

  it('sin conexión muestra un mensaje claro', async () => {
    vi.mocked(api.iniciarSesion).mockRejectedValue(
      new api.ErrorApi(0, 'SIN_CONEXION'),
    )
    await abrir()
    escribir('ana@uagrm.edu.bo', 'Clave1234')
    expect((await screen.findByRole('alert')).textContent).toContain(
      'No hay conexión',
    )
  })

  it('cerrar sesión vuelve a la pantalla de inicio de sesión', async () => {
    vi.mocked(api.iniciarSesion).mockResolvedValue()
    vi.mocked(api.consultarYo).mockResolvedValue(usuario)
    await abrir()
    escribir('ana@uagrm.edu.bo', 'Clave1234')
    fireEvent.click(
      await screen.findByRole('button', { name: 'Cerrar sesión' }),
    )
    expect(
      await screen.findByRole('heading', { name: 'Iniciar sesión' }),
    ).toBeTruthy()
  })
})
