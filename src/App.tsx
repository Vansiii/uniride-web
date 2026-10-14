import { t } from './i18n'

export default function App() {
  return (
    <main>
      <h1>{t('aplicacion.nombre')}</h1>
      <p>{t('aplicacion.subtitulo')}</p>
    </main>
  )
}
