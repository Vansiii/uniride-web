import { useId } from 'react'
import type { CSSProperties, ReactNode } from 'react'
import type { PeriodoResumen } from '../api/cliente'
import { formatoHora, formatoPorcentaje } from '../formato'
import { t } from '../i18n'
import type { NombreIcono } from '../iconos/rutas'
import { Boton } from './Boton'
import { Icono } from './Icono'
import estilos from './Datos.module.css'

export type Tono = 'primario' | 'exito' | 'aviso' | 'peligro' | 'neutro'

/** Cifra clave de un reporte: ícono, etiqueta, valor grande y una nota que la explica. Va dentro de un `<dl>`. */
export function Cifra({
  icono,
  etiqueta,
  valor,
  nota,
  extra,
  tono = 'primario',
}: {
  icono: NombreIcono
  etiqueta: string
  valor: string
  /** Contexto de la cifra («≈ 2 por día»). */
  nota?: ReactNode
  /** Marca junto al valor («Estimado»). */
  extra?: ReactNode
  tono?: Tono
}) {
  return (
    <div className={`${estilos.cifra} ${estilos[tono]}`}>
      <dt className={estilos.etiquetaCifra}>
        <span className={estilos.iconoCifra}>
          <Icono nombre={icono} tamano={20} />
        </span>
        {etiqueta}
      </dt>
      <dd className={estilos.valorCifra}>
        {valor}
        {extra && <span className={estilos.extra}>{extra}</span>}
      </dd>
      {nota && <dd className={estilos.notaCifra}>{nota}</dd>}
    </div>
  )
}

export function Cifras({ children }: { children: ReactNode }) {
  return <dl className={estilos.cifras}>{children}</dl>
}

/** Bloque de un reporte con título e ícono. */
export function Panel({
  icono,
  titulo,
  descripcion,
  accion,
  children,
  ancho = false,
}: {
  icono: NombreIcono
  titulo: string
  descripcion?: string
  accion?: ReactNode
  children: ReactNode
  /** Ocupa las dos columnas de la rejilla. */
  ancho?: boolean
}) {
  const id = useId()
  return (
    <section
      aria-labelledby={id}
      className={`${estilos.panel} ${ancho ? estilos.panelAncho : ''}`}
    >
      <div className={estilos.cabeceraPanel}>
        <span className={estilos.iconoPanel}>
          <Icono nombre={icono} tamano={20} />
        </span>
        <div className={estilos.textosPanel}>
          <h2 id={id} className={estilos.tituloPanel}>
            {titulo}
          </h2>
          {descripcion && (
            <p className={estilos.descripcionPanel}>{descripcion}</p>
          )}
        </div>
        {accion}
      </div>
      {children}
    </section>
  )
}

export function Rejilla({ children }: { children: ReactNode }) {
  return <div className={estilos.rejilla}>{children}</div>
}

const ancho = (fraccion: number): CSSProperties =>
  ({
    '--avance': `${Math.max(0, Math.min(1, fraccion)) * 100}%`,
  }) as CSSProperties

/**
 * Barras horizontales con el motivo de trayecto (3.2): cada barra sale de un punto (origen) y termina en
 * un anillo (destino). La longitud es relativa al mayor valor de la lista.
 */
export function Barras({
  datos,
}: {
  datos: { etiqueta: string; valor: number; texto: string; nota?: string }[]
}) {
  const maximo = Math.max(...datos.map((d) => d.valor), 0)
  return (
    <ul className={estilos.barras}>
      {datos.map((d) => (
        <li key={d.etiqueta} className={estilos.barra}>
          <span className={estilos.etiquetaBarra}>{d.etiqueta}</span>
          <span className={estilos.textoBarra}>
            {d.texto}
            {d.nota && <span className={estilos.notaBarra}>{d.nota}</span>}
          </span>
          <span
            className={estilos.pista}
            style={ancho(maximo ? d.valor / maximo : 0)}
            aria-hidden="true"
          >
            <span className={estilos.relleno} />
          </span>
        </li>
      ))}
    </ul>
  )
}

/** Avance hacia una meta con el motivo de trayecto: el anillo de destino marca el 100 %. */
export function Trayecto({
  fraccion,
  tono = 'primario',
}: {
  fraccion: number
  tono?: Tono
}) {
  return (
    <span
      className={`${estilos.trayecto} ${estilos[tono]}`}
      style={ancho(fraccion)}
      aria-hidden="true"
    >
      <span className={estilos.relleno} />
    </span>
  )
}

