import { createContext, useContext } from 'react'
import type { Usuario } from '../api/cliente'

export interface Sesion {
  /** `true` mientras se intenta recuperar la sesión con la cookie de refresco. */
  cargando: boolean
  usuario: Usuario | null
  iniciar: (correo: string, contrasena: string) => Promise<void>
  cerrar: () => Promise<void>
}

export const Contexto = createContext<Sesion | null>(null)

export function useSesion(): Sesion {
  const valor = useContext(Contexto)
  if (!valor) throw new Error('useSesion requiere <ProveedorSesion>')
  return valor
}
