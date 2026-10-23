import { useEffect, useRef, useState } from 'react'
import type { MouseEvent, ReactNode } from 'react'
import { Link, NavLink } from 'react-router-dom'
import { useSesion } from '../app/useSesion'
import { useTituloDocumento } from '../app/useTituloDocumento'
import { iniciales } from '../formato'
import { t } from '../i18n'
import type { NombreIcono } from '../iconos/rutas'
import { BotonIcono } from './Boton'
import { Icono } from './Icono'
import estilos from './Estructura.module.css'

interface Props {
  titulo: string
  descripcion?: string
  /** Acción primaria de la página, a la derecha del título (N8). */
  accion?: ReactNode
  /** Enlace para subir un nivel ("← Organizaciones"). */
  miga?: {
    hacia: string
    etiqueta: string
    /** Permite interceptar la salida (formulario con cambios sin guardar). */
    alPresionar?: (e: MouseEvent) => void
  }
  children: ReactNode
}

function Enlace({
  hacia,
  icono,
  etiqueta,
  alNavegar,
}: {
  hacia: string
  icono: NombreIcono
  etiqueta: string
  alNavegar: () => void
}) {
  return (
    <li>
      <NavLink
        to={hacia}
        end={hacia === '/'}
        className={estilos.enlace}
        onClick={alNavegar}
      >
        {({ isActive }) => (
          <>
            <Icono
              nombre={isActive ? (`${icono}_relleno` as NombreIcono) : icono}
              tamano={20}
            />
            {etiqueta}
          </>
        )}
      </NavLink>
    </li>
  )
}

/** Estructura del panel (DESIGN_SYSTEM §5.2): barra lateral fija en amplio, menú desplegable en compacto y medio. */
export function Estructura({
  titulo,
  descripcion,
  accion,
  miga,
  children,
}: Props) {
  const { usuario, cerrar } = useSesion()
  const [abierto, setAbierto] = useState(false)
  const botonMenu = useRef<HTMLButtonElement>(null)
  useTituloDocumento(titulo)

  useEffect(() => {
    if (!abierto) return
    const alTeclear = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      setAbierto(false)
      botonMenu.current?.focus()
    }
    document.addEventListener('keydown', alTeclear)
    return () => document.removeEventListener('keydown', alTeclear)
  }, [abierto])

  const cerrarMenu = () => setAbierto(false)
  const nombre = usuario?.nombreCompleto ?? ''

  return (
    <div className={estilos.raiz}>
      <a href="#contenido" className={estilos.saltar}>
        {t('navegacion.saltar')}
      </a>
      <header className={estilos.barra}>
        <img
          src="/firma.svg"
          alt={t('aplicacion.nombre')}
          width={128}
          height={24}
          className={estilos.logoBarra}
        />
        <BotonIcono
          ref={botonMenu}
          icono={abierto ? 'close' : 'menu'}
          etiqueta={t(
            abierto ? 'navegacion.cerrar_menu' : 'navegacion.abrir_menu',
          )}
          aria-expanded={abierto}
          aria-controls="navegacion"
          onClick={() => setAbierto(!abierto)}
        />
      </header>
      <div
        className={`${estilos.velo} ${abierto ? estilos.veloVisible : ''}`}
        aria-hidden="true"
        onClick={cerrarMenu}
      />
      <nav
        id="navegacion"
        aria-label={t('navegacion.principal')}
        className={`${estilos.lateral} ${abierto ? estilos.abierto : ''}`}
      >
        <svg
          viewBox="0 0 48 48"
          className={estilos.decoracion}
          aria-hidden="true"
        >
          <path d="M14 13.5V27.5a10 10 0 0 0 20 0V18" />
          <circle cx="34" cy="13.5" r="4.5" />
        </svg>
        <Link to="/" className={estilos.logoLateral} onClick={cerrarMenu}>
          <img
            src="/firma-blanco.svg"
            alt={t('aplicacion.nombre')}
            width={150}
            height={28}
          />
        </Link>
        <ul className={estilos.lista}>
          <Enlace
            hacia="/"
            icono="home"
            etiqueta={t('navegacion.inicio')}
            alNavegar={cerrarMenu}
          />
        </ul>
        {usuario?.rolPlataforma === 'super_admin' && (
          <>
            <p className={estilos.grupo} id="grupo-plataforma">
              {t('navegacion.grupo_plataforma')}
            </p>
            <ul className={estilos.lista} aria-labelledby="grupo-plataforma">
              <Enlace
                hacia="/organizaciones"
                icono="corporate_fare"
                etiqueta={t('navegacion.organizaciones')}
                alNavegar={cerrarMenu}
              />
            </ul>
          </>
        )}
        <div className={estilos.persona}>
          <span className={estilos.avatar} aria-hidden="true">
            {iniciales(nombre)}
          </span>
          <span className={estilos.datosPersona}>
            <span className={estilos.nombre}>{nombre}</span>
            <span className={estilos.correo}>{usuario?.correo}</span>
          </span>
          <button type="button" className={estilos.salir} onClick={cerrar}>
            <Icono nombre="logout" tamano={20} />
            {t('autenticacion.sesion.salir')}
          </button>
        </div>
      </nav>
      <main id="contenido" tabIndex={-1} className={estilos.contenido}>
        <div className={estilos.pagina}>
          {miga && (
            <Link
              to={miga.hacia}
              className={estilos.miga}
              onClick={miga.alPresionar}
            >
              <Icono nombre="arrow_back" tamano={20} />
              {miga.etiqueta}
            </Link>
          )}
          <div className={estilos.cabecera}>
            <div className={estilos.textosCabecera}>
              <h1 className={estilos.titulo}>{titulo}</h1>
              {descripcion && (
                <p className={estilos.descripcion}>{descripcion}</p>
              )}
            </div>
            {accion}
          </div>
          {children}
        </div>
      </main>
    </div>
  )
}
