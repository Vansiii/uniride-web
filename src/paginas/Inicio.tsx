import { useSesion } from '../app/useSesion'
import { Boton } from '../componentes/Boton'
import { t } from '../i18n'

// ponytail: pantalla mínima; las secciones del panel (HU-01, HU-02, HU-03) se agregan aquí con su navegación.
export default function Inicio() {
  const { usuario, cerrar } = useSesion()
  return (
    <main style={{ padding: 'var(--espacio-6)' }}>
      <h1>{t('aplicacion.nombre')}</h1>
      <p>
        {t('autenticacion.sesion.bienvenida').replace(
          '{nombre}',
          usuario?.nombreCompleto ?? '',
        )}
      </p>
      <Boton
        variante="secundario"
        etiqueta={t('autenticacion.sesion.salir')}
        onClick={cerrar}
      />
    </main>
  )
}
