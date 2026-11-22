import { useState, type CSSProperties } from 'react'
import type { FactorRiesgo, GrafoAnillo } from '../api/cliente'
import { formatoNumero, formatoPorcentaje, iniciales } from '../formato'
import { t } from '../i18n'
import { nivelDe, textoCifra, type NivelRiesgo } from './nivelRiesgo'
import estilos from './Riesgo.module.css'

/**
 * PB-11: visualizaciones del modelo de riesgo, solo con SVG y CSS (sin librerías). El color de riesgo es de estado
 * (bajo / medio / alto) y siempre va con texto; los trazos se animan una vez y respetan `prefers-reduced-motion`.
 */

const TONO: Record<NivelRiesgo, string> = {
  bajo: estilos.bajo,
  medio: estilos.medio,
  alto: estilos.alto,
}

/** Punto de un arco de 180° (de izquierda a derecha) en coordenadas del SVG. */
const enArco = (cx: number, cy: number, r: number, fraccion: number) => {
  const angulo = Math.PI * (1 - fraccion)
  return { x: cx + r * Math.cos(angulo), y: cy - r * Math.sin(angulo) }
}
const arco = (
  cx: number,
  cy: number,
  r: number,
  desde: number,
  hasta: number,
) => {
  const a = enArco(cx, cy, r, desde)
  const b = enArco(cx, cy, r, hasta)
  return `M ${a.x} ${a.y} A ${r} ${r} 0 0 1 ${b.x} ${b.y}`
}

/** Medidor semicircular 0–100 con las tres bandas de riesgo y la aguja en el puntaje. */
export function Medidor({
  puntaje,
  tamano = 'grande',
}: {
  puntaje: number
  tamano?: 'grande' | 'mini'
}) {
  const nivel = nivelDe(puntaje)
  const valor = Math.max(0, Math.min(100, puntaje))
  const cx = 100
  const cy = 100
  const r = 80
  const largo = Math.PI * r
  const aguja = enArco(cx, cy, r - 22, valor / 100)
  const etiqueta = t('fraude.riesgo.medidor_aria')
    .replace('{puntaje}', String(valor))
    .replace('{nivel}', t(`fraude.alertas.analisis.riesgo_${nivel}`))
  return (
    <div
      className={`${estilos.medidor} ${estilos[tamano]} ${TONO[nivel]}`}
      role="img"
      aria-label={etiqueta}
    >
      <svg viewBox="0 0 200 116" aria-hidden="true">
        <path d={arco(cx, cy, r, 0, 0.395)} className={estilos.bandaBajo} />
        <path
          d={arco(cx, cy, r, 0.405, 0.695)}
          className={estilos.bandaMedio}
        />
        <path d={arco(cx, cy, r, 0.705, 1)} className={estilos.bandaAlto} />
        <path
          d={arco(cx, cy, r, 0, 1)}
          className={estilos.relleno}
          style={
            {
              strokeDasharray: largo,
              '--fin': `${largo * (1 - valor / 100)}`,
              '--largo': `${largo}`,
            } as CSSProperties
          }
        />
        {tamano === 'grande' && (
          <>
            <line
              x1={cx}
              y1={cy}
              x2={aguja.x}
              y2={aguja.y}
              className={estilos.aguja}
            />
            <circle cx={cx} cy={cy} r="6" className={estilos.eje} />
          </>
        )}
      </svg>
      <span className={estilos.valorMedidor}>
        <span className={estilos.numero}>{valor}</span>
        {tamano === 'grande' && (
          <span className={estilos.nivel}>
            {t(`fraude.riesgo.nivel_${nivel}`)}
          </span>
        )}
      </span>
    </div>
  )
}

