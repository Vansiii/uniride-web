import type { ReactNode } from 'react'
import { useTituloDocumento } from '../app/useTituloDocumento'
import { t } from '../i18n'
import type { NombreIcono } from '../iconos/rutas'
import { Icono } from './Icono'
import estilos from './Acceso.module.css'

interface Props {
  /** Título de la pestaña del navegador. */
  tituloDocumento: string
  /** Frase grande del panel de marca. */
  titular: string
  puntos?: { icono: NombreIcono; texto: string }[]
  children: ReactNode
}

/** Pantalla de acceso (inicio de sesión, invitación): panel de marca (3.5) + formulario. */
export function PantallaAcceso({
  tituloDocumento,
  titular,
  puntos = [],
  children,
}: Props) {
  useTituloDocumento(tituloDocumento)
  return (
    <div className={estilos.dividida}>
      <aside className={estilos.marca}>
        <svg
          viewBox="0 0 48 48"
          className={estilos.decoracion}
          aria-hidden="true"
        >
          <path d="M14 13.5V27.5a10 10 0 0 0 20 0V18" />
          <circle cx="34" cy="13.5" r="4.5" />
        </svg>
        <img
          src="/firma-blanco.svg"
          alt={t('aplicacion.nombre')}
          width={170}
          height={32}
          className={estilos.logo}
        />
        <p className={estilos.titular}>{titular}</p>
        {puntos.length > 0 && (
          <ul className={estilos.puntos}>
            {puntos.map((p) => (
              <li key={p.texto}>
                <span className={estilos.iconoPunto}>
                  <Icono nombre={p.icono} tamano={20} />
                </span>
                {p.texto}
              </li>
            ))}
          </ul>
        )}
      </aside>
      <main className={estilos.lado}>
        <div className={estilos.formulario}>{children}</div>
      </main>
    </div>
  )
}

/** Pantalla pública centrada para mensajes sin formulario (invitación no válida). */
export function PantallaPublica({
  tituloDocumento,
  children,
}: {
  tituloDocumento: string
  children: ReactNode
}) {
  useTituloDocumento(tituloDocumento)
  return (
    <main className={estilos.publica}>
      <img
        src="/firma.svg"
        alt={t('aplicacion.nombre')}
        width={128}
        height={24}
        className={estilos.logoPublica}
      />
      <div className={estilos.tarjetaPublica}>{children}</div>
    </main>
  )
}
