import type { ReactNode } from 'react'
import { t } from '../i18n'
import type { NombreIcono } from '../iconos/rutas'
import { Icono } from './Icono'
import estilos from './Estados.module.css'

/** Espera de pantalla completa (recuperar la sesión, abrir una invitación). */
export function Cargando() {
  return (
    <div role="status" className={estilos.cargando}>
      <span className={estilos.indicador} aria-hidden="true" />
      {t('comun.estados.cargando')}
    </div>
  )
}

/** Carga de listas con la forma del contenido (9.1). */
export function Esqueleto({ filas = 3 }: { filas?: number }) {
  return (
    <div role="status" aria-busy="true" className={estilos.esqueleto}>
      <span className="solo-lector">{t('comun.estados.cargando')}</span>
      {Array.from({ length: filas }, (_, i) => (
        <div key={i} className={estilos.filaEsqueleto} aria-hidden="true">
          <span />
          <span />
          <span />
        </div>
      ))}
    </div>
  )
}

/** Escena de trayecto de la marca (8.12): la U, el origen relleno, el anillo de destino y un sello. */
export function Ilustracion({
  icono,
  tono,
}: {
  icono: NombreIcono
  tono: 'primario' | 'exito' | 'aviso' | 'peligro'
}) {
  return (
    <div className={estilos.ilustracion} aria-hidden="true">
      <svg viewBox="0 0 176 160">
        <circle cx="88" cy="84" r="72" className={estilos.fondoIlustracion} />
        <path
          d="M48 40V92a40 40 0 0 0 80 0V62"
          pathLength={1}
          className={estilos.trazo}
        />
        <circle cx="48" cy="40" r="15" className={estilos.origen} />
        <circle cx="128" cy="40" r="11" className={estilos.destino} />
      </svg>
      <span className={`${estilos.sello} ${estilos[tono]}`}>
        <Icono nombre={icono} />
      </span>
    </div>
  )
}

/** Lista sin elementos: por qué está vacía y la acción que la llena (11). */
export function EstadoVacio({
  icono,
  titulo,
  texto,
  accion,
}: {
  icono: NombreIcono
  titulo: string
  texto: string
  accion?: ReactNode
}) {
  return (
    <section className={estilos.vacio}>
      <Ilustracion icono={icono} tono="primario" />
      <h2 className={estilos.tituloVacio}>{titulo}</h2>
      <p className={estilos.textoVacio}>{texto}</p>
      {accion}
    </section>
  )
}
