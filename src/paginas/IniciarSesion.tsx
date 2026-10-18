import { useState } from 'react'
import type { FormEvent } from 'react'
import { Navigate } from 'react-router-dom'
import { ErrorApi } from '../api/cliente'
import { useSesion } from '../app/useSesion'
import { Boton } from '../componentes/Boton'
import { Campo } from '../componentes/Campo'
import { t } from '../i18n'
import estilos from './IniciarSesion.module.css'

/** Traduce el `codigo` de la API; nunca muestra códigos técnicos (DESIGN_SYSTEM §13.4). */
function mensajeDe(error: unknown): string {
  if (!(error instanceof ErrorApi)) return t('comun.errores.desconocido')
  switch (error.codigo) {
    case 'CREDENCIALES_INVALIDAS':
      return t('autenticacion.sesion.credenciales_invalidas')
    case 'SESION_BLOQUEADA': {
      const hora = new Date(
        String(error.datos.reintentarEn),
      ).toLocaleTimeString('es-BO', {
        hour: '2-digit',
        minute: '2-digit',
      })
      return t('autenticacion.sesion.bloqueada').replace('{hora}', hora)
    }
    case 'SIN_CONEXION':
      return t('comun.errores.sin_conexion')
    default:
      return t('comun.errores.desconocido')
  }
}

export default function IniciarSesion() {
  const { usuario, iniciar } = useSesion()
  const [correo, setCorreo] = useState('')
  const [contrasena, setContrasena] = useState('')
  const [verContrasena, setVerContrasena] = useState(false)
  const [errores, setErrores] = useState<{
    correo?: string
    contrasena?: string
  }>({})
  const [falla, setFalla] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)

  if (usuario) return <Navigate to="/" replace />

  const enviar = async (e: FormEvent) => {
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
    if (nuevos.correo || nuevos.contrasena) return
    setEnviando(true)
    try {
      await iniciar(correo.trim(), contrasena)
    } catch (error) {
      setFalla(mensajeDe(error))
    } finally {
      setEnviando(false)
    }
  }

  return (
    <div className={estilos.pagina}>
      <aside className={estilos.marca}>
        <img
          src="/firma-blanco.svg"
          alt={t('aplicacion.nombre')}
          className={estilos.logo}
        />
        <p className={estilos.eslogan}>{t('aplicacion.eslogan')}</p>
        <ul className={estilos.beneficios}>
          <li>{t('autenticacion.sesion.beneficio_1')}</li>
          <li>{t('autenticacion.sesion.beneficio_2')}</li>
          <li>{t('autenticacion.sesion.beneficio_3')}</li>
        </ul>
      </aside>
      <main className={estilos.contenido}>
        <form className={estilos.formulario} onSubmit={enviar} noValidate>
          <h1 className={estilos.titulo}>{t('autenticacion.sesion.titulo')}</h1>
          <p className={estilos.ayuda}>{t('autenticacion.sesion.subtitulo')}</p>
          {falla && (
            <p role="alert" className={estilos.falla}>
              {falla}
            </p>
          )}
          <Campo
            etiqueta={t('autenticacion.sesion.correo')}
            type="email"
            autoComplete="email"
            placeholder={t('autenticacion.sesion.correo_ejemplo')}
            value={correo}
            onChange={(e) => setCorreo(e.target.value)}
            error={errores.correo}
          />
          <Campo
            etiqueta={t('autenticacion.sesion.contrasena')}
            type={verContrasena ? 'text' : 'password'}
            autoComplete="current-password"
            value={contrasena}
            onChange={(e) => setContrasena(e.target.value)}
            error={errores.contrasena}
          />
          <Boton
            variante="texto"
            etiqueta={t(
              verContrasena
                ? 'autenticacion.sesion.ocultar_contrasena'
                : 'autenticacion.sesion.mostrar_contrasena',
            )}
            onClick={() => setVerContrasena(!verContrasena)}
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
      </main>
    </div>
  )
}
