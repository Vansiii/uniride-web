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
import * as api from '../../api/cliente'
import App from '../../App'

vi.mock('../../api/cliente', async (original) => ({
  ...(await original<typeof import('../../api/cliente')>()),
  renovarSesion: vi.fn().mockResolvedValue(true),
  consultarYo: vi.fn(),
  listarSolicitudes: vi.fn(),
  decidirSolicitud: vi.fn(),
}))

const membresiaAdmin = {
  organizacionId: 'org-a',
  organizacion: 'UAGRM',
  rol: 'admin_organizacion' as const,
  estado: 'aprobada' as const,
}
const admin = {
  id: '1',
  nombreCompleto: 'Rosa Méndez',
  correo: 'rosa@uagrm.edu.bo',
  rolPlataforma: null,
  organizacionActiva: 'org-a',
  membresias: [membresiaAdmin],
}
const carlos: api.Solicitud = {
  id: 'm-1',
  nombreCompleto: 'Carlos Justiniano',
  correoInstitucional: 'cjustiniano@uagrm.edu.bo',
  creadoEn: new Date(2026, 9, 15, 18, 40).toISOString(),
}
const ana: api.Solicitud = {
  id: 'm-2',
  nombreCompleto: 'Ana Rojas Suárez',
  correoInstitucional: 'ana.rojas@uagrm.edu.bo',
  creadoEn: new Date(2026, 9, 17, 7, 22).toISOString(),
}

function abrir() {
  render(
    <MemoryRouter initialEntries={['/organizacion/solicitudes']}>
      <App />
    </MemoryRouter>,
  )
}
const aprobar = async (nombre: string) =>
  fireEvent.click(
    await screen.findByRole('button', {
      name: `Aprobar la solicitud de ${nombre}`,
    }),
  )
const rechazar = async (nombre: string) =>
  fireEvent.click(
    await screen.findByRole('button', {
      name: `Rechazar la solicitud de ${nombre}`,
    }),
  )

