import { useCallback, useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { Navigate } from 'react-router-dom'
import * as api from '../../api/cliente'
import type {
  Afiliacion as ReglasAfiliacion,
  ModoAprobacion,
} from '../../api/cliente'
import { useSesion } from '../../app/useSesion'
import { Boton } from '../../componentes/Boton'
import { Campo } from '../../componentes/Campo'
import { Estructura } from '../../componentes/Estructura'
import { t } from '../../i18n'
import estilos from './Afiliacion.module.css'

// Solo comodidad para avisar al instante; el servidor valida y decide (CA-3).
const DOMINIOS_PUBLICOS = [
  'gmail.com',
  'hotmail.com',
  'outlook.com',
  'yahoo.com',
  'icloud.com',
]
const NOMBRE_HOST =
  /^(?=.{4,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/

const normalizar = (dominio: string) =>
  dominio.trim().replace(/^@/, '').toLowerCase()

const MODOS: { valor: ModoAprobacion; etiqueta: string; ayuda: string }[] = [
  {
    valor: 'manual',
    etiqueta: 'organizaciones.afiliacion.modo_manual',
    ayuda: 'organizaciones.afiliacion.modo_manual_ayuda',
  },
  {
    valor: 'automatica',
    etiqueta: 'organizaciones.afiliacion.modo_automatica',
    ayuda: 'organizaciones.afiliacion.modo_automatica_ayuda',
  },
]

const hayCambios = (a: ReglasAfiliacion, b: ReglasAfiliacion) =>
  a.modoAprobacion !== b.modoAprobacion ||
  [...a.dominios].sort().join() !== [...b.dominios].sort().join()

export default function Afiliacion() {
  const { usuario } = useSesion()
  const organizacionId = usuario?.organizacionActiva ?? null
  const [guardadas, setGuardadas] = useState<ReglasAfiliacion | null>(null)
  const [dominios, setDominios] = useState<string[]>([])
  const [modo, setModo] = useState<ModoAprobacion>('manual')
  const [entrada, setEntrada] = useState('')
  const [errorDominio, setErrorDominio] = useState<string | null>(null)
  const [invalido, setInvalido] = useState<string | null>(null)
  const [falla, setFalla] = useState<string | null>(null)
  const [aviso, setAviso] = useState<string | null>(null)
  const [sinPermiso, setSinPermiso] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const campo = useRef<HTMLInputElement>(null)

  const cargar = useCallback(() => {
    if (!organizacionId) return () => undefined
    let vigente = true
    api
      .consultarAfiliacion(organizacionId)
      .then((reglas) => {
        if (!vigente) return
        setGuardadas(reglas)
        setDominios(reglas.dominios)
        setModo(reglas.modoAprobacion)
      })
      .catch((error) => {
        if (!vigente) return
        if (error instanceof api.ErrorApi && error.estado === 403)
          setSinPermiso(true)
        else setFalla(t('organizaciones.afiliacion.cargando_error'))
      })
    return () => {
      vigente = false
    }
  }, [organizacionId])

  useEffect(() => cargar(), [cargar])

  const cambios =
    guardadas !== null &&
    hayCambios(guardadas, { dominios, modoAprobacion: modo })

  // Salir de la página con cambios sin guardar pide confirmación del navegador.
  useEffect(() => {
    if (!cambios) return
    const avisar = (e: BeforeUnloadEvent) => e.preventDefault()
    window.addEventListener('beforeunload', avisar)
    return () => window.removeEventListener('beforeunload', avisar)
  }, [cambios])

  if (!organizacionId || sinPermiso) return <Navigate to="/" replace />

  const marcarError = (mensaje: string, dominio: string | null = null) => {
    setErrorDominio(mensaje)
    setInvalido(dominio)
    campo.current?.focus()
  }

  const agregar = (e: FormEvent) => {
    e.preventDefault()
    setAviso(null)
    const dominio = normalizar(entrada)
    if (!dominio)
      return marcarError(t('organizaciones.afiliacion.dominio_requerido'))
    if (!NOMBRE_HOST.test(dominio) || DOMINIOS_PUBLICOS.includes(dominio))
      return marcarError(t('organizaciones.afiliacion.dominio_invalido'))
    setErrorDominio(null)
    setInvalido(null)
    setDominios((actuales) =>
      actuales.includes(dominio) ? actuales : [...actuales, dominio],
    )
    setEntrada('')
  }

  const quitar = (dominio: string) => {
    setDominios((actuales) => actuales.filter((d) => d !== dominio))
    setErrorDominio(null)
    setInvalido(null)
    setAviso(null)
    campo.current?.focus()
  }

  const guardar = async () => {
    setFalla(null)
    setAviso(null)
    if (dominios.length === 0)
      return marcarError(t('organizaciones.afiliacion.minimo_un_dominio'))
    setErrorDominio(null)
    setInvalido(null)
    setGuardando(true) // el botón queda bloqueado: un doble clic no envía dos veces
    try {
      const reglas = await api.guardarAfiliacion(organizacionId, {
        dominios,
        modoAprobacion: modo,
      })
      setGuardadas(reglas)
      setDominios(reglas.dominios)
      setModo(reglas.modoAprobacion)
      setAviso(t('organizaciones.afiliacion.guardado'))
    } catch (error) {
      const codigo = error instanceof api.ErrorApi ? error.codigo : ''
      if (codigo === 'DOMINIO_INVALIDO')
        marcarError(
          t('organizaciones.afiliacion.dominio_invalido'),
          String((error as api.ErrorApi).datos.dominio ?? ''),
        )
      else if (codigo === 'DOMINIO_NO_DISPONIBLE')
        marcarError(t('organizaciones.afiliacion.dominio_no_disponible'))
      else if (codigo === 'MINIMO_UN_DOMINIO')
        marcarError(t('organizaciones.afiliacion.minimo_un_dominio'))
      else if (codigo === 'SIN_CONEXION')
        setFalla(t('comun.errores.sin_conexion'))
      else if (error instanceof api.ErrorApi && error.estado === 403)
        setFalla(t('comun.errores.no_autorizado'))
      else setFalla(t('comun.errores.desconocido'))
    } finally {
      setGuardando(false)
    }
  }

  return (
    <Estructura
      titulo={t('organizaciones.afiliacion.titulo')}
      descripcion={t('organizaciones.afiliacion.descripcion')}
    >
      {falla && (
        <p role="alert" className={estilos.falla}>
          {falla}
          {guardadas === null && (
            <>
              {' '}
              <button
                type="button"
                className={estilos.reintento}
                onClick={() => {
                  setFalla(null)
                  cargar()
                }}
              >
                {t('organizaciones.afiliacion.reintentar')}
              </button>
            </>
          )}
        </p>
      )}
      {aviso && (
        <p role="status" className={estilos.aviso}>
          {aviso}
        </p>
      )}
      {guardadas === null && !falla && (
        <p role="status">{t('comun.estados.cargando')}</p>
      )}
      {guardadas !== null && (
        <>
          <div className={estilos.acciones}>
            <Boton
              etiqueta={t(
                guardando
                  ? 'organizaciones.afiliacion.guardando'
                  : 'organizaciones.afiliacion.guardar',
              )}
              cargando={guardando}
              disabled={!cambios}
              onClick={guardar}
            />
          </div>
          <div className={estilos.columnas}>
            <section
              className={estilos.tarjeta}
              aria-labelledby="titulo-dominios"
            >
              <div>
                <h2 id="titulo-dominios" className={estilos.subtitulo}>
                  {t('organizaciones.afiliacion.dominios_titulo')}
                </h2>
                <p className={estilos.secundario}>
                  {t('organizaciones.afiliacion.dominios_ayuda')}
                </p>
              </div>
              <form className={estilos.agregar} onSubmit={agregar} noValidate>
                <div className={estilos.agregarCampo}>
                  <Campo
                    ref={campo}
                    etiqueta={t('organizaciones.afiliacion.dominio_campo')}
                    placeholder={t('organizaciones.afiliacion.dominio_ejemplo')}
                    autoComplete="off"
                    autoCapitalize="none"
                    spellCheck={false}
                    value={entrada}
                    onChange={(e) => setEntrada(e.target.value)}
                    error={errorDominio ?? undefined}
                  />
                </div>
                <Boton
                  type="submit"
                  variante="secundario"
                  etiqueta={t('organizaciones.afiliacion.agregar')}
                />
              </form>
              {dominios.length === 0 ? (
                <p className={estilos.vacio}>
                  {t('organizaciones.afiliacion.sin_dominios')}
                </p>
              ) : (
                <ul
                  className={estilos.lista}
                  aria-label={t('organizaciones.afiliacion.lista')}
                >
                  {dominios.map((d) => (
                    <li
                      key={d}
                      className={`${estilos.dominio} ${d === invalido ? estilos.dominioInvalido : ''}`}
                    >
                      <span>{d}</span>
                      <button
                        type="button"
                        className={estilos.quitar}
                        aria-label={t(
                          'organizaciones.afiliacion.quitar',
                        ).replace('{dominio}', d)}
                        onClick={() => quitar(d)}
                      >
                        ✕
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              <p className={estilos.secundario}>
                {t('organizaciones.afiliacion.lista_ayuda')}
              </p>
            </section>
            <section className={estilos.tarjeta} aria-labelledby="titulo-modo">
              <div>
                <h2 id="titulo-modo" className={estilos.subtitulo}>
                  {t('organizaciones.afiliacion.modo_titulo')}
                </h2>
                <p className={estilos.secundario}>
                  {t('organizaciones.afiliacion.modo_ayuda')}
                </p>
              </div>
              <div
                className={estilos.opciones}
                role="radiogroup"
                aria-labelledby="titulo-modo"
              >
                {MODOS.map((m) => (
                  <label
                    key={m.valor}
                    className={`${estilos.opcion} ${modo === m.valor ? estilos.seleccionada : ''}`}
                  >
                    <input
                      type="radio"
                      name="modo-aprobacion"
                      value={m.valor}
                      checked={modo === m.valor}
                      onChange={() => {
                        setModo(m.valor)
                        setAviso(null)
                      }}
                    />
                    <span>
                      <span className={estilos.enfasis}>{t(m.etiqueta)}</span>
                      <span className={estilos.secundario}>{t(m.ayuda)}</span>
                    </span>
                  </label>
                ))}
              </div>
            </section>
          </div>
        </>
      )}
    </Estructura>
  )
}
