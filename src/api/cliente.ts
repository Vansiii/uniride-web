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

export interface Usuario {
  id: string
  nombreCompleto: string
  correo: string
  rolPlataforma: string | null
  organizacionActiva: string | null
  membresias: unknown[]
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
