import { createContext, useContext, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import * as api from '../api/cliente'
import type { Usuario } from '../api/cliente'

interface Sesion {
  /** `true` mientras se intenta recuperar la sesión con la cookie de refresco. */
  cargando: boolean
  usuario: Usuario | null
  iniciar: (correo: string, contrasena: string) => Promise<void>
  cerrar: () => Promise<void>
}

const Contexto = createContext<Sesion | null>(null)

export function ProveedorSesion({ children }: { children: ReactNode }) {
  const [cargando, setCargando] = useState(true)
  const [usuario, setUsuario] = useState<Usuario | null>(null)

  useEffect(() => {
    let vigente = true
    ;(async () => {
      const u = (await api.renovarSesion())
        ? await api.consultarYo().catch(() => null)
        : null
      if (vigente) {
        setUsuario(u)
        setCargando(false)
      }
    })()
    return () => {
      vigente = false
    }
  }, [])

  const iniciar = async (correo: string, contrasena: string) => {
    await api.iniciarSesion(correo, contrasena)
    setUsuario(await api.consultarYo())
  }
  const cerrar = async () => {
    await api.cerrarSesion().catch(() => undefined)
    setUsuario(null)
  }

  return (
    <Contexto value={{ cargando, usuario, iniciar, cerrar }}>
      {children}
    </Contexto>
  )
}

export function useSesion(): Sesion {
  const valor = useContext(Contexto)
  if (!valor) throw new Error('useSesion requiere <ProveedorSesion>')
  return valor
}
