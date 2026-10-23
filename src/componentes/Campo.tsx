import { useId, useState } from 'react'
import type { InputHTMLAttributes } from 'react'
import { t } from '../i18n'
import { BotonIcono } from './Boton'
import { Icono } from './Icono'
import estilos from './Campo.module.css'

interface Props extends InputHTMLAttributes<HTMLInputElement> {
  /** La etiqueta siempre es visible; nunca se reemplaza por el placeholder. */
  etiqueta: string
  ayuda?: string
  error?: string
  /** Unidad al final de la caja ("URC"). */
  sufijo?: string
}

/** Campo de texto (8.4). Con `type="password"` agrega el botón Mostrar/Ocultar contraseña. */
export function Campo({
  etiqueta,
  ayuda,
  error,
  sufijo,
  type,
  className = '',
  ...resto
}: Props) {
  const id = useId()
  const idTexto = `${id}-texto`
  const [ver, setVer] = useState(false)
  const contrasena = type === 'password'
  return (
    <div className={`${estilos.campo} ${className}`}>
      <label htmlFor={id} className={estilos.etiqueta}>
        {etiqueta}
      </label>
      <div className={`${estilos.caja} ${error ? estilos.conError : ''}`}>
        <input
          {...resto}
          id={id}
          type={contrasena && ver ? 'text' : type}
          className={estilos.entrada}
          aria-invalid={error ? true : undefined}
          aria-describedby={error || ayuda ? idTexto : undefined}
        />
        {sufijo && (
          <span className={estilos.sufijo} aria-hidden="true">
            {sufijo}
          </span>
        )}
        {contrasena && (
          <BotonIcono
            icono={ver ? 'visibility_off' : 'visibility'}
            etiqueta={t(
              ver
                ? 'autenticacion.sesion.ocultar_contrasena'
                : 'autenticacion.sesion.mostrar_contrasena',
            )}
            aria-pressed={ver}
            className={estilos.accion}
            onClick={() => setVer(!ver)}
          />
        )}
      </div>
      {(error || ayuda) && (
        <p id={idTexto} className={error ? estilos.error : estilos.ayuda}>
          {error && <Icono nombre="error" tamano={16} />}
          {error ?? ayuda}
        </p>
      )}
    </div>
  )
}
