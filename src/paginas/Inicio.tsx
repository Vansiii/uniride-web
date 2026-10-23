import { Link } from 'react-router-dom'
import { useSesion } from '../app/useSesion'
import { Estructura } from '../componentes/Estructura'
import { Icono } from '../componentes/Icono'
import { iniciales } from '../formato'
import { t } from '../i18n'
import estilos from './Inicio.module.css'

// ponytail: las secciones del panel de organización (HU-02, HU-03) se agregan como accesos aquí y en la barra lateral.
export default function Inicio() {
  const { usuario } = useSesion()
  const nombre = usuario?.nombreCompleto ?? ''
  const superAdmin = usuario?.rolPlataforma === 'super_admin'
  return (
    <Estructura
      titulo={t('panel.inicio.titulo').replace('{nombre}', nombre)}
      descripcion={t('panel.inicio.descripcion')}
    >
      <div className={estilos.rejilla}>
        <section className={estilos.tarjeta} aria-labelledby="titulo-cuenta">
          <div className={estilos.persona}>
            <span className={estilos.avatar} aria-hidden="true">
              {iniciales(nombre)}
            </span>
            <h2 id="titulo-cuenta" className={estilos.subtitulo}>
              {t('panel.inicio.cuenta')}
            </h2>
          </div>
          <dl className={estilos.datos}>
            <dt>{t('panel.inicio.nombre')}</dt>
            <dd>{nombre}</dd>
            <dt>{t('panel.inicio.correo')}</dt>
            <dd>{usuario?.correo}</dd>
            <dt>{t('panel.inicio.rol')}</dt>
            <dd>
              <span className={estilos.etiqueta}>
                {t(
                  superAdmin
                    ? 'panel.inicio.rol_super_admin'
                    : 'panel.inicio.rol_miembro',
                )}
              </span>
            </dd>
          </dl>
        </section>
        {superAdmin && (
          <section aria-labelledby="titulo-accesos" className={estilos.accesos}>
            <h2 id="titulo-accesos" className={estilos.subtitulo}>
              {t('panel.inicio.accesos')}
            </h2>
            <Link to="/organizaciones" className={estilos.acceso}>
              <span className={estilos.iconoAcceso}>
                <Icono nombre="corporate_fare" />
              </span>
              <span className={estilos.textoAcceso}>
                <span className={estilos.nombreAcceso}>
                  {t('navegacion.organizaciones')}
                </span>
                <span className={estilos.descripcionAcceso}>
                  {t('panel.inicio.organizaciones_texto')}
                </span>
              </span>
              <Icono nombre="arrow_forward" className={estilos.flecha} />
            </Link>
          </section>
        )}
      </div>
    </Estructura>
  )
}
