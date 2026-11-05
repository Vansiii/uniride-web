import { useEffect, useId, useRef } from 'react'
import type { ReactNode } from 'react'
import estilos from './Dialogo.module.css'

interface Props {
  /** Pregunta ya traducida con t(). */
  titulo: string
  /** Se llama al cerrar con `Esc` o tocando la superposición: equivale a «Volver». */
  alCerrar: () => void
  children: ReactNode
}

/** Diálogo modal para decisiones irreversibles (DESIGN_SYSTEM §8.6): `<dialog>` nativo, con foco atrapado y `Esc`. */
export function Dialogo({ titulo, alCerrar, children }: Props) {
  const dialogo = useRef<HTMLDialogElement>(null)
  const idTitulo = useId()

  useEffect(() => {
    const d = dialogo.current
    if (!d) return
    const origen = document.activeElement as HTMLElement | null
    // jsdom no implementa showModal; en navegadores reales siempre existe.
    if (typeof d.showModal === 'function') d.showModal()
    else d.setAttribute('open', '')
    // Al cerrar, el foco vuelve al botón que lo abrió (si sigue en la página).
    return () => {
      if (typeof d.close === 'function') d.close()
      origen?.focus()
    }
  }, [])

  return (
    <dialog
      ref={dialogo}
      className={estilos.dialogo}
      aria-labelledby={idTitulo}
      onCancel={(e) => {
        e.preventDefault()
        alCerrar()
      }}
      onClick={(e) => e.target === e.currentTarget && alCerrar()}
    >
      <div className={estilos.contenido}>
        <h2 id={idTitulo} className={estilos.titulo}>
          {titulo}
        </h2>
        {children}
      </div>
    </dialog>
  )
}