/** Anillo de partes de un todo con leyenda; el centro muestra la parte principal. */
export function Anillo({
  partes,
  centro,
  etiquetaCentro,
}: {
  partes: { etiqueta: string; valor: number; texto: string; tono: Tono }[]
  centro: string
  etiquetaCentro: string
}) {
  const total = partes.reduce((s, p) => s + p.valor, 0)
  const radio = 52
  const circunferencia = 2 * Math.PI * radio
  let acumulado = 0
  return (
    <div className={estilos.anillo}>
      <div className={estilos.graficoAnillo}>
        <svg viewBox="0 0 128 128" aria-hidden="true">
          <circle cx="64" cy="64" r={radio} className={estilos.fondoAnillo} />
          {total > 0 &&
            partes.map((p) => {
              const largo = (p.valor / total) * circunferencia
              const segmento = (
                <circle
                  key={p.etiqueta}
                  cx="64"
                  cy="64"
                  r={radio}
                  className={`${estilos.segmento} ${estilos[p.tono]}`}
                  strokeDasharray={`${largo} ${circunferencia - largo}`}
                  strokeDashoffset={-acumulado}
                />
              )
              acumulado += largo
              return segmento
            })}
        </svg>
        <span className={estilos.centroAnillo}>
          <span className={estilos.valorCentro}>{centro}</span>
          <span className={estilos.etiquetaCentro}>{etiquetaCentro}</span>
        </span>
      </div>
      <ul className={estilos.leyenda}>
        {partes.map((p) => (
          <li key={p.etiqueta} className={estilos[p.tono]}>
            <span className={estilos.muestra} aria-hidden="true" />
            <span className={estilos.etiquetaLeyenda}>{p.etiqueta}</span>
            <span className={estilos.valorLeyenda}>
              {p.texto}
              <span className={estilos.notaBarra}>
                {formatoPorcentaje(total ? p.valor / total : 0)}
              </span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}

const PERIODOS: PeriodoResumen[] = ['7d', '30d', 'todo']

/** Barra de herramientas de un reporte: período, hora de los datos y descarga. */
export function BarraReporte({
  periodo,
  alCambiar,
  actualizado,
  alDescargar,
}: {
  periodo: PeriodoResumen
  alCambiar: (p: PeriodoResumen) => void
  actualizado?: Date
  alDescargar?: () => void
}) {
  return (
    <div className={estilos.barraReporte}>
      <div
        className={estilos.periodos}
        role="group"
        aria-label={t('comun.datos.periodo')}
      >
        {PERIODOS.map((p) => (
          <button
            key={p}
            type="button"
            className={estilos.chip}
            aria-pressed={p === periodo}
            onClick={() => alCambiar(p)}
          >
            {t(`comun.datos.periodo_${p}`)}
          </button>
        ))}
      </div>
      <div className={estilos.herramientas}>
        {actualizado && (
          <span className={estilos.actualizado}>
            <Icono nombre="history" tamano={16} />
            {t('comun.datos.actualizado').replace(
              '{hora}',
              formatoHora(actualizado),
            )}
          </span>
        )}
        {alDescargar && (
          <Boton
            variante="secundario"
            tamano="compacto"
            icono="download"
            etiqueta={t('comun.datos.descargar')}
            onClick={alDescargar}
          />
        )}
      </div>
    </div>
  )
}

/** Filtro de texto de una lista; filtra en el cliente lo ya cargado. */
export function Buscador({
  etiqueta,
  valor,
  alCambiar,
}: {
  etiqueta: string
  valor: string
  alCambiar: (valor: string) => void
}) {
  return (
    <label className={estilos.buscador}>
      <Icono nombre="search" tamano={20} />
      <span className="solo-lector">{etiqueta}</span>
      <input
        type="search"
        value={valor}
        placeholder={etiqueta}
        onChange={(e) => alCambiar(e.target.value)}
      />
    </label>
  )
}

/** Carga con la forma de las cifras (9.1). */
export function EsqueletoCifras({ cantidad = 4 }: { cantidad?: number }) {
  return (
    <div role="status" aria-busy="true" className={estilos.cifras}>
      <span className="solo-lector">{t('comun.estados.cargando')}</span>
      {Array.from({ length: cantidad }, (_, i) => (
        <span key={i} className={estilos.cifraEsqueleto} aria-hidden="true" />
      ))}
    </div>
  )
}
