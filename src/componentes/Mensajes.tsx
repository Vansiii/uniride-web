import { useEffect, useId, useRef } from 'react'
import type { ReactNode } from 'react'
import { t } from '../i18n'
import type { NombreIcono } from '../iconos/rutas'
import { Boton, BotonIcono } from './Boton'
import { Icono } from './Icono'
import estilos from './Mensajes.module.css'

type Tono = 'info' | 'exito' | 'aviso' | 'peligro'
const iconoDe: Record<Tono, NombreIcono> = {
  info: 'info',
  exito: 'check_circle',
  aviso: 'warning',
  peligro: 'error',
}

interface PropsAviso {
  tono: Tono
  titulo?: string
  children: ReactNode
  /** Acción opcional de bajo énfasis ("Reintentar"). */
  accion?: { etiqueta: string; alPresionar: () => void }
  /** `alert` para errores que la persona debe atender ya. */
  rol?: 'alert' | 'status'
}

/** Mensaje persistente en contexto (8.6). */
export function Aviso({ tono, titulo, children, accion, rol }: PropsAviso) {
  return (
    <div role={rol} className={`${estilos.mensaje} ${estilos[`t_${tono}`]}`}>
      <Icono
        nombre={iconoDe[tono]}
        tamano={20}
        className={estilos.iconoAviso}
      />
      <div className={estilos.cuerpo}>
        {titulo && <p className={estilos.tituloAviso}>{titulo}</p>}
        <p>{children}</p>
        {accion && (
          <Boton
            variante="texto"
            tamano="compacto"
            etiqueta={accion.etiqueta}
            onClick={accion.alPresionar}
            className={estilos.accionAviso}
          />
        )}
      </div>
    </div>
  )
}

/**
 * Confirmación temporal de una acción terminada (8.6): 4 s, se puede cerrar. Nunca para errores.
 * La región viva queda siempre montada para que el lector de pantalla anuncie cada mensaje nuevo.
 */
export function Notificacion({
  mensaje,
  alCerrar,
}: {
  mensaje: string | null
  /** El `set` del estado que guarda el mensaje (estable entre renders). */
  alCerrar: (vacio: null) => void
}) {
  useEffect(() => {
    if (!mensaje) return
    const id = setTimeout(() => alCerrar(null), 4000)
    return () => clearTimeout(id)
  }, [mensaje, alCerrar])
  return (
    <div role="status" className={estilos.regionNotificacion}>
      {mensaje && (
        <div className={estilos.notificacion}>
          <Icono nombre="check_circle" tamano={20} />
          <span>{mensaje}</span>
          <BotonIcono
            icono="close"
            etiqueta={t('comun.acciones.cerrar')}
            className={estilos.cerrarNotificacion}
            onClick={() => alCerrar(null)}
          />
        </div>
      )}
    </div>
  )
}

type TonoEstado = 'neutro' | 'primario' | 'exito' | 'aviso' | 'peligro'
const estados: Record<string, [TonoEstado, NombreIcono]> = {
  'organizacion.activa': ['exito', 'check_circle'],
  'invitacion.pendiente': ['neutro', 'hourglass_top'],
  'invitacion.enviada': ['primario', 'send'],
  'invitacion.aceptada': ['exito', 'check_circle'],
  'invitacion.no_enviada': ['peligro', 'error'],
  'invitacion.vencida': ['aviso', 'schedule'],
}

/** Estado con tono, ícono y texto (8.3, 4.1.2). Un estado nuevo se agrega solo en `estados`. */
export function EtiquetaEstado({
  dominio,
  estado,
  texto,
}: {
  dominio: 'organizacion' | 'invitacion'
  estado: string
  /** Texto visible ya traducido. */
  texto: string
}) {
  const [tono, icono] = estados[`${dominio}.${estado}`] ?? ['neutro', 'info']
  return (
    <span className={`${estilos.etiqueta} ${estilos[`e_${tono}`]}`}>
      <Icono nombre={icono} tamano={16} />
      {texto}
    </span>
  )
}

interface PropsDialogo {
  abierto: boolean
  /** Pregunta: "¿Descartar los cambios?". */
  titulo: string
  texto: string
  /** Verbo de la acción que confirma (13.3). */
  confirmar: string
  alConfirmar: () => void
  /** Volver, Esc o tocar fuera: no cambia nada. */
  alVolver: () => void
}

/** Decisión irreversible (8.6) con `<dialog>` nativo: foco atrapado y Esc sin código extra. */
export function Dialogo({
  abierto,
  titulo,
  texto,
  confirmar,
  alConfirmar,
  alVolver,
}: PropsDialogo) {
  const ref = useRef<HTMLDialogElement>(null)
  const id = useId()
  useEffect(() => {
    const d = ref.current
    if (!d) return
    if (abierto && !d.open) d.showModal?.()
    if (!abierto && d.open) d.close()
  }, [abierto])
  return (
    <dialog
      ref={ref}
      aria-labelledby={`${id}-titulo`}
      aria-describedby={`${id}-texto`}
      className={estilos.dialogo}
      onClose={alVolver}
      onClick={(e) => e.target === ref.current && alVolver()}
    >
      <div className={estilos.contenidoDialogo}>
        <h2 id={`${id}-titulo`} className={estilos.tituloDialogo}>
          {titulo}
        </h2>
        <p id={`${id}-texto`} className={estilos.textoDialogo}>
          {texto}
        </p>
        <div className={estilos.accionesDialogo}>
          <Boton
            variante="texto"
            etiqueta={t('comun.acciones.volver')}
            onClick={alVolver}
            autoFocus
          />
          <Boton
            variante="peligro"
            etiqueta={confirmar}
            onClick={alConfirmar}
          />
        </div>
      </div>
    </dialog>
  )
}
