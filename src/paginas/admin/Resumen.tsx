import { useCallback, useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import * as api from '../../api/cliente'
import type { PeriodoResumen, ResumenOrganizacion } from '../../api/cliente'
import { membresiaActiva } from '../../app/membresia'
import { useSesion } from '../../app/useSesion'
import {
  BarraReporte,
  Barras,
  Cifra,
  Cifras,
  EsqueletoCifras,
  Panel,
  Rejilla,
  Trayecto,
} from '../../componentes/Datos'
import { Estructura } from '../../componentes/Estructura'
import { Icono } from '../../componentes/Icono'
import { formatoNumero, formatoPorcentaje, descargarCsv } from '../../formato'
import { t } from '../../i18n'
import estilos from './Resumen.module.css'

const PERIODOS: PeriodoResumen[] = ['7d', '30d', 'todo']
const DIAS: Record<PeriodoResumen, number | null> = {
  '7d': 7,
  '30d': 30,
  todo: null,
}
// Valores de referencia (KG_CO2_POR_KM está en el backend; un árbol absorbe ~21 kg de CO₂ al año).
const KG_CO2_POR_KM = 0.12
const KG_CO2_POR_ARBOL = 21
const ASIENTOS = 4

const n = (clave: string, valor: number) =>
  t(clave).replace('{n}', formatoNumero(valor))

/** HU-32: cifras de la organización por período. Solo lectura. */
export default function Resumen() {
  const { usuario } = useSesion()
  const organizacionId = usuario?.organizacionActiva ?? null
  const organizacion = membresiaActiva(usuario)?.organizacion ?? ''
  const [periodo, setPeriodo] = useState<PeriodoResumen>('30d')
  const [resumen, setResumen] = useState<ResumenOrganizacion | null>(null)
  const [actualizado, setActualizado] = useState<Date>()
  const [falla, setFalla] = useState(false)
  const [sinPermiso, setSinPermiso] = useState(false)
  // Los tres períodos a la vez para comparar; si falla, la comparación simplemente no se muestra.
  const [todos, setTodos] = useState<Partial<
    Record<PeriodoResumen, ResumenOrganizacion>
  > | null>(null)

  const cargar = useCallback(() => {
    if (!organizacionId) return () => undefined
    let vigente = true
    api
      .consultarResumen(periodo)
      .then((r) => {
        if (!vigente) return
        setResumen(r)
        setActualizado(new Date())
      })
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

  useEffect(() => {
    if (!organizacionId) return
    let vigente = true
    Promise.all(PERIODOS.map((p) => api.consultarResumen(p)))
      .then(
        (r) =>
          vigente &&
          setTodos(Object.fromEntries(PERIODOS.map((p, i) => [p, r[i]]))),
      )
      .catch(() => undefined)
    return () => {
      vigente = false
    }
  }, [organizacionId])

  if (!organizacionId || sinPermiso) return <Navigate to="/" replace />

  const dias = DIAS[periodo]
  const r = resumen
  const porViaje = r && r.viajesPagados ? r.pasajeros / r.viajesPagados : 0
  const km = r ? r.co2Kg / KG_CO2_POR_KM : 0

  // Ritmo diario de la última semana frente al de 30 días.
  const semana = todos?.['7d'] && todos['7d'].viajesPagados / 7
  const mes = todos?.['30d'] && todos['30d'].viajesPagados / 30
  const variacion = semana !== undefined && mes ? semana / mes - 1 : null

  const descargar = () =>
    r &&
    descargarCsv(t('resumen.csv_nombre'), [
      [t('resumen.csv_indicador'), t('resumen.csv_valor')],
      [t('comun.datos.periodo'), t(`comun.datos.periodo_${periodo}`)],
      [t('resumen.viajes'), r.viajesPagados],
      [t('resumen.miembros'), r.miembrosActivos],
      [t('resumen.pasajeros'), r.pasajeros],
      [t('resumen.co2'), r.co2Kg],
      [t('resumen.ocupacion_titulo'), porViaje],
    ])

  return (
    <Estructura
      titulo={t('resumen.titulo')}
      descripcion={t('resumen.descripcion').replace(
        '{organizacion}',
        () => organizacion,
      )}
      banda
    >
      <BarraReporte
        periodo={periodo}
        alCambiar={(p) => {
          setFalla(false)
          setPeriodo(p)
        }}
        actualizado={actualizado}
        alDescargar={r ? descargar : undefined}
      />

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
      {!falla && !r && <EsqueletoCifras />}

      {!falla && r && (
        <>
          <Cifras>
            <Cifra
              icono="directions_car"
              etiqueta={t('resumen.viajes')}
              valor={formatoNumero(r.viajesPagados)}
              nota={
                dias
                  ? n('resumen.viajes_nota', r.viajesPagados / dias)
                  : undefined
              }
            />
            <Cifra
              icono="group"
              etiqueta={t('resumen.miembros')}
              valor={formatoNumero(r.miembrosActivos)}
              nota={t('resumen.miembros_nota')}
            />
            <Cifra
              icono="airline_seat_recline_normal"
              etiqueta={t('resumen.pasajeros')}
              valor={formatoNumero(r.pasajeros)}
              nota={
                r.viajesPagados
                  ? n('resumen.pasajeros_nota', porViaje)
                  : undefined
              }
            />
            <Cifra
              icono="eco"
              tono="exito"
              etiqueta={t('resumen.co2')}
              valor={formatoNumero(r.co2Kg)}
              extra={t('resumen.estimado')}
              nota={r.co2Kg ? n('resumen.co2_nota', km) : undefined}
            />
          </Cifras>

          {r.viajesPagados === 0 ? (
            <p className={estilos.vacio}>
              <Icono nombre="route" tamano={20} />
              {t('resumen.vacio')}
            </p>
          ) : (
            <Rejilla>
              <Panel
                icono="airline_seat_recline_normal"
                titulo={t('resumen.ocupacion_titulo')}
                descripcion={t('resumen.ocupacion_texto')}
              >
                <div className={estilos.asientos} aria-hidden="true">
                  {Array.from({ length: ASIENTOS }, (_, i) => (
                    <span
                      key={i}
                      className={`${estilos.asiento} ${porViaje - i >= 1 ? estilos.ocupado : ''}`}
                      style={{
                        ['--lleno' as string]: `${Math.max(0, Math.min(1, porViaje - i)) * 100}%`,
                      }}
                    >
                      <Icono nombre="airline_seat_recline_normal" tamano={24} />
                    </span>
                  ))}
                </div>
                <p className={estilos.destacado}>
                  {n('resumen.ocupacion_valor', porViaje)}
                </p>
                <Trayecto fraccion={porViaje / ASIENTOS} />
                <p className={estilos.nota}>{t('resumen.ocupacion_meta')}</p>
              </Panel>

              <Panel
                icono="eco"
                titulo={t('resumen.impacto_titulo')}
                descripcion={t('resumen.impacto_texto')}
              >
                <ul className={estilos.equivalencias}>
                  <li>
                    <span className={estilos.iconoEquivalencia}>
                      <Icono nombre="park" />
                    </span>
                    <span>
                      <span className={estilos.destacado}>
                        {n('resumen.arboles', r.co2Kg / KG_CO2_POR_ARBOL)}
                      </span>
                      <span className={estilos.nota}>
                        {t('resumen.arboles_texto')}
                      </span>
                    </span>
                  </li>
                  <li>
                    <span className={estilos.iconoEquivalencia}>
                      <Icono nombre="route" />
                    </span>
                    <span>
                      <span className={estilos.destacado}>
                        {n('resumen.km', km)}
                      </span>
                      <span className={estilos.nota}>
                        {t('resumen.km_texto')}
                      </span>
                    </span>
                  </li>
                </ul>
                <p className={estilos.nota}>
                  {t('comun.datos.referencia_co2')}
                </p>
              </Panel>

              {todos && (
                <>
                  <Panel
                    icono="leaderboard"
                    titulo={t('resumen.comparativa_titulo')}
                    descripcion={t('resumen.comparativa_texto')}
                  >
                    <Barras
                      datos={PERIODOS.map((p) => ({
                        etiqueta: t(`comun.datos.periodo_${p}`),
                        valor: todos[p]?.viajesPagados ?? 0,
                        texto: n(
                          'resumen.viajes_n',
                          todos[p]?.viajesPagados ?? 0,
                        ),
                        nota: n(
                          'resumen.pasajeros_n',
                          todos[p]?.pasajeros ?? 0,
                        ),
                      }))}
                    />
                  </Panel>

                  <Panel
                    icono={
                      variacion === null || Math.abs(variacion) < 0.05
                        ? 'trending_flat'
                        : variacion > 0
                          ? 'trending_up'
                          : 'trending_down'
                    }
                    titulo={t('resumen.ritmo_titulo')}
                  >
                    {variacion === null ? (
                      <p className={estilos.nota}>
                        {t('resumen.ritmo_sin_datos')}
                      </p>
                    ) : (
                      <>
                        <p
                          className={`${estilos.ritmo} ${variacion >= 0.05 ? estilos.alza : variacion <= -0.05 ? estilos.baja : ''}`}
                        >
                          {t(
                            variacion >= 0.05
                              ? 'resumen.ritmo_alza'
                              : variacion <= -0.05
                                ? 'resumen.ritmo_baja'
                                : 'resumen.ritmo_igual',
                          ).replace(
                            '{p}',
                            formatoPorcentaje(Math.abs(variacion)),
                          )}
                        </p>
                        <Barras
                          datos={[
                            {
                              etiqueta: t('resumen.ritmo_semana'),
                              valor: semana ?? 0,
                              texto: n('resumen.ritmo_dia', semana ?? 0),
                            },
                            {
                              etiqueta: t('resumen.ritmo_mes'),
                              valor: mes ?? 0,
                              texto: n('resumen.ritmo_dia', mes ?? 0),
                            },
                          ]}
                        />
                      </>
                    )}
                  </Panel>
                </>
              )}
            </Rejilla>
          )}
        </>
      )}
    </Estructura>
  )
}
