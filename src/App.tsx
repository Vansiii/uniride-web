import { Navigate, Route, Routes } from 'react-router-dom'
import { ProveedorSesion, useSesion } from './app/sesion'
import { t } from './i18n'
import Inicio from './paginas/Inicio'
import IniciarSesion from './paginas/IniciarSesion'

function Protegida() {
  const { cargando, usuario } = useSesion()
  if (cargando) return <p role="status">{t('comun.estados.cargando')}</p>
  return usuario ? <Inicio /> : <Navigate to="/iniciar-sesion" replace />
}

export default function App() {
  return (
    <ProveedorSesion>
      <Routes>
        <Route path="/iniciar-sesion" element={<IniciarSesion />} />
        <Route path="/" element={<Protegida />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </ProveedorSesion>
  )
}
