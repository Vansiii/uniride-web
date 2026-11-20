import { useContext, useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { consultarAsistente, type RespuestaAsistente } from '../api/cliente'
import { Contexto } from '../app/useSesion'
import { administraOrganizacion } from '../app/membresia'
import { t } from '../i18n'
import { Icono } from './Icono'
import estilos from './PanelAsistente.module.css'

export function PanelAsistente() {
  const [abierto, setAbierto] = useState(false)
  const [consulta, setConsulta] = useState('')
  const [cargando, setCargando] = useState(false)
  const [respuesta, setRespuesta] = useState<RespuestaAsistente | null>(null)
  const [error, setError] = useState<string | null>(null)
  const sesion = useContext(Contexto)
  const usuario = sesion?.usuario ?? null
  const navigate = useNavigate()
  const entradaRef = useRef<HTMLInputElement>(null)

  const superAdmin = usuario?.rolPlataforma === 'super_admin'
  const administra = administraOrganizacion(usuario)

  const clavesSugerencias = superAdmin
    ? [
        'asistente.sugerencia_admin_1',
        'asistente.sugerencia_admin_2',
        'asistente.sugerencia_admin_3',
      ]
    : administra
      ? [
          'asistente.sugerencia_org_1',
          'asistente.sugerencia_org_2',
          'asistente.sugerencia_org_3',
        ]
      : [
          'asistente.sugerencia_1',
          'asistente.sugerencia_2',
          'asistente.sugerencia_3',
        ]

  useEffect(() => {
    if (abierto) {
      entradaRef.current?.focus()
    }
  }, [abierto])

  useEffect(() => {
    if (!abierto) return
    const alPresionarEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setAbierto(false)
      }
    }
    window.addEventListener('keydown', alPresionarEsc)
    return () => window.removeEventListener('keydown', alPresionarEsc)
  }, [abierto])

  const manejarConsulta = async (texto: string) => {
    const limpio = texto.trim()
    if (!limpio || cargando) return

    setCargando(true)
    setError(null)
    setRespuesta(null)

    try {
      const res = await consultarAsistente(limpio)
      setRespuesta(res)
    } catch {
      setError(t('asistente.error_consulta'))
    } finally {
      setCargando(false)
    }
  }

  const enviarFormulario = (e: FormEvent) => {
    e.preventDefault()
    manejarConsulta(consulta)
  }

  const ejecutarAccion = (ruta: string) => {
    setAbierto(false)
    navigate(ruta)
  }

  return (
    <>
      <button
        type="button"
        className={estilos.disparador}
        onClick={() => setAbierto(!abierto)}
        aria-label={t(abierto ? 'asistente.cerrar' : 'asistente.abrir')}
        aria-expanded={abierto}
      >
        <span className={estilos.iconoDisparador} aria-hidden="true">
          <Icono nombre="help_outline" tamano={20} />
        </span>
        <span>{t('asistente.boton')}</span>
      </button>

      {abierto && (
        <section
          className={estilos.panel}
          aria-labelledby="titulo-asistente"
          role="dialog"
        >
          <header className={estilos.cabecera}>
            <h2 id="titulo-asistente" className={estilos.titulo}>
              <Icono nombre="info" tamano={20} />
              {t('asistente.titulo')}
            </h2>
            <button
              type="button"
              className={estilos.botonCerrar}
              onClick={() => setAbierto(false)}
              aria-label={t('asistente.cerrar_panel')}
            >
              <Icono nombre="close" tamano={16} />
            </button>
          </header>

          <div className={estilos.cuerpo}>
            {cargando && (
              <div className={estilos.cargando} aria-live="polite">
                <Icono nombre="schedule" tamano={16} />
                <span>{t('asistente.consultando')}</span>
              </div>
            )}

            {error && (
              <p className={estilos.avisoError} role="alert">
                {error}
              </p>
            )}

            {respuesta ? (
              <div className={estilos.respuesta}>
                <p className={estilos.mensajeRespuesta}>{respuesta.mensaje}</p>

                {respuesta.pasos && respuesta.pasos.length > 0 && (
                  <ol className={estilos.listaPasos}>
                    {respuesta.pasos.map((paso, idx) => (
                      <li key={idx}>{paso}</li>
                    ))}
                  </ol>
                )}

                {respuesta.accion && (
                  <button
                    type="button"
                    className={estilos.botonAccion}
                    onClick={() => ejecutarAccion(respuesta.accion!.ruta)}
                  >
                    <span>
                      {respuesta.accion.etiquetaBoton || t('asistente.ir_ahora')}
                    </span>
                    <Icono nombre="arrow_forward" tamano={16} />
                  </button>
                )}
              </div>
            ) : (
              !cargando && (
                <div className={estilos.sugerencias}>
                  <span className={estilos.etiquetaSugerencias}>
                    {t('asistente.descripcion')}
                  </span>
                  {clavesSugerencias.map((clave) => (
                    <button
                      key={clave}
                      type="button"
                      className={estilos.chipSugerencia}
                      onClick={() => {
                        const texto = t(clave)
                        setConsulta(texto)
                        manejarConsulta(texto)
                      }}
                    >
                      {t(clave)}
                    </button>
                  ))}
                </div>
              )
            )}
          </div>

          <form className={estilos.formulario} onSubmit={enviarFormulario}>
            <input
              ref={entradaRef}
              type="text"
              className={estilos.campoTexto}
              value={consulta}
              onChange={(e) => setConsulta(e.target.value)}
              placeholder={t('asistente.placeholder')}
              aria-label={t('asistente.placeholder')}
            />
            <button
              type="submit"
              className={estilos.botonEnviar}
              disabled={!consulta.trim() || cargando}
            >
              {t('asistente.enviar')}
            </button>
          </form>
        </section>
      )}
    </>
  )
}

