import {
  act,
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
  recuperarContrasena: vi.fn(),
  restablecerContrasena: vi.fn(),
}))

const pasado = () => new Date(Date.now() - 1000).toISOString()
const futuro = (ms: number) => new Date(Date.now() + ms).toISOString()

function abrir(ruta = '/recuperar-contrasena') {
  render(
    <MemoryRouter initialEntries={[ruta]}>
      <App />
    </MemoryRouter>,
  )
}

async function pedirCodigo(correo = 'ana@uagrm.edu.bo') {
  abrir()
  fireEvent.change(await screen.findByLabelText('Correo'), {
    target: { value: correo },
  })
  fireEvent.click(screen.getByRole('button', { name: 'Enviar código' }))
  await screen.findByLabelText('Código de 6 dígitos')
}

function llenar(codigo: string, contrasena: string) {
  fireEvent.change(screen.getByLabelText('Código de 6 dígitos'), {
    target: { value: codigo },
  })
  fireEvent.change(screen.getByLabelText('Contraseña nueva'), {
    target: { value: contrasena },
  })
  fireEvent.click(screen.getByRole('button', { name: 'Cambiar contraseña' }))
}

describe('Pantalla Recuperar contraseña', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(api.recuperarContrasena).mockResolvedValue({
      reenviarEn: futuro(60_000),
    })
  })
  afterEach(() => {
    cleanup()
    vi.useRealTimers()
  })

  it('el inicio de sesión ofrece "Olvidé mi contraseña" y lleva a la recuperación', async () => {
    abrir('/iniciar-sesion')
    fireEvent.click(
      await screen.findByRole('link', { name: 'Olvidé mi contraseña' }),
    )
    expect(
      await screen.findByRole('heading', { name: 'Recuperar contraseña' }),
    ).toBeTruthy()
  })

  it('un correo mal escrito se rechaza sin llamar a la API', async () => {
    abrir()
    fireEvent.click(
      await screen.findByRole('button', { name: 'Enviar código' }),
    )
    expect(await screen.findByText(/correo válido/)).toBeTruthy()
    expect(api.recuperarContrasena).not.toHaveBeenCalled()
  })

  it('CA-1: pide el código con el correo recortado y pasa a escribirlo', async () => {
    await pedirCodigo('  ana@uagrm.edu.bo ')
    expect(api.recuperarContrasena).toHaveBeenCalledWith('ana@uagrm.edu.bo')
    expect(screen.getByLabelText('Contraseña nueva')).toBeTruthy()
  })

  it('CA-2: el aviso es el mismo haya o no cuenta y no la menciona', async () => {
    await pedirCodigo('nadie@uagrm.edu.bo')
    expect((await screen.findByRole('status')).textContent).toBe(
      'Si nadie@uagrm.edu.bo tiene una cuenta, te llegará un código.',
    )
  })

  it('CA-2: el límite de reenvío es el mismo mensaje y deja pasar a escribir el código', async () => {
    vi.mocked(api.recuperarContrasena).mockRejectedValue(
      new api.ErrorApi(429, 'OTP_LIMITE_REENVIO', {
        reenviarEn: futuro(30_000),
      }),
    )
    abrir()
    fireEvent.change(await screen.findByLabelText('Correo'), {
      target: { value: 'ana@uagrm.edu.bo' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Enviar código' }))
    expect((await screen.findByRole('alert')).textContent).toContain(
      'Ya te enviamos un código',
    )
    fireEvent.click(screen.getByRole('button', { name: 'Ya tengo un código' }))
    expect(await screen.findByLabelText('Código de 6 dígitos')).toBeTruthy()
  })

  it('CA-3: con código y contraseña correctos cambia y vuelve a iniciar sesión avisando', async () => {
    vi.mocked(api.restablecerContrasena).mockResolvedValue()
    await pedirCodigo()
    llenar('123456', 'Nueva1234')
    expect(
      await screen.findByRole('heading', { name: 'Iniciar sesión' }),
    ).toBeTruthy()
    expect(api.restablecerContrasena).toHaveBeenCalledWith(
      'ana@uagrm.edu.bo',
      '123456',
      'Nueva1234',
    )
    expect(screen.getByRole('status').textContent).toContain(
      'cerramos tus sesiones abiertas',
    )
  })

  it('el código solo admite dígitos (hasta 6)', async () => {
    await pedirCodigo()
    const campo = screen.getByLabelText(
      'Código de 6 dígitos',
    ) as HTMLInputElement
    fireEvent.change(campo, { target: { value: '12a-34' } })
    expect(campo.value).toBe('1234')
    expect(campo.maxLength).toBe(6)
    expect(campo.autocomplete).toBe('one-time-code')
  })

  it('un código incompleto no llama a la API', async () => {
    await pedirCodigo()
    llenar('123', 'Nueva1234')
    expect(
      await screen.findByText('Escribe los 6 dígitos del código.'),
    ).toBeTruthy()
    expect(api.restablecerContrasena).not.toHaveBeenCalled()
  })

  it('CA-4: el bloqueo indica a qué hora se puede reintentar', async () => {
    vi.mocked(api.restablecerContrasena).mockRejectedValue(
      new api.ErrorApi(429, 'OTP_BLOQUEADO', {
        reintentarEn: new Date().toISOString(),
      }),
    )
    await pedirCodigo()
    llenar('123456', 'Nueva1234')
    const alerta = await screen.findByRole('alert')
    expect(alerta.textContent).toContain('Demasiados intentos')
    expect(alerta.textContent).not.toContain('OTP_BLOQUEADO')
    expect(alerta.textContent).not.toContain('{hora}')
    expect(alerta.textContent).not.toMatch(/\.\.$/)
  })

  it('CA-5: un código vencido lo dice y ofrece pedir otro', async () => {
    vi.mocked(api.recuperarContrasena)
      .mockResolvedValueOnce({ reenviarEn: pasado() })
      .mockResolvedValueOnce({ reenviarEn: futuro(60_000) })
    vi.mocked(api.restablecerContrasena).mockRejectedValue(
      new api.ErrorApi(410, 'OTP_VENCIDO'),
    )
    await pedirCodigo()
    llenar('123456', 'Nueva1234')
    expect(
      await screen.findByText('El código venció. Pide uno nuevo.'),
    ).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Reenviar código' }))
    expect((await screen.findByRole('status')).textContent).toContain(
      'un código nuevo',
    )
    expect(api.recuperarContrasena).toHaveBeenCalledTimes(2)
  })

  it('CA-5: un código usado o incorrecto muestra el error en el campo', async () => {
    vi.mocked(api.restablecerContrasena).mockRejectedValue(
      new api.ErrorApi(400, 'OTP_INVALIDO'),
    )
    await pedirCodigo()
    llenar('123456', 'Nueva1234')
    const campo = await screen.findByLabelText('Código de 6 dígitos')
    await waitFor(() => expect(campo.getAttribute('aria-invalid')).toBe('true'))
    expect(screen.getByText('El código no es correcto.')).toBeTruthy()
  })

  it('CA-6: una contraseña que no cumple se rechaza antes de llamar a la API', async () => {
    await pedirCodigo()
    llenar('123456', 'sololetras')
    expect(
      await screen.findByText(/al menos 8 caracteres, con letras y números/),
    ).toBeTruthy()
    expect(api.restablecerContrasena).not.toHaveBeenCalled()
  })

  it('CA-6: si el servidor la rechaza, el requisito sale en el campo', async () => {
    vi.mocked(api.restablecerContrasena).mockRejectedValue(
      new api.ErrorApi(400, 'CONTRASENA_DEBIL'),
    )
    await pedirCodigo()
    llenar('123456', 'Nueva1234')
    expect(
      await screen.findByText(/al menos 8 caracteres, con letras y números/),
    ).toBeTruthy()
  })

  it('sin conexión muestra un mensaje claro y conserva lo escrito', async () => {
    vi.mocked(api.restablecerContrasena).mockRejectedValue(
      new api.ErrorApi(0, 'SIN_CONEXION'),
    )
    await pedirCodigo()
    llenar('123456', 'Nueva1234')
    expect((await screen.findByRole('alert')).textContent).toContain(
      'No hay conexión',
    )
    expect(
      (screen.getByLabelText('Código de 6 dígitos') as HTMLInputElement).value,
    ).toBe('123456')
  })

  it('el reenvío espera la cuenta atrás y luego se habilita', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    vi.mocked(api.recuperarContrasena).mockResolvedValue({
      reenviarEn: futuro(3000),
    })
    await pedirCodigo()
    const boton = screen.getByRole('button', {
      name: /Reenviar código en \d s/,
    })
    expect((boton as HTMLButtonElement).disabled).toBe(true)
    await act(async () => {
      await vi.advanceTimersByTimeAsync(4000)
    })
    expect(
      (
        screen.getByRole('button', {
          name: 'Reenviar código',
        }) as HTMLButtonElement
      ).disabled,
    ).toBe(false)
  })

  it('"Usar otro correo" vuelve al primer paso', async () => {
    await pedirCodigo()
    fireEvent.click(screen.getByRole('button', { name: 'Usar otro correo' }))
    expect(await screen.findByLabelText('Correo')).toBeTruthy()
  })

  it('con la sesión iniciada no se ofrece recuperar: va al inicio', async () => {
    vi.mocked(api.renovarSesion).mockResolvedValue(true)
    vi.mocked(api.consultarYo).mockResolvedValue({
      id: '1',
      nombreCompleto: 'Ana Pérez',
      correo: 'ana@uagrm.edu.bo',
      rolPlataforma: null,
      organizacionActiva: null,
      membresias: [],
    })
    abrir()
    expect(
      await screen.findByRole('heading', { name: 'Hola, Ana Pérez' }),
    ).toBeTruthy()
    vi.mocked(api.renovarSesion).mockResolvedValue(false)
  })
})