/** Posición del factor dentro de la organización, con la mediana marcada. */
export function BarraPercentil({ factor }: { factor: FactorRiesgo }) {
  const p = Math.max(0, Math.min(100, factor.percentil))
  const alto = p >= 50
  const comparacion = t(
    alto ? 'fraude.riesgo.mas_alto' : 'fraude.riesgo.mas_bajo',
  ).replace('{n}', String(alto ? p : 100 - p))
  return (
    <li className={estilos.factor}>
      <div className={estilos.cabeceraFactor}>
        <span className={estilos.nombreFactor}>
          {textoCifra(factor.cifra, factor.valor)}
        </span>
        <span className={estilos.percentil}>
          {t('fraude.riesgo.percentil').replace('{n}', String(p))}
        </span>
      </div>
      <div
        className={estilos.pistaPercentil}
        role="img"
        aria-label={comparacion}
        style={{ '--p': `${p}%` } as CSSProperties}
      >
        <span className={estilos.mediana} aria-hidden="true" />
        <span className={estilos.marcaPercentil} aria-hidden="true" />
      </div>
      <span className={estilos.comparacion}>{comparacion}</span>
    </li>
  )
}

/** Histograma de puntajes de los pares con la línea del umbral; los tramos sobre el umbral en tono de alerta. */
export function Histograma({
  tramos,
  umbral,
}: {
  tramos: number[]
  umbral: number
}) {
  const [activo, setActivo] = useState<number | null>(null)
  const ancho = 400
  const alto = 180
  const margen = { izq: 32, der: 8, arr: 22, aba: 26 }
  const w = ancho - margen.izq - margen.der
  const h = alto - margen.arr - margen.aba
  const maximo = Math.max(1, ...tramos)
  const paso = w / tramos.length
  const xUmbral = margen.izq + (umbral / 100) * w
  const lineas = [0, 0.5, 1].map((f) => Math.round(maximo * f))
  return (
    <figure className={estilos.grafico}>
      <svg
        viewBox={`0 0 ${ancho} ${alto}`}
        role="img"
        aria-label={t('fraude.modelo.histograma_aria')
          .replace('{n}', String(tramos.reduce((s, x) => s + x, 0)))
          .replace(
            '{sobre}',
            String(
              tramos.slice(Math.floor(umbral / 10)).reduce((s, x) => s + x, 0),
            ),
          )}
        onMouseLeave={() => setActivo(null)}
      >
        {lineas.map((v) => {
          const y = margen.arr + h - (v / maximo) * h
          return (
            <g key={v}>
              <line
                x1={margen.izq}
                x2={ancho - margen.der}
                y1={y}
                y2={y}
                className={estilos.rejilla}
              />
              <text x={margen.izq - 6} y={y + 4} className={estilos.ejeY}>
                {v}
              </text>
            </g>
          )
        })}
        {tramos.map((n, i) => {
          const altoBarra = Math.max(n ? 3 : 0, (n / maximo) * h)
          const x = margen.izq + i * paso + 2
          const sobre = i * 10 >= umbral
          return (
            <g key={i}>
              <rect
                x={x}
                y={margen.arr + h - altoBarra}
                width={paso - 4}
                height={altoBarra}
                rx="4"
                className={`${estilos.barraHisto} ${sobre ? estilos.sobreUmbral : ''} ${activo === i ? estilos.barraActiva : ''}`}
                style={{ animationDelay: `${i * 40}ms` }}
              />
              {/* Objetivo de hover más grande que la barra. */}
              <rect
                x={margen.izq + i * paso}
                y={margen.arr}
                width={paso}
                height={h}
                className={estilos.objetivo}
                onMouseEnter={() => setActivo(i)}
              />
              {i % 2 === 0 && (
                <text
                  x={margen.izq + i * paso}
                  y={alto - 8}
                  className={estilos.ejeX}
                >
                  {i * 10}
                </text>
              )}
            </g>
          )
        })}
        <text x={ancho - margen.der} y={alto - 8} className={estilos.ejeXFin}>
          100
        </text>
        <line
          x1={xUmbral}
          x2={xUmbral}
          y1={margen.arr - 8}
          y2={margen.arr + h}
          className={estilos.lineaUmbral}
        />
        <text
          x={xUmbral - 4}
          y={margen.arr - 10}
          className={estilos.textoUmbral}
        >
          {t('fraude.modelo.umbral').replace('{n}', String(umbral))}
        </text>
      </svg>
      {activo !== null && (
        <div
          className={estilos.tooltip}
          style={
            {
              left: `${((margen.izq + (activo + 0.5) * paso) / ancho) * 100}%`,
            } as CSSProperties
          }
          role="status"
        >
          <strong>
            {t('fraude.modelo.tramo')
              .replace('{desde}', String(activo * 10))
              .replace('{hasta}', String(activo === 9 ? 100 : activo * 10 + 9))}
          </strong>
          <span>
            {t(
              tramos[activo] === 1
                ? 'fraude.modelo.n_pares_uno'
                : 'fraude.modelo.n_pares',
            ).replace('{n}', formatoNumero(tramos[activo]))}
          </span>
        </div>
      )}
      <figcaption className={estilos.leyenda}>
        <span>
          <span className={estilos.muestraNormal} aria-hidden="true" />
          {t('fraude.modelo.leyenda_normal')}
        </span>
        <span>
          <span className={estilos.muestraAlerta} aria-hidden="true" />
          {t('fraude.modelo.leyenda_alerta').replace('{n}', String(umbral))}
        </span>
      </figcaption>
    </figure>
  )
}

