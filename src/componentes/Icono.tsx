import { rutas } from '../iconos/rutas'
import type { NombreIcono } from '../iconos/rutas'

interface Props {
  nombre: NombreIcono
  /** 16–20 en línea con texto, 24 por defecto, 48 en estados vacíos (4.4). */
  tamano?: 16 | 20 | 24 | 48
  className?: string
}

/** Material Symbols como SVG (4.8). Siempre decorativo: el texto o el `aria-label` del control dan el significado. */
export function Icono({ nombre, tamano = 24, className }: Props) {
  return (
    <svg
      viewBox="0 -960 960 960"
      width={tamano}
      height={tamano}
      fill="currentColor"
      aria-hidden="true"
      focusable="false"
      className={className}
      style={{ flex: 'none' }}
    >
      <path d={rutas[nombre]} />
    </svg>
  )
}
