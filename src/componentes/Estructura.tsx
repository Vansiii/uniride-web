import { useState } from 'react'
import type { ReactNode } from 'react'
import { NavLink } from 'react-router-dom'
import { useSesion } from '../app/useSesion'
import { t } from '../i18n'
import { Boton } from './Boton'
import estilos from './Estructura.module.css'

interface Props {
  titulo: string
  descripcion?: string
  children: ReactNode
}

/** Estructura del panel (DESIGN_SYSTEM §5.2): barra lateral fija en amplio, menú desplegable en compacto. */
export function Estructura({ titulo, descripcion, children }: Props) {
  const { usuario, cerrar } = useSesion()
  const [abierto, setAbierto] = useState(false)
  return (
    <div className={estilos.raiz}>
      <header className={estilos.barra}>
        <img
          src="/firma.svg"
          alt={t('aplicacion.nombre')}
          className={estilos.logoBarra}
        />
        <button
          type="button"
          className={estilos.menu}
          aria-expanded={abierto}
          aria-controls="navegacion"
          onClick={() => setAbierto(!abierto)}
        >
          {t(abierto ? 'navegacion.cerrar_menu' : 'navegacion.abrir_menu')}
        </button>
      </header>
      <nav
        id="navegacion"
        aria-label={t('navegacion.principal')}
        className={`${estilos.lateral} ${abierto ? estilos.abierto : ''}`}
      >
        <img src="/firma.svg" alt="" className={estilos.logoLateral} />
        <ul className={estilos.lista}>
          <li>
            <NavLink to="/" end className={estilos.enlace}>
              {t('navegacion.inicio')}
            </NavLink>
          </li>
          {usuario?.rolPlataforma === 'super_admin' && (
            <li>
              <NavLink to="/organizaciones" className={estilos.enlace}>
                {t('navegacion.organizaciones')}
              </NavLink>
            </li>
          )}
          {/* ponytail: sin `membresias` (HU-05) no se sabe el rol; el servidor responde 403 a quien no administra y la pantalla lo devuelve al inicio. */}
          {usuario?.rolPlataforma !== 'super_admin' &&
            usuario?.organizacionActiva && (
              <li>
                <NavLink
                  to="/organizacion/afiliacion"
                  className={estilos.enlace}
                >
                  {t('navegacion.afiliacion')}
                </NavLink>
              </li>
            )}
        </ul>
        <div className={estilos.persona}>
          <span className={estilos.nombre}>{usuario?.nombreCompleto}</span>
          <span className={estilos.correo}>{usuario?.correo}</span>
          <Boton
            variante="secundario"
            etiqueta={t('autenticacion.sesion.salir')}
            onClick={cerrar}
          />
        </div>
      </nav>
      <main className={estilos.contenido}>
        <div className={estilos.pagina}>
          <h1 className={estilos.titulo}>{titulo}</h1>
          {descripcion && <p className={estilos.descripcion}>{descripcion}</p>}
          {children}
        </div>
      </main>
    </div>
  )
}
