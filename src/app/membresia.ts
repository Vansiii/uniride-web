import type { MembresiaPropia, Usuario } from '../api/cliente'

/** Membresía de la persona en la organización activa (viene de `GET /yo`). */
export const membresiaActiva = (
  usuario: Usuario | null,
): MembresiaPropia | null =>
  usuario?.membresias.find(
    (m) => m.organizacionId === usuario.organizacionActiva,
  ) ?? null

/** Solo el administrador aprobado de la organización activa ve sus pantallas; el servidor vuelve a comprobarlo. */
export const administraOrganizacion = (usuario: Usuario | null): boolean => {
  const m = membresiaActiva(usuario)
  return (
    usuario?.rolPlataforma !== 'super_admin' &&
    m?.rol === 'admin_organizacion' &&
    m.estado === 'aprobada'
  )
}
