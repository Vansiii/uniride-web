import { useState } from 'react'
import type { FormEvent } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { ErrorApi } from '../api/cliente'
import { useSesion } from '../app/useSesion'
import { PantallaAcceso } from '../componentes/Acceso'
import { Boton } from '../componentes/Boton'
import { Campo } from '../componentes/Campo'
import { Aviso } from '../componentes/Mensajes'
import { t } from '../i18n'
import estilos from './IniciarSesion.module.css'

interface Falla {
  texto: string
  bloqueada?: boolean
}

/** Traduce el `codigo` de la API; nunca muestra códigos técnicos (DESIGN_SYSTEM §13.4). */
function fallaDe(error: unknown): Falla {
  if (!(error instanceof ErrorApi))
    return { texto: t('comun.errores.desconocido') }
  switch (error.codigo) {
    case 'CREDENCIALES_INVALIDAS':
      return { texto: t('autenticacion.sesion.credenciales_invalidas') }
    case 'SESION_BLOQUEADA': {
      const hora = new Date(
        String(error.datos.reintentarEn),
      ).toLocaleTimeString('es-BO', {
        hour: '2-digit',
        minute: '2-digit',
        hourCycle: 'h23',
      })
      return {
        texto: t('autenticacion.sesion.bloqueada').replace('{hora}', hora),
        bloqueada: true,
      }
    }
    case 'SIN_CONEXION':
      return { texto: t('comun.errores.sin_conexion') }
    default:
      return { texto: t('comun.errores.desconocido') }
  }
}

export default function IniciarSesion() {
  const { usuario, iniciar } = useSesion()
  const { state } = useLocation()
  const [correo, setCorreo] = useState('')
  const [contrasena, setContrasena] = useState('')
  const [errores, setErrores] = useState<{
    correo?: string
    contrasena?: string
  }>({})
  const [falla, setFalla] = useState<Falla | null>(null)
  const [enviando, setEnviando] = useState(false)

  // Un error se borra en cuanto la persona corrige el campo (9.2).
  const limpiar = (campo: keyof typeof errores) =>
    setErrores((e) => ({ ...e, [campo]: undefined }))

  if (usuario)
    return <Navigate to={(state as { desde?: string })?.desde ?? '/'} replace />

  const enviar = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const nuevos = {
      correo: /^\S+@\S+\.\S+$/.test(correo.trim())
        ? undefined
        : t('autenticacion.sesion.correo_invalido'),
      contrasena: contrasena
        ? undefined
        : t('autenticacion.sesion.contrasena_requerida'),
    }
    setErrores(nuevos)
    setFalla(null)
    if (nuevos.correo || nuevos.contrasena) {
      // Foco en el primer campo con error (9.2).
      e.currentTarget.querySelector<HTMLInputElement>('[aria-invalid]')?.focus()
      return
    }
    setEnviando(true)
    try {
      await iniciar(correo.trim(), contrasena)
    } catch (error) {
      setFalla(fallaDe(error))
    } finally {
      setEnviando(false)
    }
  }

  return (
    <PantallaAcceso
      tituloDocumento={t('autenticacion.sesion.titulo')}
      titular={t('aplicacion.eslogan')}
      puntos={[
        { icono: 'verified', texto: t('autenticacion.sesion.beneficio_1') },
        { icono: 'qr_code_2', texto: t('autenticacion.sesion.beneficio_2') },
        { icono: 'lock', texto: t('autenticacion.sesion.beneficio_3') },
      ]}
    >
      <form className={estilos.formulario} onSubmit={enviar} noValidate>
        <div className={estilos.encabezado}>
          <h1 className={estilos.titulo}>{t('autenticacion.sesion.titulo')}</h1>
          <p className={estilos.ayuda}>{t('autenticacion.sesion.subtitulo')}</p>
        </div>
        {falla && (
          <Aviso
            rol="alert"
            tono={falla.bloqueada ? 'aviso' : 'peligro'}
            titulo={
              falla.bloqueada
                ? t('autenticacion.sesion.bloqueada_titulo')
                : undefined
            }
          >
            {falla.texto}
          </Aviso>
        )}
        <Campo
          etiqueta={t('autenticacion.sesion.correo')}
          type="email"
          name="correo"
          autoComplete="email"
          spellCheck={false}
          placeholder={t('autenticacion.sesion.correo_ejemplo')}
          value={correo}
          onChange={(e) => {
            setCorreo(e.target.value)
            limpiar('correo')
          }}
          error={errores.correo}
        />
        <Campo
          etiqueta={t('autenticacion.sesion.contrasena')}
          type="password"
          name="contrasena"
          autoComplete="current-password"
          value={contrasena}
          onChange={(e) => {
            setContrasena(e.target.value)
            limpiar('contrasena')
          }}
          error={errores.contrasena}
        />
        <Boton
          type="submit"
          anchoCompleto
          cargando={enviando}
          etiqueta={t(
            enviando
              ? 'autenticacion.sesion.entrando'
              : 'autenticacion.sesion.entrar',
          )}
        />
      </form>
    </PantallaAcceso>
  )
}
