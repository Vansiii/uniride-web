import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import * as api from '../api/cliente'
import { ErrorApi } from '../api/cliente'
import type { InvitacionPublica } from '../api/cliente'
import { useSesion } from '../app/useSesion'
import { PantallaAcceso, PantallaPublica } from '../componentes/Acceso'
import { Boton } from '../componentes/Boton'
import { Campo } from '../componentes/Campo'
import { Cargando, Ilustracion } from '../componentes/Estados'
import { Aviso } from '../componentes/Mensajes'
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
  const [vencida, setVencida] = useState(false)
  const [enviando, setEnviando] = useState(false)
  const [cargando, setCargando] = useState(true)
  const [intento, setIntento] = useState(0)

  // Un error se borra en cuanto la persona corrige el campo (9.2).
  const limpiar = (campo: keyof typeof errores) =>
    setErrores((e) => ({ ...e, [campo]: undefined }))

  useEffect(() => {
    let vigente = true
    api
      .consultarInvitacion(token)
      .then((i) => {
        if (!vigente) return
        setInfo(i)
        setNombre(i.nombre)
      })
      .catch((e) => {
        if (!vigente) return
        setVencida(e instanceof ErrorApi && e.codigo === 'INVITACION_VENCIDA')
        setFalla(mensajeDe(e))
      })
      .finally(() => vigente && setCargando(false))
    return () => {
      vigente = false
    }
  }, [token, intento])

  if (cargando) return <Cargando />
  // Una invitación inválida no muestra formulario, solo el motivo y la salida.
  if (!info) {
    return (
      <PantallaPublica
        tituloDocumento={t(
          vencida
            ? 'organizaciones.invitacion.vencida_titulo'
            : 'organizaciones.invitacion.error_titulo',
        )}
      >
        <Ilustracion
          icono={vencida ? 'schedule' : 'error'}
          tono={vencida ? 'aviso' : 'peligro'}
        />
        <h1 className={estilos.tituloResultado}>
          {t(
            vencida
              ? 'organizaciones.invitacion.vencida_titulo'
              : 'organizaciones.invitacion.error_titulo',
          )}
        </h1>
        <p role="alert" className={estilos.textoResultado}>
          {falla}
        </p>
        {vencida ? (
          <Boton
            variante="secundario"
            anchoCompleto
            hacia="/iniciar-sesion"
            etiqueta={t('organizaciones.invitacion.ir_a_sesion')}
          />
        ) : (
          <Boton
            anchoCompleto
            icono="refresh"
            etiqueta={t('comun.acciones.reintentar')}
            onClick={() => {
              setCargando(true)
              setIntento(intento + 1)
            }}
          />
        )}
      </PantallaPublica>
    )
  }

  const enviar = async (e: FormEvent<HTMLFormElement>) => {
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
    if (nuevos.nombre || nuevos.contrasena) {
      e.currentTarget.querySelector<HTMLInputElement>('[aria-invalid]')?.focus()
      return
    }
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
    <PantallaAcceso
      tituloDocumento={t('organizaciones.invitacion.titulo')}
      titular={t('organizaciones.invitacion.titular').replace(
        '{organizacion}',
        info.organizacion,
      )}
    >
      <form className={estilos.formulario} onSubmit={enviar} noValidate>
        <div className={estilos.encabezado}>
          <h1 className={estilos.titulo}>
            {t('organizaciones.invitacion.titulo')}
          </h1>
          <p className={estilos.ayuda}>
            {t(
              info.cuentaExistente
                ? 'organizaciones.invitacion.contrasena_existente'
                : 'organizaciones.invitacion.descripcion',
            )}
          </p>
        </div>
        {falla && (
          <Aviso rol="alert" tono="peligro">
            {falla}
          </Aviso>
        )}
        <Campo
          etiqueta={t('autenticacion.sesion.correo')}
          type="email"
          value={info.correo}
          readOnly
        />
        {!info.cuentaExistente && (
          <Campo
            etiqueta={t('organizaciones.invitacion.nombre')}
            name="nombre"
            autoComplete="name"
            value={nombre}
            onChange={(e) => {
              setNombre(e.target.value)
              limpiar('nombre')
            }}
            error={errores.nombre}
          />
        )}
        <Campo
          etiqueta={t('organizaciones.invitacion.contrasena')}
          type="password"
          name="contrasena"
          autoComplete={
            info.cuentaExistente ? 'current-password' : 'new-password'
          }
          value={contrasena}
          onChange={(e) => {
            setContrasena(e.target.value)
            limpiar('contrasena')
          }}
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
    </PantallaAcceso>
  )
}
