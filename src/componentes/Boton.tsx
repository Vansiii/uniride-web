import type { ButtonHTMLAttributes } from 'react'
import estilos from './Boton.module.css'

interface Props extends Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  'children'
> {
  /** Texto ya traducido con t(). */
  etiqueta: string
  /** `peligro` solo para el botón que confirma una destrucción dentro de un `Dialogo`. */
  variante?: 'primario' | 'secundario' | 'texto' | 'peligro'
  /** Bloquea toques repetidos; `etiqueta` debe venir en gerundio ("Entrando…"). */
  cargando?: boolean
  anchoCompleto?: boolean
}

export function Boton({
  etiqueta,
  variante = 'primario',
  cargando = false,
  anchoCompleto = false,
  disabled,
  ...resto
}: Props) {
  return (
    <button
      type="button"
      {...resto}
      disabled={disabled || cargando}
      aria-busy={cargando || undefined}
      className={`${estilos.boton} ${estilos[variante]} ${anchoCompleto ? estilos.completo : ''}`}
    >
      {etiqueta}
    </button>
  )
}
