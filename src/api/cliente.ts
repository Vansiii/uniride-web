const BASE = import.meta.env.VITE_API_URL ?? '/api/v1'

/** Error de la API con el `codigo` estable que el cliente traduce con su es-BO. */
export class ErrorApi extends Error {
  readonly estado: number
  readonly codigo: string
  readonly datos: Record<string, unknown>

  constructor(
    estado: number,
    codigo: string,
    datos: Record<string, unknown> = {},
  ) {
    super(codigo)
    this.estado = estado
    this.codigo = codigo
    this.datos = datos
  }
}

/** Una membresía propia, en cualquiera de las organizaciones de la persona (`GET /yo`). */
export interface MembresiaPropia {
  organizacionId: string
  organizacion: string
  rol: 'miembro' | 'admin_organizacion'
  estado: 'pendiente' | 'aprobada' | 'rechazada'
}

export interface Usuario {
  id: string
  nombreCompleto: string
  correo: string
  rolPlataforma: string | null
  organizacionActiva: string | null
  membresias: MembresiaPropia[]
}

// El token de acceso vive solo en memoria; el de refresco, en una cookie httpOnly que JS no ve.
let tokenAcceso: string | null = null
let renovando: Promise<boolean> | null = null

async function enviar(
  ruta: string,
  metodo: string,
  cuerpo?: unknown,
): Promise<Response> {
  try {
    return await fetch(`${BASE}${ruta}`, {
      method: metodo,
      credentials: 'same-origin',
      headers: {
        'Content-Type': 'application/json',
        ...(tokenAcceso ? { Authorization: `Bearer ${tokenAcceso}` } : {}),
      },
      body: cuerpo === undefined ? undefined : JSON.stringify(cuerpo),
    })
  } catch {
    throw new ErrorApi(0, 'SIN_CONEXION')
  }
}

async function leer<T>(respuesta: Response): Promise<T> {
  if (respuesta.ok)
    return (respuesta.status === 204 ? undefined : await respuesta.json()) as T
  const datos = await respuesta.json().catch(() => ({}))
  throw new ErrorApi(
    respuesta.status,
    datos.codigo ?? 'ERROR_DESCONOCIDO',
    datos,
  )
}

/** Pide un token de acceso nuevo con la cookie de refresco; llamadas simultáneas comparten una sola petición. */
export function renovarSesion(): Promise<boolean> {
  renovando ??= enviar('/autenticacion/refrescar', 'POST', {})
    .then(async (r) => {
      if (!r.ok) return false
      tokenAcceso = (await r.json()).tokenAcceso
      return true
    })
    .catch(() => false)
    .finally(() => {
      renovando = null
    })
  return renovando
}

async function solicitar<T>(
  ruta: string,
  metodo: string,
  cuerpo?: unknown,
): Promise<T> {
  let respuesta = await enviar(ruta, metodo, cuerpo)
  if (respuesta.status === 401 && tokenAcceso && (await renovarSesion())) {
    respuesta = await enviar(ruta, metodo, cuerpo)
  }
  return leer<T>(respuesta)
}

export async function iniciarSesion(
  correo: string,
  contrasena: string,
): Promise<void> {
  const r = await leer<{ tokenAcceso: string }>(
    await enviar('/autenticacion/iniciar-sesion', 'POST', {
      correo,
      contrasena,
      tipoCliente: 'web',
    }),
  )
  tokenAcceso = r.tokenAcceso
}

export async function cerrarSesion(): Promise<void> {
  try {
    await solicitar<void>('/autenticacion/cerrar-sesion', 'POST', {})
  } finally {
    tokenAcceso = null
  }
}

export const consultarYo = () => solicitar<Usuario>('/yo', 'GET')

// --- HU-34: recuperación de contraseña (endpoints públicos) ---

/** Siempre responde 202 igual, haya o no cuenta; `reenviarEn` es cuándo se puede pedir otro código. */
export const recuperarContrasena = (correo: string) =>
  enviar('/autenticacion/recuperar-contrasena', 'POST', { correo }).then((r) =>
    leer<{ reenviarEn: string }>(r),
  )

/** Cambia la contraseña con el código; el servidor cierra todas las sesiones y no inicia ninguna. */
export const restablecerContrasena = (
  correo: string,
  codigo: string,
  contrasenaNueva: string,
) =>
  enviar('/autenticacion/restablecer-contrasena', 'POST', {
    correo,
    codigo,
    contrasenaNueva,
  }).then((r) => leer<void>(r))

// --- HU-01: organizaciones e invitaciones ---

export interface Organizacion {
  id: string
  nombre: string
  tipo: 'universidad' | 'empresa'
  estado: string
  precioMaximoUrc: number
  admin: { nombre: string; correo: string } | null
  estadoInvitacion:
    'pendiente' | 'enviada' | 'no_enviada' | 'vencida' | 'aceptada'
  creadoEn: string
}

export interface NuevaOrganizacion {
  nombre: string
  tipo: 'universidad' | 'empresa'
  precioMaximoUrc: number
  adminNombre: string
  adminCorreo: string
}

export interface InvitacionPublica {
  organizacion: string
  correo: string
  nombre: string
  cuentaExistente: boolean
}

export const listarOrganizaciones = () =>
  solicitar<Organizacion[]>('/admin/organizaciones', 'GET')

export const crearOrganizacion = (datos: NuevaOrganizacion) =>
  solicitar<Organizacion>('/admin/organizaciones', 'POST', datos)

export const reenviarInvitacion = (id: string) =>
  solicitar<void>(`/admin/organizaciones/${id}/invitacion`, 'POST', {})

// --- HU-02: reglas de afiliación ---

export type ModoAprobacion = 'manual' | 'automatica'

export interface Afiliacion {
  dominios: string[]
  modoAprobacion: ModoAprobacion
}

export const consultarAfiliacion = (organizacionId: string) =>
  solicitar<Afiliacion>(`/organizaciones/${organizacionId}/afiliacion`, 'GET')

export const guardarAfiliacion = (organizacionId: string, datos: Afiliacion) =>
  solicitar<Afiliacion>(
    `/organizaciones/${organizacionId}/afiliacion`,
    'PUT',
    datos,
  )

// --- HU-03: aprobación de miembros ---

export interface Solicitud {
  id: string
  nombreCompleto: string
  correoInstitucional: string
  creadoEn: string
}

export interface Decision {
  decision: 'aprobar' | 'rechazar'
  motivo?: string
}

export const listarSolicitudes = (organizacionId: string) =>
  solicitar<Solicitud[]>(
    `/organizaciones/${organizacionId}/membresias?estado=pendiente`,
    'GET',
  )

export const decidirSolicitud = (id: string, datos: Decision) =>
  solicitar<{ id: string; estado: 'aprobada' | 'rechazada' }>(
    `/membresias/${id}/decision`,
    'POST',
    datos,
  )

export const consultarInvitacion = (token: string) =>
  enviar(`/invitaciones/${encodeURIComponent(token)}`, 'GET').then((r) =>
    leer<InvitacionPublica>(r),
  )

/** Acepta la invitación y deja la sesión iniciada (el servidor responde con los tokens). */
export async function aceptarInvitacion(
  token: string,
  contrasena: string,
  nombreCompleto?: string,
): Promise<void> {
  const r = await leer<{ tokenAcceso: string }>(
    await enviar(`/invitaciones/${encodeURIComponent(token)}/aceptar`, 'POST', {
      contrasena,
      nombreCompleto,
      tipoCliente: 'web',
    }),
  )
  tokenAcceso = r.tokenAcceso
}
