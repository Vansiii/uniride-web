import { useCallback, useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import * as api from '../../api/cliente'
import type {
  AlertaFraude,
  BloqueoVigente,
  PatronFraude,
  PersonaAlerta,
} from '../../api/cliente'
import { membresiaActiva } from '../../app/membresia'
import { useSesion } from '../../app/useSesion'
import { Boton } from '../../componentes/Boton'
import { Estructura } from '../../componentes/Estructura'
import { t } from '../../i18n'
import estilos from './Solicitudes.module.css'

const PATRONES: PatronFraude[] = [
  'viajes_repetidos',
  'sin_desplazamiento',
  'verificaciones_fallidas',
]

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

  const alFallar = useCallback((error: unknown) => {
    if (error instanceof api.ErrorApi && error.estado === 403)
      setSinPermiso(true)
    else setFalla(true)
  }, [setFalla, setSinPermiso])

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
        <p role="status">{t('comun.estados.cargando')}</p>
      )}

      {!falla && bloqueos && (
        <section aria-labelledby="titulo-bloqueos">
          <h2 id="titulo-bloqueos">{t('fraude.alertas.bloqueos_titulo')}</h2>
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
                      <td>{t(`fraude.alertas.patron.${b.patron}`)}</td>
                      <td>{personas(b.personas)}</td>
                      <td className={estilos.fecha}>
                        {formatearFecha(b.hasta)}
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
        <section aria-labelledby="titulo-alertas">
          <h2 id="titulo-alertas">{t('fraude.alertas.alertas_titulo')}</h2>
          <label>
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
                  </tr>
                </thead>
                <tbody>
                  {alertas.map((a) => (
                    <tr key={a.id}>
                      <th scope="row" className={estilos.fecha}>
                        {formatearFecha(a.creadoEn)}
                      </th>
                      <td>{t(`fraude.alertas.patron.${a.patron}`)}</td>
                      <td>{personas(a.personas)}</td>
                      <td>{detalle(a)}</td>
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
