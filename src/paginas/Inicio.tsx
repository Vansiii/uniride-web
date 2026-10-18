import { useSesion } from '../app/useSesion'
import { Estructura } from '../componentes/Estructura'
import { t } from '../i18n'
import estilos from './Inicio.module.css'

// ponytail: pantalla mínima; las secciones del panel (HU-01, HU-02, HU-03) se agregan aquí con su navegación.
export default function Inicio() {
  const { usuario } = useSesion()
  const nombre = usuario?.nombreCompleto ?? ''
  return (
    <Estructura
      titulo={t('panel.inicio.titulo').replace('{nombre}', nombre)}
      descripcion={t('panel.inicio.descripcion')}
    >
      <section className={estilos.tarjeta} aria-labelledby="titulo-cuenta">
        <h2 id="titulo-cuenta" className={estilos.subtitulo}>
          {t('panel.inicio.cuenta')}
        </h2>
        <dl className={estilos.datos}>
          <dt>{t('panel.inicio.nombre')}</dt>
          <dd>{nombre}</dd>
          <dt>{t('panel.inicio.correo')}</dt>
          <dd>{usuario?.correo}</dd>
          <dt>{t('panel.inicio.rol')}</dt>
          <dd>
            <span className={estilos.etiqueta}>
              {t(
                usuario?.rolPlataforma === 'super_admin'
                  ? 'panel.inicio.rol_super_admin'
                  : 'panel.inicio.rol_miembro',
              )}
            </span>
          </dd>
        </dl>
      </section>
    </Estructura>
  )
}
