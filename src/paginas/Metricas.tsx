import { useCallback, useEffect, useState } from 'react'
import * as api from '../api/cliente'
import type {
  MetricasOrganizacion,
  MetricasPlataforma,
  PeriodoResumen,
} from '../api/cliente'
import { Estructura } from '../componentes/Estructura'
import { t } from '../i18n'
import resumen from './admin/Resumen.module.css'
import tabla from './admin/Solicitudes.module.css'

const PERIODOS: PeriodoResumen[] = ['7d', '30d', 'todo']
const numero = new Intl.NumberFormat('es-BO', { maximumFractionDigits: 1 })

type Columna = 'nombre' | 'viajesPagados' | 'miembrosActivos' | 'co2Kg'
const COLUMNAS: [Columna, string][] = [
  ['nombre', 'columna_nombre'],
  ['viajesPagados', 'columna_viajes'],
  ['miembrosActivos', 'columna_miembros'],
  ['co2Kg', 'columna_co2'],
]

const comparar = (
  a: MetricasOrganizacion,
  b: MetricasOrganizacion,
  c: Columna,
) => (c === 'nombre' ? a.nombre.localeCompare(b.nombre, 'es') : a[c] - b[c])

/** HU-33: métricas de toda la plataforma. Solo lectura; el orden de la tabla se resuelve en el cliente. */
export default function Metricas() {
  const [periodo, setPeriodo] = useState<PeriodoResumen>('30d')
  const [datos, setDatos] = useState<MetricasPlataforma | null>(null)
  const [falla, setFalla] = useState(false)
  const [orden, setOrden] = useState<{ columna: Columna; asc: boolean }>({
    columna: 'nombre',
    asc: true,
  })

  const cargar = useCallback(() => {
    let vigente = true
    api
      .consultarMetricas(periodo)
      .then((r) => vigente && setDatos(r))
      .catch(() => vigente && setFalla(true))
    return () => {
      vigente = false
    }
  }, [periodo, setFalla])

  useEffect(() => cargar(), [cargar])

  const g = datos?.global
  const tarjetas = g && [
    ['organizaciones', g.organizacionesActivas],
    ['miembros', g.miembrosActivos],
    ['viajes', g.viajesPagados],
    ['pasajeros', g.pasajeros],
    ['co2', g.co2Kg],
    ['fallidas', g.fallidasOExpiradas],
  ]
  const filas = datos
    ? [...datos.porOrganizacion].sort(
        (a, b) => (orden.asc ? 1 : -1) * comparar(a, b, orden.columna),
      )
    : []
  const sinActividadGlobal =
    !!g && g.viajesPagados === 0 && g.fallidasOExpiradas === 0

  return (
    <Estructura
      titulo={t('plataforma.metricas.titulo')}
      descripcion={t('plataforma.metricas.descripcion')}
    >
      <div
        className={resumen.periodos}
        role="group"
        aria-label={t('plataforma.metricas.periodo')}
      >
        {PERIODOS.map((p) => (
          <button
            key={p}
            type="button"
            className={resumen.chip}
            aria-pressed={p === periodo}
            onClick={() => {
              setFalla(false)
              setPeriodo(p)
            }}
          >
            {t(`plataforma.metricas.periodo_${p}`)}
          </button>
        ))}
      </div>

      {falla && (
        <p role="alert" className={resumen.falla}>
          {t('plataforma.metricas.error')}{' '}
          <button
            type="button"
            onClick={() => {
              setFalla(false)
              cargar()
            }}
          >
            {t('plataforma.metricas.reintentar')}
          </button>
        </p>
      )}
      {!falla && !datos && <p role="status">{t('comun.estados.cargando')}</p>}

      {!falla && tarjetas && (
        <>
          <dl className={resumen.tarjetas}>
            {tarjetas.map(([clave, valor]) => (
              <div key={clave} className={resumen.tarjeta}>
                <dt>{t(`plataforma.metricas.${clave}`)}</dt>
                <dd>
                  {numero.format(valor as number)}
                  {clave === 'co2' && (
                    <span className={resumen.estimado}>
                      {t('plataforma.metricas.estimado')}
                    </span>
                  )}
                </dd>
              </div>
            ))}
          </dl>
          {sinActividadGlobal && (
            <p className={resumen.vacio}>{t('plataforma.metricas.vacio')}</p>
          )}

          {filas.length > 0 && (
            <section aria-labelledby="titulo-por-organizacion">
              <h2 id="titulo-por-organizacion">
                {t('plataforma.metricas.tabla')}
              </h2>
              <div className={tabla.envoltura}>
                <table className={tabla.tabla}>
                  <thead>
                    <tr>
                      {COLUMNAS.map(([columna, clave]) => (
                        <th
                          key={columna}
                          scope="col"
                          aria-sort={
                            orden.columna === columna
                              ? orden.asc
                                ? 'ascending'
                                : 'descending'
                              : 'none'
                          }
                        >
                          <button
                            type="button"
                            onClick={() =>
                              setOrden((o) => ({
                                columna,
                                asc: o.columna === columna ? !o.asc : true,
                              }))
                            }
                          >
                            {t(`plataforma.metricas.${clave}`)}
                          </button>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filas.map((o) => (
                      <tr key={o.organizacionId}>
                        <th scope="row" className={tabla.nombre}>
                          {o.nombre}
                          {o.sinActividad && (
                            <span className={resumen.estimado}>
                              {t('plataforma.metricas.sin_actividad')}
                            </span>
                          )}
                        </th>
                        <td>{numero.format(o.viajesPagados)}</td>
                        <td>{numero.format(o.miembrosActivos)}</td>
                        <td>{numero.format(o.co2Kg)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}
        </>
      )}
    </Estructura>
  )
}
