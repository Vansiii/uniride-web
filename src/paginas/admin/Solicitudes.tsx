import { useCallback, useEffect, useRef, useState } from 'react'
import { Navigate } from 'react-router-dom'
import * as api from '../../api/cliente'
import type { Solicitud } from '../../api/cliente'
import { membresiaActiva } from '../../app/membresia'
import { useSesion } from '../../app/useSesion'
import { Boton } from '../../componentes/Boton'
import { Dialogo } from '../../componentes/Dialogo'
import { Estructura } from '../../componentes/Estructura'
import { t } from '../../i18n'
import estilos from './Solicitudes.module.css'

const MOTIVO_MAXIMO = 500
const DURACION_NOTIFICACION = 4000

const dosCifras = (n: number) => String(n).padStart(2, '0')

/** «15/10/2026 · 18:40», en la hora local de quien mira. */
const formatearFecha = (iso: string) => {
  const f = new Date(iso)
  return `${dosCifras(f.getDate())}/${dosCifras(f.getMonth() + 1)}/${f.getFullYear()} · ${dosCifras(f.getHours())}:${dosCifras(f.getMinutes())}`
}

export default function Solicitudes() {
  const { usuario } = useSesion()
  const organizacionId = usuario?.organizacionActiva ?? null
  const organizacion = membresiaActiva(usuario)?.organizacion ?? ''
  const [filas, setFilas] = useState<Solicitud[] | null>(null)
  const [falla, setFalla] = useState<string | null>(null)
  const [aviso, setAviso] = useState<string | null>(null)
  const [notificacion, setNotificacion] = useState<string | null>(null)
  const [sinPermiso, setSinPermiso] = useState(false)
  const [decidiendo, setDecidiendo] = useState<string | null>(null)
  const [rechazando, setRechazando] = useState<Solicitud | null>(null)
  const [motivo, setMotivo] = useState('')
  const region = useRef<HTMLDivElement>(null)
  const devolverFoco = useRef(false)

  const cargar = useCallback(() => {
    if (!organizacionId) return () => undefined
    let vigente = true
    api
      .listarSolicitudes(organizacionId)
      .then((f) => vigente && setFilas(f))
      .catch((error) => {
        if (!vigente) return
        if (error instanceof api.ErrorApi && error.estado === 403)
          setSinPermiso(true)
        else setFalla(t('membresias.lista.cargando_error'))
      })
    return () => {
      vigente = false
    }
  }, [organizacionId])

  useEffect(() => cargar(), [cargar])

  useEffect(() => {
    if (!devolverFoco.current) return
    devolverFoco.current = false
    region.current?.focus()
  }, [filas])

  // La notificación del resultado se va sola a los 4 s (DESIGN_SYSTEM §8.6).
  useEffect(() => {
    if (!notificacion) return
    const espera = setTimeout(
      () => setNotificacion(null),
      DURACION_NOTIFICACION,
    )
    return () => clearTimeout(espera)
  }, [notificacion])

  if (!organizacionId || sinPermiso) return <Navigate to="/" replace />

  const cerrarDialogo = () => {
    setRechazando(null)
    setMotivo('')
    setFalla(null)
  }

  const decidir = async (
    solicitud: Solicitud,
    decision: api.Decision['decision'],
  ) => {
    setFalla(null)
    setAviso(null)
    setNotificacion(null)
    setDecidiendo(solicitud.id) // bloquea los botones: un doble clic no decide dos veces
    try {
      await api.decidirSolicitud(solicitud.id, {
        decision,
        motivo:
          decision === 'rechazar' ? motivo.trim() || undefined : undefined,
      })
      setFilas((actuales) =>
        (actuales ?? []).filter((s) => s.id !== solicitud.id),
      )
      setNotificacion(
        t(
          decision === 'aprobar'
            ? 'membresias.decision.aprobada'
            : 'membresias.decision.rechazada',
        ).replace('{nombre}', () => solicitud.nombreCompleto),
      )
      cerrarDialogo()
      devolverFoco.current = true // la fila decidida se va: el foco pasa a la lista
    } catch (error) {
      const estado = error instanceof api.ErrorApi ? error.estado : 0
      const codigo = error instanceof api.ErrorApi ? error.codigo : ''
      if (estado === 403) return setSinPermiso(true)
      if (codigo === 'MEMBRESIA_YA_DECIDIDA') {
        // Vale la primera decisión: se avisa y la lista se actualiza sola (CA-5).
        cerrarDialogo()
        setAviso(t('membresias.decision.ya_decidida'))
        cargar()
      } else if (codigo === 'SIN_CONEXION')
        setFalla(t('comun.errores.sin_conexion'))
      else if (estado === 404) {
        cerrarDialogo()
        setFalla(t('comun.errores.desconocido'))
        cargar()
      } else setFalla(t('comun.errores.desconocido'))
    } finally {
      setDecidiendo(null)
    }
  }

  const errorVisible = falla && (
    <p role="alert" className={estilos.falla}>
      {falla}
      {filas === null && !rechazando && (
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
            {t('membresias.lista.reintentar')}
          </button>
        </>
      )}
    </p>
  )

  return (
    <Estructura
      titulo={t('membresias.lista.titulo')}
      descripcion={t('membresias.lista.descripcion').replace(
        '{organizacion}',
        () => organizacion,
      )}
    >
      {!rechazando && errorVisible}
      {aviso && (
        <p role="status" className={estilos.aviso}>
          {aviso}
        </p>
      )}
      {notificacion && (
        <div role="status" className={estilos.notificacion}>
          <span>{notificacion}</span>
          <button
            type="button"
            className={estilos.cerrar}
            aria-label={t('membresias.decision.cerrar_aviso')}
            onClick={() => setNotificacion(null)}
          >
            ✕
          </button>
        </div>
      )}
      {filas === null && !falla && (
        <p role="status">{t('comun.estados.cargando')}</p>
      )}
      <div ref={region} tabIndex={-1} className={estilos.region}>
        {filas && filas.length === 0 && (
          <p className={estilos.vacio}>{t('membresias.lista.vacia')}</p>
        )}
        {filas && filas.length > 0 && (
          <div className={estilos.envoltura}>
            <table className={estilos.tabla}>
              <caption className={estilos.leyenda}>
                {filas.length === 1
                  ? t('membresias.lista.pendientes_uno')
                  : t('membresias.lista.pendientes_otras').replace(
                      '{n}',
                      String(filas.length),
                    )}
              </caption>
              <thead>
                <tr>
                  <th scope="col">{t('membresias.lista.columna_nombre')}</th>
                  <th scope="col">{t('membresias.lista.columna_correo')}</th>
                  <th scope="col">{t('membresias.lista.columna_fecha')}</th>
                  <th scope="col" className={estilos.derecha}>
                    {t('membresias.lista.columna_acciones')}
                  </th>
                </tr>
              </thead>
              <tbody>
                {filas.map((s) => (
                  <tr key={s.id}>
                    <th scope="row" className={estilos.nombre}>
                      {s.nombreCompleto}
                    </th>
                    <td
                      data-etiqueta={t('membresias.lista.columna_correo')}
                      className={estilos.correo}
                    >
                      {s.correoInstitucional}
                    </td>
                    <td
                      data-etiqueta={t('membresias.lista.columna_fecha')}
                      className={estilos.fecha}
                    >
                      {formatearFecha(s.creadoEn)}
                    </td>
                    <td className={estilos.acciones}>
                      <Boton
                        variante="secundario"
                        etiqueta={t('membresias.decision.rechazar')}
                        aria-label={t('membresias.decision.rechazar_a').replace(
                          '{nombre}',
                          () => s.nombreCompleto,
                        )}
                        disabled={decidiendo !== null}
                        onClick={() => {
                          setAviso(null)
                          setNotificacion(null)
                          setRechazando(s)
                        }}
                      />
                      <Boton
                        etiqueta={t(
                          decidiendo === s.id && !rechazando
                            ? 'membresias.decision.aprobando'
                            : 'membresias.decision.aprobar',
                        )}
                        aria-label={t('membresias.decision.aprobar_a').replace(
                          '{nombre}',
                          () => s.nombreCompleto,
                        )}
                        cargando={decidiendo === s.id && !rechazando}
                        disabled={decidiendo !== null}
                        onClick={() => decidir(s, 'aprobar')}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      {rechazando && (
        <Dialogo
          titulo={t('membresias.decision.dialogo_titulo').replace(
            '{nombre}',
            () => rechazando.nombreCompleto,
          )}
          alCerrar={() => decidiendo === null && cerrarDialogo()}
        >
          <p className={estilos.secundario}>
            {t('membresias.decision.dialogo_texto').replace(
              '{organizacion}',
              () => organizacion,
            )}
          </p>
          <div className={estilos.campoMotivo}>
            <label htmlFor="motivo-rechazo" className={estilos.etiqueta}>
              {t('membresias.decision.motivo')}
            </label>
            <textarea
              id="motivo-rechazo"
              className={estilos.motivo}
              rows={3}
              maxLength={MOTIVO_MAXIMO}
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              aria-describedby="motivo-ayuda"
            />
            <p id="motivo-ayuda" className={estilos.secundario}>
              {t('membresias.decision.motivo_ayuda')}
            </p>
          </div>
          {errorVisible}
          <div className={estilos.botonesDialogo}>
            <Boton
              variante="texto"
              etiqueta={t('membresias.decision.volver')}
              disabled={decidiendo !== null}
              onClick={cerrarDialogo}
            />
            <Boton
              variante="peligro"
              etiqueta={t(
                decidiendo === rechazando.id
                  ? 'membresias.decision.rechazando'
                  : 'membresias.decision.confirmar_rechazo',
              )}
              cargando={decidiendo === rechazando.id}
              onClick={() => decidir(rechazando, 'rechazar')}
            />
          </div>
        </Dialogo>
      )}
    </Estructura>
  )
}