/** Curva ROC de la validación simulada, con la diagonal del azar y el punto del umbral del producto. */
export function CurvaRoc({
  puntos,
  operacion,
}: {
  puntos: { x: number; y: number }[]
  operacion: { x: number; y: number }
}) {
  const [activo, setActivo] = useState<number | null>(null)
  const lado = 200
  const m = 28
  const escala = (v: number) => m + v * (lado - m - 8)
  const yDe = (v: number) => lado - m - v * (lado - m - 8)
  const ruta = puntos
    .map((p, i) => `${i ? 'L' : 'M'} ${escala(p.x)} ${yDe(p.y)}`)
    .join(' ')
  const area = `${ruta} L ${escala(1)} ${yDe(0)} L ${escala(0)} ${yDe(0)} Z`
  const actual = activo !== null ? puntos[activo] : null
  return (
    <figure className={estilos.grafico}>
      <svg
        viewBox={`0 0 ${lado} ${lado}`}
        className={estilos.roc}
        role="img"
        aria-label={t('fraude.desempeno.roc_aria')
          .replace('{deteccion}', formatoPorcentaje(operacion.y))
          .replace('{falsas}', formatoPorcentaje(operacion.x))}
        onMouseLeave={() => setActivo(null)}
      >
        {[0, 0.5, 1].map((v) => (
          <g key={v}>
            <line
              x1={escala(0)}
              x2={escala(1)}
              y1={yDe(v)}
              y2={yDe(v)}
              className={estilos.rejilla}
            />
            <text x={m - 4} y={yDe(v) + 3} className={estilos.ejeY}>
              {formatoPorcentaje(v)}
            </text>
          </g>
        ))}
        <line
          x1={escala(0)}
          y1={yDe(0)}
          x2={escala(1)}
          y2={yDe(1)}
          className={estilos.azar}
        />
        <path d={area} className={estilos.areaRoc} />
        <path d={ruta} className={estilos.lineaRoc} pathLength={1} />
        <circle
          cx={escala(operacion.x)}
          cy={yDe(operacion.y)}
          r="5"
          className={estilos.puntoOperacion}
        />
        {puntos.map((p, i) => (
          <circle
            key={i}
            cx={escala(p.x)}
            cy={yDe(p.y)}
            r="9"
            className={estilos.objetivo}
            onMouseEnter={() => setActivo(i)}
          />
        ))}
        {actual && (
          <circle
            cx={escala(actual.x)}
            cy={yDe(actual.y)}
            r="4"
            className={estilos.puntoActivo}
          />
        )}
        <text x={escala(0.5)} y={lado - 4} className={estilos.tituloEje}>
          {t('fraude.desempeno.eje_falsas')}
        </text>
        <text
          x={8}
          y={yDe(0.5)}
          className={estilos.tituloEje}
          transform={`rotate(-90 8 ${yDe(0.5)})`}
        >
          {t('fraude.desempeno.eje_deteccion')}
        </text>
      </svg>
      {actual && (
        <div className={estilos.tooltipFijo} role="status">
          {t('fraude.desempeno.punto_roc')
            .replace('{deteccion}', formatoPorcentaje(actual.y))
            .replace('{falsas}', formatoPorcentaje(actual.x))}
        </div>
      )}
      <figcaption className={estilos.leyenda}>
        <span>
          <span className={estilos.muestraLinea} aria-hidden="true" />
          {t('fraude.desempeno.leyenda_modelo')}
        </span>
        <span>
          <span className={estilos.muestraAzar} aria-hidden="true" />
          {t('fraude.desempeno.leyenda_azar')}
        </span>
        <span>
          <span className={estilos.muestraPunto} aria-hidden="true" />
          {t('fraude.desempeno.leyenda_umbral')}
        </span>
      </figcaption>
    </figure>
  )
}

