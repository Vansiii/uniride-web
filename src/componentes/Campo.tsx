import { useId } from 'react'
import type { InputHTMLAttributes, Ref } from 'react'
import estilos from './Campo.module.css'

interface Props extends InputHTMLAttributes<HTMLInputElement> {
  /** Para devolver el foco al campo después de una acción (React 19 pasa `ref` como prop). */
  ref?: Ref<HTMLInputElement>
  /** La etiqueta siempre es visible; nunca se reemplaza por el placeholder. */
  etiqueta: string
  ayuda?: string
  error?: string
}

export function Campo({ etiqueta, ayuda, error, ...resto }: Props) {
  const id = useId()
  const idTexto = `${id}-texto`
  return (
    <div className={estilos.campo}>
      <label htmlFor={id} className={estilos.etiqueta}>
        {etiqueta}
      </label>
      <input
        {...resto}
        id={id}
        className={`${estilos.caja} ${error ? estilos.conError : ''}`}
        aria-invalid={error ? true : undefined}
        aria-describedby={error || ayuda ? idTexto : undefined}
      />
      {(error || ayuda) && (
        <p id={idTexto} className={error ? estilos.error : estilos.ayuda}>
          {error ?? ayuda}
        </p>
      )}
    </div>
  )
}
