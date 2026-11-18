import { useCallback, useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import * as api from '../../api/cliente'
import type { PeriodoResumen, ResumenOrganizacion } from '../../api/cliente'
import { membresiaActiva } from '../../app/membresia'
import { useSesion } from '../../app/useSesion'
import { Estructura } from '../../componentes/Estructura'
import { t } from '../../i18n'
import estilos from './Resumen.module.css'

const PERIODOS: PeriodoResumen[] = ['7d', '30d', 'todo']

const formatoNumero = new Intl.NumberFormat('es-BO', {
  maximumFractionDigits: 1,
})

/** HU-32: cifras de la organización por período. Solo lectura. */
export default function Resumen() {
  const { usuario } = useSesion()
  const organizacionId = usuario?.organizacionActiva ?? null
  const organizacion = membresiaActiva(usuario)?.organizacion ?? ''
  const [periodo, setPeriodo] = useState<PeriodoResumen>('30d')
  const [resumen, setResumen] = useState<ResumenOrganizacion | null>(null)
  const [falla, setFalla] = useState(false)
  const [sinPermiso, setSinPermiso] = useState(false)

  const cargar = useCallback(() => {
    if (!organizacionId) return () => undefined
    let vigente = true
    api
      .consultarResumen(periodo)
      .then((r) => vigente && setResumen(r))
      .catch((e) => {
        if (!vigente) return
        if (e instanceof api.ErrorApi && e.estado === 403) setSinPermiso(true)
        else setFalla(true)
      })
    return () => {
      vigente = false
    }
  }, [organizacionId, periodo, setFalla, setSinPermiso])

  useEffect(() => cargar(), [cargar])

  if (!organizacionId || sinPermiso) return <Navigate to="/" replace />

  const tarjetas = resumen && [
    ['viajes', resumen.viajesPagados],
    ['miembros', resumen.miembrosActivos],
    ['pasajeros', resumen.pasajeros],
    ['co2', resumen.co2Kg],
  ]

  return (
    <Estructura
      titulo={t('resumen.titulo')}
      descripcion={t('resumen.descripcion').replace(
        '{organizacion}',
        () => organizacion,
      )}
    >
      <div
        className={estilos.periodos}
        role="group"
        aria-label={t('resumen.periodo')}
      >
        {PERIODOS.map((p) => (
          <button
            key={p}
            type="button"
            className={estilos.chip}
            aria-pressed={p === periodo}
            onClick={() => {
              setFalla(false)
              setPeriodo(p)
            }}
          >
            {t(`resumen.periodo_${p}`)}
          </button>
        ))}
      </div>

      {falla && (
        <p role="alert" className={estilos.falla}>
          {t('resumen.error')}{' '}
          <button
            type="button"
            onClick={() => {
              setFalla(false)
              cargar()
            }}
          >
            {t('resumen.reintentar')}
          </button>
        </p>
      )}
      {!falla && !resumen && <p role="status">{t('comun.estados.cargando')}</p>}

      {!falla && tarjetas && (
        <>
          <dl className={estilos.tarjetas}>
            {tarjetas.map(([clave, valor]) => (
              <div key={clave} className={estilos.tarjeta}>
                <dt>{t(`resumen.${clave}`)}</dt>
                <dd>
                  {formatoNumero.format(valor as number)}
                  {clave === 'co2' && (
                    <span className={estilos.estimado}>
                      {t('resumen.estimado')}
                    </span>
                  )}
                </dd>
              </div>
            ))}
          </dl>
          {resumen.viajesPagados === 0 && (
            <p className={estilos.vacio}>{t('resumen.vacio')}</p>
          )}
        </>
      )}
    </Estructura>
  )
}
