import { useCallback, useEffect, useState } from 'react'
import * as api from '../api/cliente'
import type {
  MetricasOrganizacion,
  MetricasPlataforma,
  PeriodoResumen,
} from '../api/cliente'
import {
  Anillo,
  BarraReporte,
  Barras,
  Cifra,
  Cifras,
  EsqueletoCifras,
  Panel,
  Rejilla,
  Trayecto,
} from '../componentes/Datos'
import { Estructura } from '../componentes/Estructura'
import { Icono } from '../componentes/Icono'
import { formatoNumero, formatoPorcentaje, descargarCsv } from '../formato'
import { t } from '../i18n'
import resumen from './admin/Resumen.module.css'
import tabla from './admin/Solicitudes.module.css'
import estilos from './Metricas.module.css'

const DIAS: Record<PeriodoResumen, number | null> = {
  '7d': 7,
  '30d': 30,
  todo: null,
}
const KG_CO2_POR_ARBOL = 21

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

const m = (clave: string) => t(`plataforma.metricas.${clave}`)
const n = (clave: string, valor: number) =>
  m(clave).replace('{n}', formatoNumero(valor))

/** HU-33: métricas de toda la plataforma. Solo lectura; el orden de la tabla se resuelve en el cliente. */
export default function Metricas() {
  const [periodo, setPeriodo] = useState<PeriodoResumen>('30d')
  const [datos, setDatos] = useState<MetricasPlataforma | null>(null)
  const [actualizado, setActualizado] = useState<Date>()
  const [falla, setFalla] = useState(false)
  const [orden, setOrden] = useState<{ columna: Columna; asc: boolean }>({
    columna: 'nombre',
    asc: true,
  })

  const cargar = useCallback(() => {
    let vigente = true
    api
      .consultarMetricas(periodo)
      .then((r) => {
        if (!vigente) return
        setDatos(r)
        setActualizado(new Date())
      })
      .catch(() => vigente && setFalla(true))
    return () => {
      vigente = false
    }
  }, [periodo, setFalla])

  useEffect(() => cargar(), [cargar])

  const g = datos?.global
  const dias = DIAS[periodo]
  const organizaciones = datos?.porOrganizacion ?? []
  const filas = [...organizaciones].sort(
    (a, b) => (orden.asc ? 1 : -1) * comparar(a, b, orden.columna),
  )
  const sinActividadGlobal =
    !!g && g.viajesPagados === 0 && g.fallidasOExpiradas === 0
  const sinViajes = organizaciones.filter((o) => o.viajesPagados === 0).length
  const reservas = g ? g.pasajeros + g.fallidasOExpiradas : 0
  const ranking = [...organizaciones]
    .filter((o) => o.viajesPagados > 0)
    .sort((a, b) => b.viajesPagados - a.viajesPagados)
    .slice(0, 5)
  const porMiembros = [...organizaciones]
    .filter((o) => o.miembrosActivos > 0)
    .sort((a, b) => b.miembrosActivos - a.miembrosActivos)
    .slice(0, 5)
  const parte = (o: MetricasOrganizacion) =>
    g?.viajesPagados ? o.viajesPagados / g.viajesPagados : 0

  const descargar = () =>
    g &&
    descargarCsv(m('csv_nombre'), [
      [
        m('columna_nombre'),
        m('columna_viajes'),
        m('columna_miembros'),
        m('columna_co2'),
        m('columna_participacion'),
      ],
      ...filas.map((o) => [
        o.nombre,
        o.viajesPagados,
        o.miembrosActivos,
        o.co2Kg,
        formatoPorcentaje(parte(o)),
      ]),
    ])

  return (
    <Estructura titulo={m('titulo')} descripcion={m('descripcion')} banda>
      <BarraReporte
        periodo={periodo}
        alCambiar={(p) => {
          setFalla(false)
          setPeriodo(p)
        }}
        actualizado={actualizado}
        alDescargar={g ? descargar : undefined}
      />

      {falla && (
        <p role="alert" className={resumen.falla}>
          {m('error')}{' '}
          <button
            type="button"
            onClick={() => {
              setFalla(false)
              cargar()
            }}
          >
            {m('reintentar')}
          </button>
        </p>
      )}
      {!falla && !datos && <EsqueletoCifras cantidad={6} />}

      {!falla && g && (
        <>
          <Cifras>
            <Cifra
              icono="corporate_fare"
              etiqueta={m('organizaciones')}
              valor={formatoNumero(g.organizacionesActivas)}
              nota={sinViajes ? n('organizaciones_nota', sinViajes) : undefined}
            />
            <Cifra
              icono="group"
              etiqueta={m('miembros')}
              valor={formatoNumero(g.miembrosActivos)}
              nota={
                g.organizacionesActivas
                  ? n(
                      'miembros_nota',
                      g.miembrosActivos / g.organizacionesActivas,
                    )
                  : undefined
              }
            />
            <Cifra
              icono="directions_car"
              etiqueta={m('viajes')}
              valor={formatoNumero(g.viajesPagados)}
              nota={dias ? n('viajes_nota', g.viajesPagados / dias) : undefined}
            />
            <Cifra
              icono="airline_seat_recline_normal"
              etiqueta={m('pasajeros')}
              valor={formatoNumero(g.pasajeros)}
              nota={
                g.viajesPagados
                  ? n('pasajeros_nota', g.pasajeros / g.viajesPagados)
                  : undefined
              }
            />
            <Cifra
              icono="eco"
              tono="exito"
              etiqueta={m('co2')}
              valor={formatoNumero(g.co2Kg)}
              extra={m('estimado')}
              nota={
                g.co2Kg ? n('co2_nota', g.co2Kg / KG_CO2_POR_ARBOL) : undefined
              }
            />
            <Cifra
              icono="cancel"
              tono={g.fallidasOExpiradas ? 'peligro' : 'neutro'}
              etiqueta={m('fallidas')}
              valor={formatoNumero(g.fallidasOExpiradas)}
              nota={
                reservas
                  ? m('fallidas_nota').replace(
                      '{p}',
                      formatoPorcentaje(g.fallidasOExpiradas / reservas),
                    )
                  : undefined
              }
            />
          </Cifras>
          {sinActividadGlobal && (
            <p className={resumen.vacio}>
              <Icono nombre="route" tamano={20} />
              {m('vacio')}
            </p>
          )}

          {!sinActividadGlobal && (
            <Rejilla>
              <Panel
                icono="donut_large"
                titulo={m('exito_titulo')}
                descripcion={m('exito_texto')}
              >
                <Anillo
                  centro={formatoPorcentaje(
                    reservas ? g.pasajeros / reservas : 0,
                  )}
                  etiquetaCentro={m('exito_centro')}
                  partes={[
                    {
                      etiqueta: m('exito_completadas'),
                      valor: g.pasajeros,
                      texto: formatoNumero(g.pasajeros),
                      tono: 'exito',
                    },
                    {
                      etiqueta: m('exito_fallidas'),
                      valor: g.fallidasOExpiradas,
                      texto: formatoNumero(g.fallidasOExpiradas),
                      tono: 'peligro',
                    },
                  ]}
                />
              </Panel>

              <Panel
                icono="leaderboard"
                titulo={m('ranking_titulo')}
                descripcion={m('ranking_texto')}
              >
                <Barras
                  datos={ranking.map((o) => ({
                    etiqueta: o.nombre,
                    valor: o.viajesPagados,
                    texto: n('viajes_n', o.viajesPagados),
                    nota: formatoPorcentaje(parte(o)),
                  }))}
                />
              </Panel>

              {porMiembros.length > 0 && (
                <Panel
                  icono="groups"
                  titulo={m('participacion_titulo')}
                  descripcion={m('participacion_texto')}
                  ancho
                >
                  <Barras
                    datos={porMiembros.map((o) => ({
                      etiqueta: o.nombre,
                      valor: o.miembrosActivos,
                      texto: n('miembros_n', o.miembrosActivos),
                      nota: formatoPorcentaje(
                        g.miembrosActivos
                          ? o.miembrosActivos / g.miembrosActivos
                          : 0,
                      ),
                    }))}
                  />
                </Panel>
              )}
            </Rejilla>
          )}

          {filas.length > 0 && (
            <section
              aria-labelledby="titulo-por-organizacion"
              className={estilos.seccion}
            >
              <h2 id="titulo-por-organizacion" className={estilos.titulo}>
                {m('tabla')}
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
                            className={estilos.ordenar}
                            onClick={() =>
                              setOrden((o) => ({
                                columna,
                                asc: o.columna === columna ? !o.asc : true,
                              }))
                            }
                          >
                            {m(clave)}
                            <span aria-hidden="true" className={estilos.flecha}>
                              {orden.columna === columna
                                ? orden.asc
                                  ? '▲'
                                  : '▼'
                                : '↕'}
                            </span>
                          </button>
                        </th>
                      ))}
                      <th scope="col">{m('columna_participacion')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filas.map((o) => (
                      <tr key={o.organizacionId}>
                        <th scope="row" className={tabla.nombre}>
                          {o.nombre}
                          {o.sinActividad && (
                            <span className={estilos.sinActividad}>
                              {m('sin_actividad')}
                            </span>
                          )}
                        </th>
                        <td data-etiqueta={m('columna_viajes')}>
                          {formatoNumero(o.viajesPagados)}
                        </td>
                        <td data-etiqueta={m('columna_miembros')}>
                          {formatoNumero(o.miembrosActivos)}
                        </td>
                        <td data-etiqueta={m('columna_co2')}>
                          {formatoNumero(o.co2Kg)}
                        </td>
                        <td
                          data-etiqueta={m('columna_participacion')}
                          className={estilos.participacion}
                        >
                          <span className={estilos.porcentaje}>
                            {formatoPorcentaje(parte(o))}
                          </span>
                          <Trayecto fraccion={parte(o)} />
                        </td>
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