/** Grafo del anillo: personas en círculo; el grosor de cada unión es la cantidad de viajes entre ellas. */
export function GrafoAnilloVista({ grafo }: { grafo: GrafoAnillo }) {
  const lado = 260
  const c = lado / 2
  const n = grafo.nodos.length
  const r = n <= 3 ? 72 : 90
  const pos = grafo.nodos.map((_, i) => {
    const a = -Math.PI / 2 + (2 * Math.PI * i) / n
    return { x: c + r * Math.cos(a), y: c + r * Math.sin(a) }
  })
  const maximo = Math.max(1, ...grafo.aristas.map((x) => x.viajes))
  return (
    <figure className={estilos.grafo}>
      <svg
        viewBox={`0 0 ${lado} ${lado}`}
        role="img"
        aria-label={t('fraude.anillo.aria')
          .replace('{n}', String(n))
          .replace('{viajes}', String(grafo.viajesInternos))}
      >
        <circle cx={c} cy={c} r={r} className={estilos.orbita} />
        {grafo.aristas.map((x, i) => {
          const a = pos[x.a]
          const b = pos[x.b]
          return (
            <g key={i}>
              <line
                x1={a.x}
                y1={a.y}
                x2={b.x}
                y2={b.y}
                className={estilos.arista}
                style={{ strokeWidth: 1.5 + (x.viajes / maximo) * 5 }}
              />
              <text
                x={(a.x + b.x) / 2}
                y={(a.y + b.y) / 2 + 4}
                className={estilos.viajesArista}
              >
                {x.viajes}
              </text>
            </g>
          )
        })}
        {grafo.nodos.map((nombre, i) => (
          <g
            key={i}
            className={estilos.nodo}
            style={{ animationDelay: `${i * 300}ms` }}
          >
            <title>{nombre}</title>
            <circle
              cx={pos[i].x}
              cy={pos[i].y}
              r="20"
              className={estilos.halo}
            />
            <circle
              cx={pos[i].x}
              cy={pos[i].y}
              r="17"
              className={estilos.circuloNodo}
            />
            <text
              x={pos[i].x}
              y={pos[i].y + 5}
              className={estilos.inicialesNodo}
            >
              {iniciales(nombre)}
            </text>
          </g>
        ))}
      </svg>
      <figcaption className={estilos.leyendaGrafo}>
        <ul>
          {grafo.nodos.map((nombre, i) => (
            <li key={i}>
              <span className={estilos.chipNodo}>{iniciales(nombre)}</span>
              {nombre}
            </li>
          ))}
        </ul>
        <p>
          {t('fraude.anillo.resumen')
            .replace('{viajes}', formatoNumero(grafo.viajesInternos))
            .replace('{proporcion}', formatoPorcentaje(grafo.proporcion))}
        </p>
      </figcaption>
    </figure>
  )
}