describe('Solicitudes (administrador de organización)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(api.consultarYo).mockResolvedValue(admin)
    vi.mocked(api.listarSolicitudes).mockResolvedValue([carlos, ana])
  })
  afterEach(cleanup)

  it('CA-1: lista nombre, correo y fecha, en el orden que manda el servidor', async () => {
    abrir()
    expect(await screen.findByText('Carlos Justiniano')).toBeTruthy()
    expect(api.listarSolicitudes).toHaveBeenCalledWith('org-a')
    const filas = screen.getAllByRole('row').slice(1)
    expect(filas).toHaveLength(2)
    expect(within(filas[0]).getByText('Carlos Justiniano')).toBeTruthy()
    expect(within(filas[0]).getByText('cjustiniano@uagrm.edu.bo')).toBeTruthy()
    expect(within(filas[0]).getByText('15/10/2026 · 18:40')).toBeTruthy()
    expect(within(filas[1]).getByText('Ana Rojas Suárez')).toBeTruthy()
    expect(within(filas[1]).getByText('17/10/2026 · 07:22')).toBeTruthy()
    expect(screen.getByText('2 pendientes')).toBeTruthy()
  })

  it('un nombre con símbolos de reemplazo se muestra tal cual en los textos', async () => {
    vi.mocked(api.listarSolicitudes).mockResolvedValue([
      { ...carlos, nombreCompleto: 'Zoe $& Díaz' },
    ])
    abrir()
    await rechazar('Zoe $& Díaz')
    expect(
      await screen.findByText('¿Rechazar la solicitud de Zoe $& Díaz?'),
    ).toBeTruthy()
  })

  it('con una sola solicitud la leyenda va en singular', async () => {
    vi.mocked(api.listarSolicitudes).mockResolvedValue([carlos])
    abrir()
    expect(await screen.findByText('1 pendiente')).toBeTruthy()
  })

  it('lista vacía: avisa que no hay pendientes', async () => {
    vi.mocked(api.listarSolicitudes).mockResolvedValue([])
    abrir()
    expect(
      await screen.findByText('No hay solicitudes pendientes.'),
    ).toBeTruthy()
    expect(screen.queryByRole('table')).toBeNull()
  })

  it('muestra el estado de carga mientras llega la lista', async () => {
    vi.mocked(api.listarSolicitudes).mockReturnValue(new Promise(() => {}))
    abrir()
    expect(await screen.findByText('Cargando…')).toBeTruthy()
  })

  it('si no carga muestra el error y permite reintentar', async () => {
    vi.mocked(api.listarSolicitudes).mockRejectedValueOnce(
      new api.ErrorApi(500, 'ERROR'),
    )
    abrir()
    expect(
      await screen.findByText(/No pudimos cargar las solicitudes/),
    ).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }))
    expect(await screen.findByText('Carlos Justiniano')).toBeTruthy()
  })

  it('CA-2: aprobar es directo (sin diálogo), saca la fila y avisa del correo', async () => {
    vi.mocked(api.decidirSolicitud).mockResolvedValue({
      id: 'm-1',
      estado: 'aprobada',
    })
    abrir()
    await aprobar('Carlos Justiniano')
    expect(api.decidirSolicitud).toHaveBeenCalledWith('m-1', {
      decision: 'aprobar',
      motivo: undefined,
    })
    expect(
      await screen.findByText(
        'Solicitud de Carlos Justiniano aprobada. Le avisamos por correo.',
      ),
    ).toBeTruthy()
    expect(screen.queryByRole('dialog')).toBeNull()
    await waitFor(() =>
      expect(screen.queryByText('cjustiniano@uagrm.edu.bo')).toBeNull(),
    )
    expect(screen.getByText('Ana Rojas Suárez')).toBeTruthy()
    expect(screen.getByText('1 pendiente')).toBeTruthy()
  })

  it('CA-3: rechazar pide confirmación con la consecuencia y un motivo opcional', async () => {
    vi.mocked(api.decidirSolicitud).mockResolvedValue({
      id: 'm-1',
      estado: 'rechazada',
    })
    abrir()
    await rechazar('Carlos Justiniano')
    const dialogo = await screen.findByRole('dialog')
    expect(
      within(dialogo).getByText('¿Rechazar la solicitud de Carlos Justiniano?'),
    ).toBeTruthy()
    expect(
      within(dialogo).getByText(
        'No podrá volver a solicitar ingreso a UAGRM. Le avisaremos por correo.',
      ),
    ).toBeTruthy()
    expect(api.decidirSolicitud).not.toHaveBeenCalled()
    fireEvent.change(within(dialogo).getByLabelText('Motivo (opcional)'), {
      target: { value: '  El correo pertenece a un exalumno.  ' },
    })
    fireEvent.click(
      within(dialogo).getByRole('button', { name: 'Rechazar solicitud' }),
    )
    await waitFor(() =>
      expect(api.decidirSolicitud).toHaveBeenCalledWith('m-1', {
        decision: 'rechazar',
        motivo: 'El correo pertenece a un exalumno.',
      }),
    )
    expect(
      await screen.findByText(
        'Solicitud de Carlos Justiniano rechazada. Le avisamos por correo.',
      ),
    ).toBeTruthy()
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(screen.queryByText('cjustiniano@uagrm.edu.bo')).toBeNull()
  })

  it('CA-3: el motivo se puede dejar vacío y «Volver» no decide nada', async () => {
    vi.mocked(api.decidirSolicitud).mockResolvedValue({
      id: 'm-2',
      estado: 'rechazada',
    })
    abrir()
    await rechazar('Ana Rojas Suárez')
    fireEvent.click(await screen.findByRole('button', { name: 'Volver' }))
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(api.decidirSolicitud).not.toHaveBeenCalled()
    expect(screen.getByText('ana.rojas@uagrm.edu.bo')).toBeTruthy()
    await rechazar('Ana Rojas Suárez')
    fireEvent.click(
      await screen.findByRole('button', { name: 'Rechazar solicitud' }),
    )
    await waitFor(() =>
      expect(api.decidirSolicitud).toHaveBeenCalledWith('m-2', {
        decision: 'rechazar',
        motivo: undefined,
      }),
    )
  })

  it('Esc cierra el diálogo como «Volver» y devuelve el foco al botón', async () => {
    abrir()
    const abrirDialogo = await screen.findByRole('button', {
      name: 'Rechazar la solicitud de Carlos Justiniano',
    })
    abrirDialogo.focus()
    fireEvent.click(abrirDialogo)
    fireEvent(
      await screen.findByRole('dialog'),
      new Event('cancel', { cancelable: true }),
    )
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(api.decidirSolicitud).not.toHaveBeenCalled()
    expect(document.activeElement).toBe(abrirDialogo)
  })

  it('CA-5: si otro administrador ya decidió, avisa y actualiza la lista', async () => {
    vi.mocked(api.decidirSolicitud).mockRejectedValue(
      new api.ErrorApi(409, 'MEMBRESIA_YA_DECIDIDA'),
    )
    vi.mocked(api.listarSolicitudes)
      .mockResolvedValueOnce([carlos, ana])
      .mockResolvedValue([ana])
    abrir()
    await aprobar('Carlos Justiniano')
    expect(
      await screen.findByText(
        'Esta solicitud ya fue decidida por otro administrador. La lista se actualizó.',
      ),
    ).toBeTruthy()
    await waitFor(() =>
      expect(screen.queryByText('cjustiniano@uagrm.edu.bo')).toBeNull(),
    )
    expect(api.listarSolicitudes).toHaveBeenCalledTimes(2)
  })

  it('CA-5: lo mismo al rechazar; el diálogo se cierra', async () => {
    vi.mocked(api.decidirSolicitud).mockRejectedValue(
      new api.ErrorApi(409, 'MEMBRESIA_YA_DECIDIDA'),
    )
    vi.mocked(api.listarSolicitudes)
      .mockResolvedValueOnce([carlos, ana])
      .mockResolvedValue([ana])
    abrir()
    await rechazar('Carlos Justiniano')
    fireEvent.click(
      await screen.findByRole('button', { name: 'Rechazar solicitud' }),
    )
    expect(await screen.findByText(/ya fue decidida/)).toBeTruthy()
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('sin conexión al aprobar conserva la fila y muestra el aviso', async () => {
    vi.mocked(api.decidirSolicitud).mockRejectedValue(
      new api.ErrorApi(0, 'SIN_CONEXION'),
    )
    abrir()
    await aprobar('Carlos Justiniano')
    expect(await screen.findByText(/No hay conexión/)).toBeTruthy()
    expect(screen.getByText('cjustiniano@uagrm.edu.bo')).toBeTruthy()
  })

  it('sin conexión al rechazar deja abierto el diálogo con lo escrito', async () => {
    vi.mocked(api.decidirSolicitud).mockRejectedValue(
      new api.ErrorApi(0, 'SIN_CONEXION'),
    )
    abrir()
    await rechazar('Carlos Justiniano')
    const dialogo = await screen.findByRole('dialog')
    fireEvent.change(within(dialogo).getByLabelText('Motivo (opcional)'), {
      target: { value: 'No es estudiante' },
    })
    fireEvent.click(
      within(dialogo).getByRole('button', { name: 'Rechazar solicitud' }),
    )
    expect(await within(dialogo).findByText(/No hay conexión/)).toBeTruthy()
    expect(
      (
        within(dialogo).getByLabelText(
          'Motivo (opcional)',
        ) as HTMLTextAreaElement
      ).value,
    ).toBe('No es estudiante')
  })

  it('un doble clic en Aprobar decide una sola vez', async () => {
    let terminar: (v: { id: string; estado: 'aprobada' }) => void = () => {}
    vi.mocked(api.decidirSolicitud).mockReturnValue(
      new Promise((resolver) => {
        terminar = resolver
      }),
    )
    abrir()
    const boton = await screen.findByRole('button', {
      name: 'Aprobar la solicitud de Carlos Justiniano',
    })
    fireEvent.click(boton)
    fireEvent.click(boton)
    expect(api.decidirSolicitud).toHaveBeenCalledTimes(1)
    expect((boton as HTMLButtonElement).disabled).toBe(true)
    terminar({ id: 'm-1', estado: 'aprobada' })
    await screen.findByText(/aprobada/)
  })

  it('CA-6: si el servidor responde 403 la pantalla vuelve al inicio', async () => {
    vi.mocked(api.listarSolicitudes).mockRejectedValue(
      new api.ErrorApi(403, 'NO_AUTORIZADO'),
    )
    abrir()
    expect(await screen.findByRole('heading', { name: /Hola/ })).toBeTruthy()
    expect(screen.queryByText('Carlos Justiniano')).toBeNull()
  })

  it('un miembro sin rol, sin organización activa o el super administrador no ven la pantalla', async () => {
    vi.mocked(api.consultarYo).mockResolvedValue({
      ...admin,
      membresias: [{ ...membresiaAdmin, rol: 'miembro' }],
    })
    abrir()
    expect(await screen.findByRole('heading', { name: /Hola/ })).toBeTruthy()
    cleanup()
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
    expect(api.listarSolicitudes).not.toHaveBeenCalled()
  })

  it('el menú ofrece Solicitudes al administrador y no a quien tiene membresía rechazada', async () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <App />
      </MemoryRouter>,
    )
    expect(
      await screen.findByRole('link', { name: 'Solicitudes' }),
    ).toBeTruthy()
    cleanup()
    vi.mocked(api.consultarYo).mockResolvedValue({
      ...admin,
      membresias: [{ ...membresiaAdmin, estado: 'rechazada' }],
    })
    render(
      <MemoryRouter initialEntries={['/']}>
        <App />
      </MemoryRouter>,
    )
    expect(await screen.findByRole('heading', { name: /Hola/ })).toBeTruthy()
    expect(screen.queryByRole('link', { name: 'Solicitudes' })).toBeNull()
  })
})
