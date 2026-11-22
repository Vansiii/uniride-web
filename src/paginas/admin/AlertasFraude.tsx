import { Fragment, useCallback, useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import * as api from '../../api/cliente'
import type {
  AlertaFraude,
  AnalisisIa,
  BloqueoVigente,
  DecisionFraude,
  DesempenoFraude,
  PatronFraude,
  PersonaAlerta,
} from '../../api/cliente'
import { membresiaActiva } from '../../app/membresia'
import { useSesion } from '../../app/useSesion'
import { Boton } from '../../componentes/Boton'
import {
  Anillo,
  Barras,
  Cifra,
  Cifras,
  EsqueletoCifras,
  Panel,
  Rejilla,
} from '../../componentes/Datos'
import { Icono } from '../../componentes/Icono'
import {
  BarraPercentil,
  CurvaRoc,
  GrafoAnilloVista,
  Histograma,
  Medidor,
} from '../../componentes/Riesgo'
import { nivelDe } from '../../componentes/nivelRiesgo'
import {
  formatoNumero,
  formatoPorcentaje,
  formatoRelativo,
} from '../../formato'
import type { NombreIcono } from '../../iconos/rutas'
import { Estructura } from '../../componentes/Estructura'
import { t } from '../../i18n'
import estilos from './Solicitudes.module.css'
import propios from './AlertasFraude.module.css'

const PATRONES: PatronFraude[] = [
  'viajes_repetidos',
  'sin_desplazamiento',
  'verificaciones_fallidas',
  'comportamiento_atipico',
  'anillo_colusion',
]

const ICONO_PATRON: Record<PatronFraude, NombreIcono> = {
  viajes_repetidos: 'refresh',
  sin_desplazamiento: 'location_off',
  verificaciones_fallidas: 'qr_code_2',
  comportamiento_atipico: 'trending_up',
  anillo_colusion: 'groups',
}

const TRES_DIAS_MS = 3 * 24 * 3_600_000

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

/** PB-11: el puntaje de la alerta; el del análisis, que con modelo vigente es el del modelo (CA-5). */
const puntajeDe = (a: AlertaFraude) => a.analisis?.puntaje ?? a.puntajeModelo

/** Celda de riesgo: medidor mini, insignia con texto y el botón del detalle. */
function Riesgo({
  alerta,
  abierta,
  alAlternar,
}: {
  alerta: AlertaFraude
  abierta: boolean
  alAlternar: () => void
}) {
  const puntaje = puntajeDe(alerta)
  const decision = alerta.decision
  return (
    <div className={propios.celdaRiesgo}>
      {puntaje === undefined ? (
        <span className={estilos.riesgoPendiente}>
          {t(
            alerta.estadoAnalisis === 'sin_analisis'
              ? 'fraude.alertas.analisis.sin_analisis'
              : 'fraude.alertas.analisis.pendiente',
          )}
        </span>
      ) : (
        <>
          <Medidor puntaje={puntaje} tamano="mini" />
          <span className={estilos[`riesgo_${nivelDe(puntaje)}`]}>
            {t(`fraude.alertas.analisis.riesgo_${nivelDe(puntaje)}`)} {puntaje}
          </span>
        </>
      )}
      {decision && (
        <span
          className={
            decision.valor === 'confirmado'
              ? propios.decisionConfirmada
              : propios.decisionDescartada
          }
        >
          <Icono
            nombre={decision.valor === 'confirmado' ? 'task_alt' : 'cancel'}
            tamano={16}
          />
          {t(`fraude.decision.${decision.valor}`)}
        </span>
      )}
      <button
        type="button"
        className={propios.alternar}
        aria-expanded={abierta}
        onClick={alAlternar}
      >
        {t(
          abierta
            ? 'fraude.alertas.ocultar_detalle'
            : alerta.analisis
              ? 'fraude.alertas.analisis.ver'
              : 'fraude.alertas.ver_detalle',
        )}
        <Icono nombre="chevron_right" tamano={16} />
      </button>
    </div>
  )
}

/** Explicación de la IA de lenguaje: motivos, recomendación y quién analizó (PB-10, RN-9). */
function Explicacion({ a }: { a: AnalisisIa }) {
  return (
    <div className={propios.explicacion}>
      <h4 className={propios.subtitulo}>
        <Icono nombre="info" tamano={20} />
        {t('fraude.alertas.analisis.explicacion')}
      </h4>
      <p className={estilos.relativo}>
        {t(`fraude.alertas.analisis.proveedor_${a.proveedor}`)} ·{' '}
        {formatearFecha(a.analizadoEn)}
      </p>
      <strong>{t('fraude.alertas.analisis.motivos')}</strong>
      <ul className={propios.motivos}>
        {a.motivos.map((m) => (
          <li key={m}>{m}</li>
        ))}
      </ul>
      <strong>{t('fraude.alertas.analisis.recomendacion')}</strong>
      <p>{a.recomendacion}</p>
      <p className={propios.nota}>{t('fraude.alertas.analisis.nota')}</p>
    </div>
  )
}

/** PB-11 CA-8: decisión del administrador; no toca bloqueos (CA-12). */
function Decision({
  alerta,
  alDecidir,
}: {
  alerta: AlertaFraude
  alDecidir: (decision: DecisionFraude, nota: string) => Promise<void>
}) {
  const [nota, setNota] = useState('')
  const [guardando, setGuardando] = useState<DecisionFraude | null>(null)
  const [error, setError] = useState(false)
  const decidir = async (d: DecisionFraude) => {
    setGuardando(d)
    setError(false)
    try {
      await alDecidir(d, nota)
      setNota('')
    } catch {
      setError(true)
    } finally {
      setGuardando(null)
    }
  }
  const ultima = alerta.decision
  return (
    <div className={propios.decision}>
      <div>
        <h4 className={propios.subtitulo}>
          <Icono nombre="verified" tamano={20} />
          {t('fraude.decision.titulo')}
        </h4>
        <p className={estilos.relativo}>{t('fraude.decision.texto')}</p>
        {ultima && (
          <p className={propios.ultima}>
            {t('fraude.decision.ultima')
              .replace('{decision}', t(`fraude.decision.${ultima.valor}`))
              .replace('{autor}', ultima.autor)
              .replace('{tiempo}', formatoRelativo(ultima.en))}
            {ultima.nota && <span> · «{ultima.nota}»</span>}
          </p>
        )}
      </div>
      <label className={propios.campoNota}>
        {t('fraude.decision.nota')}
        <input
          type="text"
          maxLength={200}
          value={nota}
          onChange={(e) => setNota(e.target.value)}
        />
      </label>
      <div className={propios.botonesDecision}>
        <Boton
          variante="peligro"
          icono="task_alt"
          etiqueta={t('fraude.decision.confirmar')}
          cargando={guardando === 'confirmado'}
          disabled={guardando !== null}
          onClick={() => decidir('confirmado')}
        />
        <Boton
          variante="secundario"
          icono="cancel"
          etiqueta={t('fraude.decision.descartar')}
          cargando={guardando === 'falso_positivo'}
          disabled={guardando !== null}
          onClick={() => decidir('falso_positivo')}
        />
      </div>
      {error && (
        <p role="alert" className={estilos.falla}>
          {t('fraude.decision.error')}
        </p>
      )}
    </div>
  )
}

/** Detalle de la alerta: medidor, factores con percentil, explicación, grafo del anillo y decisión. */
function DetalleAlerta({
  alerta,
  alDecidir,
}: {
  alerta: AlertaFraude
  alDecidir: (decision: DecisionFraude, nota: string) => Promise<void>
}) {
  const puntaje = puntajeDe(alerta)
  const origen = alerta.origen ?? 'reglas'
  const deModelo =
    alerta.analisis?.origenPuntaje === 'modelo' ||
    (!alerta.analisis && alerta.puntajeModelo !== undefined)
  return (
    <div className={propios.detalle}>
      <div className={propios.columnaMedidor}>
        {puntaje !== undefined ? (
          <Medidor puntaje={puntaje} />
        ) : (
          <span className={estilos.riesgoPendiente}>
            {t('fraude.alertas.analisis.pendiente')}
          </span>
        )}
        <div className={propios.chips}>
          <span className={`${propios.chip} ${propios[`origen_${origen}`]}`}>
            {t(`fraude.alertas.origen.${origen}`)}
          </span>
          {puntaje !== undefined && (
            <span className={propios.chipSuave}>
              {t(
                deModelo
                  ? 'fraude.alertas.analisis.origen_modelo'
                  : 'fraude.alertas.analisis.origen_estimado',
              )}
            </span>
          )}
        </div>
      </div>

      <div className={propios.columnaFactores}>
        <h4 className={propios.subtitulo}>
          <Icono nombre="leaderboard" tamano={20} />
          {t('fraude.riesgo.factores_titulo')}
        </h4>
        {alerta.factores?.length ? (
          <ul className={propios.factores}>
            {alerta.factores.map((f) => (
              <BarraPercentil key={f.cifra} factor={f} />
            ))}
          </ul>
        ) : (
          <p className={estilos.relativo}>
            {t('fraude.riesgo.factores_vacio')}
          </p>
        )}
      </div>

      {alerta.analisis && <Explicacion a={alerta.analisis} />}

      {alerta.grafo && (
        <div className={propios.bloqueAncho}>
          <h4 className={propios.subtitulo}>
            <Icono nombre="groups" tamano={20} />
            {t('fraude.anillo.titulo')}
          </h4>
          <GrafoAnilloVista grafo={alerta.grafo} />
        </div>
      )}

      <div className={propios.bloqueAncho}>
        <Decision alerta={alerta} alDecidir={alDecidir} />
      </div>
    </div>
  )
}

/** Banda de marca: estado del modelo propio (RN-2). */
function EstadoModelo({
  d,
  viejo,
}: {
  d: DesempenoFraude | null
  viejo: boolean
}) {
  if (!d) return null
  const m = d.modelo
  if (!m)
    return (
      <div className={propios.banda}>
        <span className={propios.pildora}>
          <span className={propios.puntoEspera} aria-hidden="true" />
          {t('fraude.modelo.sin_modelo')}
        </span>
        <span className={propios.textoBanda}>
          {d.sinDatos
            ? t('fraude.modelo.sin_datos')
                .replace('{pares}', String(d.sinDatos.pares))
                .replace('{minimo}', String(d.sinDatos.minimo))
            : t('fraude.modelo.esperando')}
        </span>
      </div>
    )
  return (
    <div className={propios.banda}>
      <span className={propios.pildora}>
        <span className={propios.puntoVivo} aria-hidden="true" />
        {t('fraude.modelo.activo')}
      </span>
      <span className={propios.pildora}>
        {t('fraude.modelo.version').replace('{n}', String(m.version))}
      </span>
      <span className={propios.pildora}>
        {t('fraude.modelo.entrenado').replace(
          '{tiempo}',
          formatoRelativo(m.entrenadoEn),
        )}
        {viejo && ` · ${t('fraude.modelo.desactualizado')}`}
      </span>
      <span className={propios.pildora}>
        {t('fraude.modelo.pares').replace('{n}', formatoNumero(m.pares))}
      </span>
      <span className={propios.textoBanda}>{t('fraude.modelo.local')}</span>
    </div>
  )
}

/** Mayor riesgo primero; las alertas sin puntaje van al final, de la más reciente a la más antigua. */
const porRiesgo = (a: AlertaFraude, b: AlertaFraude) =>
  (puntajeDe(b) ?? -1) - (puntajeDe(a) ?? -1) ||
  b.creadoEn.localeCompare(a.creadoEn)

/**
 * HU-26 + PB-11: alertas, bloqueos (solo lectura: vencen solos), inteligencia del modelo propio, desempeño y la
 * decisión del administrador, que no levanta ni crea bloqueos.
 */
export default function AlertasFraude() {
  const { usuario } = useSesion()
  const organizacionId = usuario?.organizacionActiva ?? null
  const organizacion = membresiaActiva(usuario)?.organizacion ?? ''
  const [patron, setPatron] = useState<PatronFraude | ''>('')
  const [alertas, setAlertas] = useState<AlertaFraude[] | null>(null)
  const [siguiente, setSiguiente] = useState<string | undefined>()
  const [bloqueos, setBloqueos] = useState<BloqueoVigente[] | null>(null)
  const [desempeno, setDesempeno] = useState<DesempenoFraude | null>(null)
  const [viejo, setViejo] = useState(false)
  const [falla, setFalla] = useState(false)
  const [sinPermiso, setSinPermiso] = useState(false)
  const [cargandoMas, setCargandoMas] = useState(false)
  const [orden, setOrden] = useState<'reciente' | 'riesgo'>('reciente')
  const [abierta, setAbierta] = useState<string | null>(null)

  const alFallar = useCallback(
    (error: unknown) => {
      if (error instanceof api.ErrorApi && error.estado === 403)
        setSinPermiso(true)
      else setFalla(true)
    },
    [setFalla, setSinPermiso],
  )

  const cargarDesempeno = useCallback(() => {
    // El desempeño es complementario: si falla, el resto de la pantalla sigue.
    api
      .obtenerDesempenoFraude()
      .then((d) => {
        setDesempeno(d)
        setViejo(
          !!d.modelo &&
            Date.now() - new Date(d.modelo.entrenadoEn).getTime() >
              TRES_DIAS_MS,
        )
      })
      .catch(() => setDesempeno(null))
  }, [])

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
  useEffect(() => {
    if (organizacionId) cargarDesempeno()
  }, [organizacionId, cargarDesempeno])

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

  const decidir =
    (alerta: AlertaFraude) =>
    async (decision: DecisionFraude, nota: string) => {
      await api.decidirAlerta(alerta.id, decision, nota)
      const limpia = nota.trim()
      setAlertas((lista) =>
        (lista ?? []).map((a) =>
          a.id === alerta.id
            ? {
                ...a,
                decision: {
                  valor: decision,
                  ...(limpia && { nota: limpia }),
                  autor: usuario?.nombreCompleto ?? '',
                  en: new Date().toISOString(),
                },
              }
            : a,
        ),
      )
      cargarDesempeno()
    }

  const cuentas = (bloqueos ?? []).filter((b) => b.tipo === 'cuenta').length
  const porPatron = PATRONES.map((p) => ({
    etiqueta: t(`fraude.alertas.patron.${p}`),
    valor: (alertas ?? []).filter((a) => a.patron === p).length,
  })).filter((p, i) => i < 3 || p.valor > 0)

  const m = desempeno?.modelo
  const v = desempeno?.validacion
  const deOrigen = (o: string) =>
    desempeno?.porOrigen.find((x) => x.origen === o)

  return (
    <Estructura
      titulo={t('fraude.alertas.titulo')}
      descripcion={t('fraude.alertas.descripcion').replace(
        '{organizacion}',
        () => organizacion,
      )}
      banda={desempeno ? <EstadoModelo d={desempeno} viejo={viejo} /> : true}
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

      {!falla && desempeno && (
        <section
          aria-labelledby="titulo-inteligencia"
          className={propios.inteligencia}
        >
          <div className={propios.cabeceraInteligencia}>
            <span className={propios.iconoInteligencia} aria-hidden="true">
              <Icono nombre="shield" tamano={24} />
            </span>
            <div>
              <h2 id="titulo-inteligencia" className={estilos.titulo}>
                {t('fraude.modelo.titulo')}
              </h2>
              <p className={estilos.textoSeccion}>
                {t('fraude.modelo.descripcion')}
              </p>
            </div>
          </div>
          <Rejilla>
            <Panel
              icono="leaderboard"
              titulo={t('fraude.modelo.histograma_titulo')}
              descripcion={t('fraude.modelo.histograma_texto')}
            >
              {m ? (
                <Histograma tramos={m.histograma} umbral={m.umbral} />
              ) : (
                <p className={estilos.vacio}>
                  {desempeno.sinDatos
                    ? t('fraude.modelo.sin_datos')
                        .replace('{pares}', String(desempeno.sinDatos.pares))
                        .replace('{minimo}', String(desempeno.sinDatos.minimo))
                    : t('fraude.modelo.esperando')}
                </p>
              )}
            </Panel>
            <div className={propios.cifrasModelo}>
              <Cifra
                icono="trending_up"
                tono={
                  m && m.histograma.slice(8).some(Boolean)
                    ? 'peligro'
                    : 'neutro'
                }
                etiqueta={t('fraude.modelo.cifra_sobre')}
                valor={formatoNumero(
                  m
                    ? m.histograma
                        .slice(m.umbral / 10)
                        .reduce((s, x) => s + x, 0)
                    : 0,
                )}
              />
              <Cifra
                icono="groups"
                tono={deOrigen('anillo')?.alertas ? 'peligro' : 'neutro'}
                etiqueta={t('fraude.modelo.cifra_anillos')}
                valor={formatoNumero(deOrigen('anillo')?.alertas ?? 0)}
              />
              <Cifra
                icono="warning"
                tono={deOrigen('modelo')?.alertas ? 'aviso' : 'neutro'}
                etiqueta={t('fraude.modelo.cifra_modelo')}
                valor={formatoNumero(deOrigen('modelo')?.alertas ?? 0)}
              />
              {v && (
                <Cifra
                  icono="verified"
                  tono="exito"
                  etiqueta={t('fraude.modelo.cifra_auc')}
                  valor={v.auc.toLocaleString('es-BO', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                  nota={t('fraude.modelo.cifra_auc_nota').replace(
                    '{n}',
                    formatoNumero(v.escenarios),
                  )}
                />
              )}
            </div>
          </Rejilla>
        </section>
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
                    <Fragment key={a.id}>
                      <tr
                        className={
                          abierta === a.id ? propios.filaAbierta : undefined
                        }
                      >
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
                          <Riesgo
                            alerta={a}
                            abierta={abierta === a.id}
                            alAlternar={() =>
                              setAbierta((x) => (x === a.id ? null : a.id))
                            }
                          />
                        </td>
                      </tr>
                      {abierta === a.id && (
                        <tr className={propios.filaDetalle}>
                          <td colSpan={5}>
                            <DetalleAlerta alerta={a} alDecidir={decidir(a)} />
                          </td>
                        </tr>
                      )}
                    </Fragment>
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

      {!falla && desempeno && (
        <section aria-labelledby="titulo-desempeno" className={estilos.seccion}>
          <div>
            <h2 id="titulo-desempeno" className={estilos.titulo}>
              {t('fraude.desempeno.titulo')}
            </h2>
            <p className={estilos.textoSeccion}>
              {t('fraude.desempeno.descripcion')}
            </p>
          </div>
          <div className={propios.origenes}>
            {desempeno.porOrigen.map((o) => (
              <Panel
                key={o.origen}
                icono={
                  o.origen === 'reglas'
                    ? 'route'
                    : o.origen === 'modelo'
                      ? 'trending_up'
                      : 'groups'
                }
                titulo={t(`fraude.desempeno.origen_${o.origen}`)}
                descripcion={t('fraude.desempeno.n_alertas').replace(
                  '{n}',
                  formatoNumero(o.alertas),
                )}
              >
                <Anillo
                  centro={
                    o.precision === null ? '—' : formatoPorcentaje(o.precision)
                  }
                  etiquetaCentro={
                    o.precision === null
                      ? t('fraude.desempeno.sin_datos')
                      : t('fraude.desempeno.precision')
                  }
                  partes={[
                    {
                      etiqueta: t('fraude.desempeno.confirmadas'),
                      valor: o.confirmadas,
                      texto: formatoNumero(o.confirmadas),
                      tono: 'peligro',
                    },
                    {
                      etiqueta: t('fraude.desempeno.falsos'),
                      valor: o.falsosPositivos,
                      texto: formatoNumero(o.falsosPositivos),
                      tono: 'exito',
                    },
                    {
                      etiqueta: t('fraude.desempeno.sin_decidir'),
                      valor: o.alertas - o.confirmadas - o.falsosPositivos,
                      texto: formatoNumero(
                        o.alertas - o.confirmadas - o.falsosPositivos,
                      ),
                      tono: 'neutro',
                    },
                  ]}
                />
                {o.precision === null && (
                  <p className={estilos.relativo}>
                    {t('fraude.desempeno.sin_datos_nota')}
                  </p>
                )}
              </Panel>
            ))}
          </div>
          {v && (
            <Panel
              icono="verified"
              titulo={t('fraude.desempeno.validacion_titulo')}
              descripcion={t('fraude.desempeno.validacion_texto').replace(
                '{n}',
                formatoNumero(v.escenarios),
              )}
            >
              <div className={propios.validacion}>
                <CurvaRoc
                  puntos={v.roc}
                  operacion={{
                    x: v.falsasAlarmasUmbral,
                    y: v.deteccionUmbral,
                  }}
                />
                <div className={propios.auc}>
                  <span className={propios.etiquetaAuc}>
                    {t('fraude.desempeno.auc')}
                  </span>
                  <span className={propios.valorAuc}>
                    {v.auc.toLocaleString('es-BO', {
                      minimumFractionDigits: 3,
                      maximumFractionDigits: 3,
                    })}
                  </span>
                  <p>
                    {t('fraude.desempeno.deteccion')
                      .replace('{deteccion}', formatoPorcentaje(v.deteccion))
                      .replace('{falsas}', formatoPorcentaje(v.falsasAlarmas))}
                  </p>
                  <p>
                    {t('fraude.desempeno.umbral')
                      .replace(
                        '{deteccion}',
                        formatoPorcentaje(v.deteccionUmbral),
                      )
                      .replace(
                        '{falsas}',
                        formatoPorcentaje(v.falsasAlarmasUmbral),
                      )}
                  </p>
                </div>
              </div>
            </Panel>
          )}
        </section>
      )}
    </Estructura>
  )
}
