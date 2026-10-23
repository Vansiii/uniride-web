import type { ButtonHTMLAttributes, ComponentProps } from 'react'
import { Link } from 'react-router-dom'
import type { NombreIcono } from '../iconos/rutas'
import { Icono } from './Icono'
import estilos from './Boton.module.css'

interface Props extends Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  'children'
> {
  /** Texto ya traducido con t(). */
  etiqueta: string
  variante?: 'primario' | 'secundario' | 'texto' | 'peligro'
  tamano?: 'normal' | 'compacto'
  icono?: NombreIcono
  /** Bloquea toques repetidos; `etiqueta` debe venir en gerundio ("Entrando…"). */
  cargando?: boolean
  anchoCompleto?: boolean
  /** Si se indica, navega (se dibuja como enlace con apariencia de botón). */
  hacia?: string
}

export function Boton({
  etiqueta,
  variante = 'primario',
  tamano = 'normal',
  icono,
  cargando = false,
  anchoCompleto = false,
  hacia,
  disabled,
  className = '',
  ...resto
}: Props) {
  const clases = `${estilos.boton} ${estilos[variante]} ${estilos[tamano]} ${anchoCompleto ? estilos.completo : ''} ${className}`
  const contenido = (
    <>
      {cargando ? (
        <span className={estilos.indicador} aria-hidden="true" />
      ) : (
        icono && <Icono nombre={icono} tamano={20} />
      )}
      {etiqueta}
    </>
  )
  if (hacia)
    return (
      <Link to={hacia} className={clases}>
        {contenido}
      </Link>
    )
  return (
    <button
      type="button"
      {...resto}
      disabled={disabled || cargando}
      aria-busy={cargando || undefined}
      className={clases}
    >
      {contenido}
    </button>
  )
}

interface PropsIcono extends Omit<ComponentProps<'button'>, 'children'> {
  icono: NombreIcono
  /** Nombre accesible obligatorio: el ícono solo no se explica. */
  etiqueta: string
}

/** Acción con solo ícono (mostrar contraseña, menú, cerrar). */
export function BotonIcono({
  icono,
  etiqueta,
  className = '',
  ...resto
}: PropsIcono) {
  return (
    <button
      type="button"
      aria-label={etiqueta}
      title={etiqueta}
      {...resto}
      className={`${estilos.icono} ${className}`}
    >
      <Icono nombre={icono} />
    </button>
  )
}
