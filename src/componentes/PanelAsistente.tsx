import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { consultarAsistente, type RespuestaAsistente } from '../api/cliente'
import { t } from '../i18n'
import { Icono } from './Icono'
import estilos from './PanelAsistente.module.css'

export function PanelAsistente() {
  const [abierto, setAbierto] = useState(false)
  const [consulta, setConsulta] = useState('')
  const [cargando, setCargando] = useState(false)
  const [respuesta, setRespuesta] = useState<RespuestaAsistente | null>(null)
  const [error, setError] = useState<string | null>(null)
  const navigate = useNavigate()
  const entradaRef = useRef<HTMLInputElement>(null)

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
                  <button
                    type="button"
                    className={estilos.chipSugerencia}
                    onClick={() => {
                      setConsulta(t('asistente.sugerencia_1'))
                      manejarConsulta(t('asistente.sugerencia_1'))
                    }}
                  >
                    {t('asistente.sugerencia_1')}
                  </button>
                  <button
                    type="button"
                    className={estilos.chipSugerencia}
                    onClick={() => {
                      setConsulta(t('asistente.sugerencia_2'))
                      manejarConsulta(t('asistente.sugerencia_2'))
                    }}
                  >
                    {t('asistente.sugerencia_2')}
                  </button>
                  <button
                    type="button"
                    className={estilos.chipSugerencia}
                    onClick={() => {
                      setConsulta(t('asistente.sugerencia_3'))
                      manejarConsulta(t('asistente.sugerencia_3'))
                    }}
                  >
                    {t('asistente.sugerencia_3')}
                  </button>
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

