import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import * as api from '../api/cliente'
import { ErrorApi } from '../api/cliente'
import type { InvitacionPublica } from '../api/cliente'
import { useSesion } from '../app/useSesion'
import { Boton } from '../componentes/Boton'
import { Campo } from '../componentes/Campo'
import { t } from '../i18n'
import estilos from './IniciarSesion.module.css'

/** Traduce el `codigo` de la API; nunca muestra códigos técnicos. */
function mensajeDe(error: unknown): string {
  if (!(error instanceof ErrorApi)) return t('comun.errores.desconocido')
  switch (error.codigo) {
    case 'INVITACION_VENCIDA':
      return t('organizaciones.invitacion.vencida')
    case 'CONTRASENA_DEBIL':
      return t('organizaciones.invitacion.contrasena_debil')
    case 'CREDENCIALES_INVALIDAS':
      return t('organizaciones.invitacion.credenciales_invalidas')
    case 'SIN_CONEXION':
      return t('comun.errores.sin_conexion')
    default:
      return t('comun.errores.desconocido')
  }
}

export default function AceptarInvitacion() {
  const { token = '' } = useParams()
  const { aceptar } = useSesion()
  const navegar = useNavigate()
  const [info, setInfo] = useState<InvitacionPublica | null>(null)
  const [nombre, setNombre] = useState('')
  const [contrasena, setContrasena] = useState('')
  const [errores, setErrores] = useState<{
    nombre?: string
    contrasena?: string
  }>({})
  const [falla, setFalla] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    let vigente = true
    api
      .consultarInvitacion(token)
      .then((i) => {
        if (!vigente) return
        setInfo(i)
        setNombre(i.nombre)
      })
      .catch((e) => vigente && setFalla(mensajeDe(e)))
      .finally(() => vigente && setCargando(false))
    return () => {
      vigente = false
    }
  }, [token])

  if (cargando) return <p role="status">{t('comun.estados.cargando')}</p>
  // Una invitación inválida no muestra formulario, solo el motivo.
  if (!info) {
    return (
      <div className={estilos.contenido}>
        <p role="alert" className={estilos.falla}>
          {falla}
        </p>
      </div>
    )
  }

  const enviar = async (e: FormEvent) => {
    e.preventDefault()
    const nuevos = {
      nombre:
        info.cuentaExistente || nombre.trim()
          ? undefined
          : t('organizaciones.invitacion.nombre_requerido'),
      contrasena: contrasena
        ? undefined
        : t('organizaciones.invitacion.contrasena_requerida'),
    }
    setErrores(nuevos)
    setFalla(null)
    if (nuevos.nombre || nuevos.contrasena) return
    setEnviando(true)
    try {
      await aceptar(
        token,
        contrasena,
        info.cuentaExistente ? undefined : nombre.trim(),
      )
      navegar('/', { replace: true })
    } catch (error) {
      setFalla(mensajeDe(error))
      setEnviando(false)
    }
  }

  return (
    <div className={estilos.contenido}>
      <form className={estilos.formulario} onSubmit={enviar} noValidate>
        <h1 className={estilos.titulo}>
          {t('organizaciones.invitacion.titulo')}
        </h1>
        <p className={estilos.ayuda}>
          {t('organizaciones.invitacion.descripcion').replace(
            '{organizacion}',
            info.organizacion,
          )}
        </p>
        {falla && (
          <p role="alert" className={estilos.falla}>
            {falla}
          </p>
        )}
        <Campo
          etiqueta={t('autenticacion.sesion.correo')}
          value={info.correo}
          readOnly
        />
        {info.cuentaExistente ? (
          <p className={estilos.ayuda}>
            {t('organizaciones.invitacion.contrasena_existente')}
          </p>
        ) : (
          <Campo
            etiqueta={t('organizaciones.invitacion.nombre')}
            autoComplete="name"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            error={errores.nombre}
          />
        )}
        <Campo
          etiqueta={t('organizaciones.invitacion.contrasena')}
          type="password"
          autoComplete={
            info.cuentaExistente ? 'current-password' : 'new-password'
          }
          value={contrasena}
          onChange={(e) => setContrasena(e.target.value)}
          ayuda={
            info.cuentaExistente
              ? undefined
              : t('organizaciones.invitacion.contrasena_ayuda')
          }
          error={errores.contrasena}
        />
        <Boton
          type="submit"
          anchoCompleto
          cargando={enviando}
          etiqueta={t(
            enviando
              ? 'organizaciones.invitacion.aceptando'
              : 'organizaciones.invitacion.aceptar',
          )}
        />
      </form>
    </div>
  )
}
