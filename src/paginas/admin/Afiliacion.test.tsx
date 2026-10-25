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
  consultarAfiliacion: vi.fn(),
  guardarAfiliacion: vi.fn(),
}))

const admin = {
  id: '1',
  nombreCompleto: 'Rosa Méndez',
  correo: 'rosa@uagrm.edu.bo',
  rolPlataforma: null,
  organizacionActiva: 'org-a',
  membresias: [],
}
const reglas: api.Afiliacion = {
  dominios: ['uagrm.edu.bo'],
  modoAprobacion: 'manual',
}

function abrir() {
  render(
    <MemoryRouter initialEntries={['/organizacion/afiliacion']}>
      <App />
    </MemoryRouter>,
  )
}
const agregar = async (dominio: string) => {
  fireEvent.change(await screen.findByLabelText('Nuevo dominio'), {
    target: { value: dominio },
  })
  fireEvent.click(screen.getByRole('button', { name: 'Agregar' }))
}
const guardar = () =>
  fireEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }))

describe('Afiliación (administrador de organización)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(api.consultarYo).mockResolvedValue(admin)
    vi.mocked(api.consultarAfiliacion).mockResolvedValue(reglas)
  })
  afterEach(cleanup)

  it('muestra los dominios y el modo de la organización activa', async () => {
    abrir()
    expect(await screen.findByText('uagrm.edu.bo')).toBeTruthy()
    expect(api.consultarAfiliacion).toHaveBeenCalledWith('org-a')
    expect(
      (screen.getByRole('radio', { name: /Manual/ }) as HTMLInputElement)
        .checked,
    ).toBe(true)
    expect(
      (
        screen.getByRole('button', {
          name: 'Guardar cambios',
        }) as HTMLButtonElement
      ).disabled,
    ).toBe(true)
  })

  it('CA-1: agrega un dominio normalizado y lo guarda junto al modo', async () => {
    vi.mocked(api.guardarAfiliacion).mockResolvedValue({
      dominios: ['est.uagrm.edu.bo', 'uagrm.edu.bo'],
      modoAprobacion: 'manual',
    })
    abrir()
    await agregar(' @EST.uagrm.edu.bo ')
    expect(screen.getByText('est.uagrm.edu.bo')).toBeTruthy()
    guardar()
    await waitFor(() =>
      expect(api.guardarAfiliacion).toHaveBeenCalledWith('org-a', {
        dominios: ['uagrm.edu.bo', 'est.uagrm.edu.bo'],
        modoAprobacion: 'manual',
      }),
    )
    expect(await screen.findByText('Cambios guardados.')).toBeTruthy()
  })

  it('un dominio repetido en la misma organización se ignora', async () => {
    abrir()
    await agregar('UAGRM.edu.bo')
    expect(screen.getAllByText('uagrm.edu.bo')).toHaveLength(1)
  })

  it('CA-2: un dominio de otra organización se rechaza sin decir de quién', async () => {
    vi.mocked(api.guardarAfiliacion).mockRejectedValue(
      new api.ErrorApi(409, 'DOMINIO_NO_DISPONIBLE'),
    )
    abrir()
    await agregar('ajeno.edu.bo')
    guardar()
    expect(
      await screen.findByText(
        'Uno de los dominios no está disponible. Prueba con otro.',
      ),
    ).toBeTruthy()
  })

  it('CA-3: un dominio público o con formato inválido no se agrega', async () => {
    abrir()
    await agregar('gmail.com')
    expect(
      await screen.findByText(
        'No se aceptan dominios de correo públicos ni con formato inválido.',
      ),
    ).toBeTruthy()
    expect(screen.queryByText('gmail.com')).toBeNull()
    await agregar('uagrm')
    expect(screen.queryByText('uagrm')).toBeNull()
    await agregar('')
    expect(
      await screen.findByText('Escribe un dominio, por ejemplo uagrm.edu.bo.'),
    ).toBeTruthy()
    expect(api.guardarAfiliacion).not.toHaveBeenCalled()
  })

  it('CA-3: si el servidor rechaza un dominio, lo marca en la lista', async () => {
    vi.mocked(api.guardarAfiliacion).mockRejectedValue(
      new api.ErrorApi(400, 'DOMINIO_INVALIDO', { dominio: 'uagrm.edu.bo' }),
    )
    abrir()
    await agregar('est.uagrm.edu.bo')
    guardar()
    expect(
      await screen.findByText(
        'No se aceptan dominios de correo públicos ni con formato inválido.',
      ),
    ).toBeTruthy()
    expect(screen.getByText('uagrm.edu.bo').closest('li')?.className).toMatch(
      /dominioInvalido/,
    )
  })

  it('CA-4 y CA-5: el modo elegido (manual o automática) se envía al guardar', async () => {
    vi.mocked(api.guardarAfiliacion).mockResolvedValue({
      ...reglas,
      modoAprobacion: 'automatica',
    })
    abrir()
    fireEvent.click(await screen.findByRole('radio', { name: /Automática/ }))
    guardar()
    await waitFor(() =>
      expect(api.guardarAfiliacion).toHaveBeenCalledWith('org-a', {
        dominios: ['uagrm.edu.bo'],
        modoAprobacion: 'automatica',
      }),
    )
    expect(
      (screen.getByRole('radio', { name: /Automática/ }) as HTMLInputElement)
        .checked,
    ).toBe(true)
  })

  it('CA-6: no se guarda sin dominios y la lista vacía lo explica', async () => {
    abrir()
    fireEvent.click(
      await screen.findByRole('button', { name: 'Quitar uagrm.edu.bo' }),
    )
    expect(screen.getByText(/Todavía no hay dominios/)).toBeTruthy()
    guardar()
    expect(
      await screen.findByText('Debe quedar al menos un dominio.'),
    ).toBeTruthy()
    expect(api.guardarAfiliacion).not.toHaveBeenCalled()
  })

  it('CA-6: si el servidor responde MINIMO_UN_DOMINIO muestra el mismo mensaje', async () => {
    vi.mocked(api.guardarAfiliacion).mockRejectedValue(
      new api.ErrorApi(400, 'MINIMO_UN_DOMINIO'),
    )
    abrir()
    await agregar('est.uagrm.edu.bo')
    guardar()
    expect(
      await screen.findByText('Debe quedar al menos un dominio.'),
    ).toBeTruthy()
  })

  it('sin conexión al guardar muestra el aviso y conserva lo escrito', async () => {
    vi.mocked(api.guardarAfiliacion).mockRejectedValue(
      new api.ErrorApi(0, 'SIN_CONEXION'),
    )
    abrir()
    await agregar('est.uagrm.edu.bo')
    guardar()
    expect(await screen.findByText(/No hay conexión/)).toBeTruthy()
    expect(screen.getByText('est.uagrm.edu.bo')).toBeTruthy()
  })

  it('si no carga muestra el error y permite reintentar', async () => {
    vi.mocked(api.consultarAfiliacion).mockRejectedValueOnce(
      new api.ErrorApi(500, 'ERROR'),
    )
    abrir()
    expect(
      await screen.findByText(/No pudimos cargar las reglas de afiliación/),
    ).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }))
    expect(await screen.findByText('uagrm.edu.bo')).toBeTruthy()
  })

  it('CA-7: quien no administra la organización (403) vuelve al inicio', async () => {
    vi.mocked(api.consultarAfiliacion).mockRejectedValue(
      new api.ErrorApi(403, 'NO_AUTORIZADO'),
    )
    abrir()
    expect(await screen.findByRole('heading', { name: /Hola/ })).toBeTruthy()
    expect(screen.queryByText('Dominios de correo')).toBeNull()
  })

  it('una cuenta sin organización activa o el super administrador no ven la pantalla', async () => {
    vi.mocked(api.consultarYo).mockResolvedValue({
      ...admin,
      organizacionActiva: null,
    })
    abrir()
    expect(await screen.findByRole('heading', { name: /Hola/ })).toBeTruthy()
    cleanup()
    vi.mocked(api.consultarYo).mockResolvedValue({
      ...admin,
      rolPlataforma: 'super_admin',
    })
    abrir()
    expect(await screen.findByRole('heading', { name: /Hola/ })).toBeTruthy()
    expect(api.consultarAfiliacion).not.toHaveBeenCalled()
  })

  it('el menú ofrece Afiliación al administrador de organización', async () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <App />
      </MemoryRouter>,
    )
    expect(await screen.findByRole('link', { name: 'Afiliación' })).toBeTruthy()
  })
})
