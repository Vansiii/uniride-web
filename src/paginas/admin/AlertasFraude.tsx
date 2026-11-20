import { useCallback, useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import * as api from '../../api/cliente'
import type {
  AlertaFraude,
  AnalisisIa,
  BloqueoVigente,
  PatronFraude,
  PersonaAlerta,
} from '../../api/cliente'
import { membresiaActiva } from '../../app/membresia'
import { useSesion } from '../../app/useSesion'
import { Boton } from '../../componentes/Boton'
import {
  Barras,
  Cifra,
  Cifras,
  EsqueletoCifras,
  Panel,
} from '../../componentes/Datos'
import { Icono } from '../../componentes/Icono'
import { formatoNumero, formatoRelativo } from '../../formato'
import type { NombreIcono } from '../../iconos/rutas'
import { Estructura } from '../../componentes/Estructura'
import { t } from '../../i18n'
import estilos from './Solicitudes.module.css'

const PATRONES: PatronFraude[] = [
  'viajes_repetidos',
  'sin_desplazamiento',
  'verificaciones_fallidas',
]

const ICONO_PATRON: Record<PatronFraude, NombreIcono> = {
  viajes_repetidos: 'refresh',
  sin_desplazamiento: 'location_off',
  verificaciones_fallidas: 'qr_code_2',
}

function Patron({ patron }: { patron: PatronFraude }) {
  return (
    <span
      className={estilos.patron}
      title={t(`fraude.alertas.patron_ayuda.${patron}`)}
    >
      <Icono nombre={ICONO_PATRON[patron]} tamano={16} />
      {t(`fraude.alertas.patron.${patron}`)}
    </span>
  )
}

const dosCifras = (n: number) => String(n).padStart(2, '0')

/** «15/10/2026 · 18:40», en la hora local de quien mira. */
const formatearFecha = (iso: string) => {
  const f = new Date(iso)
  return `${dosCifras(f.getDate())}/${dosCifras(f.getMonth() + 1)}/${f.getFullYear()} · ${dosCifras(f.getHours())}:${dosCifras(f.getMinutes())}`
}

const personas = (lista: PersonaAlerta[]) =>
  lista
    .map(
      (p) =>
        `${p.nombre || t('fraude.alertas.persona_sin_nombre')} (${t(`fraude.alertas.rol_${p.rol}`)})`,
    )
    .join(' · ')

/** Cifras de la alerta: nunca coordenadas (HU-25 RN-10). */
const detalle = (a: AlertaFraude) =>
  [
    a.cantidad !== undefined &&
      t('fraude.alertas.cantidad').replace('{n}', String(a.cantidad)),
    a.distanciaM !== undefined &&
      t('fraude.alertas.distancia').replace('{n}', String(a.distanciaM)),
    a.minutos !== undefined &&
      t('fraude.alertas.minutos').replace('{n}', String(a.minutos)),
    a.bloqueoHasta &&
      t('fraude.alertas.bloqueo_hasta').replace(
        '{fecha}',
        formatearFecha(a.bloqueoHasta),
      ),
  ]
    .filter(Boolean)
    .join(' · ')

/** PB-10: insignia del riesgo y, desplegable, los motivos. Solo informa: no hay acciones. */
function Riesgo({ alerta }: { alerta: AlertaFraude }) {
  const a: AnalisisIa | undefined = alerta.analisis
  if (!a)
    return (
      <span className={estilos.riesgoPendiente}>
        {t(
          alerta.estadoAnalisis === 'sin_analisis'
            ? 'fraude.alertas.analisis.sin_analisis'
            : 'fraude.alertas.analisis.pendiente',
        )}
      </span>
    )
  return (
    <div className={estilos.riesgoCelda}>
      <span className={estilos[`riesgo_${a.riesgo}`]}>
        {t(`fraude.alertas.analisis.riesgo_${a.riesgo}`)} {a.puntaje}
      </span>
      <details className={estilos.analisis}>
        <summary>{t('fraude.alertas.analisis.ver')}</summary>
        <p className={estilos.relativo}>
          {t(`fraude.alertas.analisis.proveedor_${a.proveedor}`)} ·{' '}
          {formatearFecha(a.analizadoEn)}
        </p>
        <strong>{t('fraude.alertas.analisis.motivos')}</strong>
        <ul>
          {a.motivos.map((m) => (
            <li key={m}>{m}</li>
          ))}
        </ul>
        <strong>{t('fraude.alertas.analisis.recomendacion')}</strong>
        <p>{a.recomendacion}</p>
        <p className={estilos.relativo}>{t('fraude.alertas.analisis.nota')}</p>
      </details>
    </div>
  )
}

/** Mayor riesgo primero; las alertas sin análisis van al final, de la más reciente a la más antigua. */
const porRiesgo = (a: AlertaFraude, b: AlertaFraude) =>
  (b.analisis?.puntaje ?? -1) - (a.analisis?.puntaje ?? -1) ||
  b.creadoEn.localeCompare(a.creadoEn)

/** HU-26: solo lectura. No hay ninguna acción para levantar un bloqueo; vencen solos. */
export default function AlertasFraude() {
  const { usuario } = useSesion()
  const organizacionId = usuario?.organizacionActiva ?? null
  const organizacion = membresiaActiva(usuario)?.organizacion ?? ''
  const [patron, setPatron] = useState<PatronFraude | ''>('')
  const [alertas, setAlertas] = useState<AlertaFraude[] | null>(null)
  const [siguiente, setSiguiente] = useState<string | undefined>()
  const [bloqueos, setBloqueos] = useState<BloqueoVigente[] | null>(null)
  const [falla, setFalla] = useState(false)
  const [sinPermiso, setSinPermiso] = useState(false)
  const [cargandoMas, setCargandoMas] = useState(false)
  const [orden, setOrden] = useState<'reciente' | 'riesgo'>('reciente')

  const alFallar = useCallback(
    (error: unknown) => {
      if (error instanceof api.ErrorApi && error.estado === 403)
        setSinPermiso(true)
      else setFalla(true)
    },
    [setFalla, setSinPermiso],
  )

  const cargar = useCallback(() => {
    if (!organizacionId) return () => undefined
    let vigente = true
    api
      .listarAlertasFraude(patron || undefined)
      .then((r) => {
        if (!vigente) return
        setAlertas(r.alertas)
        setSiguiente(r.siguiente)
      })
      .catch((e) => vigente && alFallar(e))
    api
      .listarBloqueosVigentes()
      .then((r) => vigente && setBloqueos(r.bloqueos))
      .catch((e) => vigente && alFallar(e))
    return () => {
      vigente = false
    }
  }, [organizacionId, patron, alFallar])

  useEffect(() => cargar(), [cargar])

  if (!organizacionId || sinPermiso) return <Navigate to="/" replace />

  const cargarMas = async () => {
    setCargandoMas(true)
    try {
      const r = await api.listarAlertasFraude(patron || undefined, siguiente)
      setAlertas((previas) => [...(previas ?? []), ...r.alertas])
      setSiguiente(r.siguiente)
    } catch (e) {
      alFallar(e)
    } finally {
      setCargandoMas(false)
    }
  }

  const cuentas = (bloqueos ?? []).filter((b) => b.tipo === 'cuenta').length
  const porPatron = PATRONES.map((p) => ({
    etiqueta: t(`fraude.alertas.patron.${p}`),
    valor: (alertas ?? []).filter((a) => a.patron === p).length,
  }))

  return (
    <Estructura
      titulo={t('fraude.alertas.titulo')}
      descripcion={t('fraude.alertas.descripcion').replace(
        '{organizacion}',
        () => organizacion,
      )}
    >
      {falla && (
        <p role="alert" className={estilos.falla}>
          {t('fraude.alertas.error')}{' '}
          <button
            type="button"
            className={estilos.reintento}
            onClick={() => {
              setFalla(false)
              cargar()
            }}
          >
            {t('fraude.alertas.reintentar')}
          </button>
        </p>
      )}
      {!falla && (alertas === null || bloqueos === null) && (
        <EsqueletoCifras cantidad={3} />
      )}

      {!falla && alertas && bloqueos && (
        <Cifras>
          <Cifra
            icono="warning"
            tono={alertas.length ? 'aviso' : 'neutro'}
            etiqueta={t('fraude.alertas.resumen_alertas')}
            valor={formatoNumero(alertas.length) + (siguiente ? '+' : '')}
            nota={t('fraude.alertas.resumen_alertas_nota')}
          />
          <Cifra
            icono="block"
            tono={bloqueos.length ? 'peligro' : 'exito'}
            etiqueta={t('fraude.alertas.resumen_bloqueos')}
            valor={formatoNumero(bloqueos.length)}
            nota={t('fraude.alertas.resumen_bloqueos_nota')}
          />
          <Cifra
            icono="person"
            tono={cuentas ? 'peligro' : 'neutro'}
            etiqueta={t('fraude.alertas.resumen_cuentas')}
            valor={formatoNumero(cuentas)}
            nota={t('fraude.alertas.resumen_cuentas_nota').replace(
              '{n}',
              formatoNumero(bloqueos.length - cuentas),
            )}
          />
        </Cifras>
      )}

      {!falla && alertas && !patron && alertas.length > 0 && (
        <Panel
          icono="donut_large"
          titulo={t('fraude.alertas.distribucion_titulo')}
          descripcion={t('fraude.alertas.distribucion_texto')}
        >
          <Barras
            datos={porPatron.map((p) => ({
              ...p,
              texto: t(
                p.valor === 1
                  ? 'fraude.alertas.n_alertas_uno'
                  : 'fraude.alertas.n_alertas',
              ).replace('{n}', formatoNumero(p.valor)),
            }))}
          />
        </Panel>
      )}

      {!falla && bloqueos && (
        <section aria-labelledby="titulo-bloqueos" className={estilos.seccion}>
          <div>
            <h2 id="titulo-bloqueos" className={estilos.titulo}>
              {t('fraude.alertas.bloqueos_titulo')}
            </h2>
            <p className={estilos.textoSeccion}>
              {t('fraude.alertas.bloqueos_texto')}
            </p>
          </div>
          {bloqueos.length === 0 ? (
            <p className={estilos.vacio}>
              {t('fraude.alertas.bloqueos_vacio')}
            </p>
          ) : (
            <div className={estilos.envoltura}>
              <table className={estilos.tabla}>
                <caption className="solo-lector">
                  {t('fraude.alertas.bloqueos_titulo')}
                </caption>
                <thead>
                  <tr>
                    <th scope="col">{t('fraude.alertas.columna_tipo')}</th>
                    <th scope="col">{t('fraude.alertas.columna_patron')}</th>
                    <th scope="col">{t('fraude.alertas.columna_personas')}</th>
                    <th scope="col">{t('fraude.alertas.columna_hasta')}</th>
                  </tr>
                </thead>
                <tbody>
                  {bloqueos.map((b, i) => (
                    <tr key={`${b.tipo}-${b.hasta}-${i}`}>
                      <th scope="row" className={estilos.nombre}>
                        {t(`fraude.alertas.tipo_${b.tipo}`)}
                      </th>
                      <td>
                        <Patron patron={b.patron} />
                      </td>
                      <td>{personas(b.personas)}</td>
                      <td className={estilos.fecha}>
                        <span>{formatearFecha(b.hasta)}</span>
                        <span className={estilos.relativo}>
                          {t('fraude.alertas.vence').replace(
                            '{tiempo}',
                            formatoRelativo(b.hasta),
                          )}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      {!falla && alertas && (
        <section aria-labelledby="titulo-alertas" className={estilos.seccion}>
          <div className={estilos.cabeceraSeccion}>
            <div>
              <h2 id="titulo-alertas" className={estilos.titulo}>
                {t('fraude.alertas.alertas_titulo')}
              </h2>
              <p className={estilos.textoSeccion}>
                {t('fraude.alertas.alertas_texto')}
              </p>
            </div>
            <label className={estilos.filtro}>
              {t('fraude.alertas.filtro')}{' '}
              <select
                value={patron}
                onChange={(e) => {
                  setFalla(false)
                  setPatron(e.target.value as PatronFraude | '')
                }}
              >
                <option value="">{t('fraude.alertas.todos')}</option>
                {PATRONES.map((p) => (
                  <option key={p} value={p}>
                    {t(`fraude.alertas.patron.${p}`)}
                  </option>
                ))}
              </select>
            </label>
            <label className={estilos.filtro}>
              {t('fraude.alertas.orden')}{' '}
              <select
                value={orden}
                onChange={(e) =>
                  setOrden(e.target.value as 'reciente' | 'riesgo')
                }
              >
                <option value="reciente">
                  {t('fraude.alertas.orden_reciente')}
                </option>
                <option value="riesgo">
                  {t('fraude.alertas.orden_riesgo')}
                </option>
              </select>
            </label>
          </div>
          {alertas.length === 0 ? (
            <p className={estilos.vacio}>{t('fraude.alertas.vacio')}</p>
          ) : (
            <div className={estilos.envoltura}>
              <table className={estilos.tabla}>
                <caption className="solo-lector">
                  {t('fraude.alertas.alertas_titulo')}
                </caption>
                <thead>
                  <tr>
                    <th scope="col">{t('fraude.alertas.columna_fecha')}</th>
                    <th scope="col">{t('fraude.alertas.columna_patron')}</th>
                    <th scope="col">{t('fraude.alertas.columna_personas')}</th>
                    <th scope="col">{t('fraude.alertas.columna_detalle')}</th>
                    <th scope="col">{t('fraude.alertas.columna_riesgo')}</th>
                  </tr>
                </thead>
                <tbody>
                  {(orden === 'riesgo'
                    ? [...alertas].sort(porRiesgo)
                    : alertas
                  ).map((a) => (
                    <tr key={a.id}>
                      <th scope="row" className={estilos.fecha}>
                        <span>{formatearFecha(a.creadoEn)}</span>
                        <span className={estilos.relativo}>
                          {formatoRelativo(a.creadoEn)}
                        </span>
                      </th>
                      <td>
                        <Patron patron={a.patron} />
                      </td>
                      <td>{personas(a.personas)}</td>
                      <td>{detalle(a)}</td>
                      <td>
                        <Riesgo alerta={a} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {siguiente && (
            <Boton
              variante="secundario"
              etiqueta={t('fraude.alertas.cargar_mas')}
              cargando={cargandoMas}
              disabled={cargandoMas}
              onClick={cargarMas}
            />
          )}
        </section>
      )}
    </Estructura>
  )
}
