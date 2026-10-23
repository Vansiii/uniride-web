import type { ReactNode } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { ProveedorSesion } from './app/sesion'
import { useSesion } from './app/useSesion'
import { t } from './i18n'
import AceptarInvitacion from './paginas/AceptarInvitacion'
import Inicio from './paginas/Inicio'
import IniciarSesion from './paginas/IniciarSesion'
import NuevaOrganizacion from './paginas/NuevaOrganizacion'
import Organizaciones from './paginas/Organizaciones'

/** Exige sesión; con `superAdmin` exige además ese rol (el servidor lo vuelve a comprobar). */
function Protegida({
  children,
  superAdmin = false,
}: {
  children: ReactNode
  superAdmin?: boolean
}) {
  const { cargando, usuario } = useSesion()
  if (cargando) return <p role="status">{t('comun.estados.cargando')}</p>
  if (!usuario) return <Navigate to="/iniciar-sesion" replace />
  if (superAdmin && usuario.rolPlataforma !== 'super_admin')
    return <Navigate to="/" replace />
  return children
}

export default function App() {
  return (
    <ProveedorSesion>
      <Routes>
        <Route path="/iniciar-sesion" element={<IniciarSesion />} />
        <Route path="/invitaciones/:token" element={<AceptarInvitacion />} />
        <Route
          path="/"
          element={
            <Protegida>
              <Inicio />
            </Protegida>
          }
        />
        <Route
          path="/organizaciones"
          element={
            <Protegida superAdmin>
              <Organizaciones />
            </Protegida>
          }
        />
        <Route
          path="/organizaciones/nueva"
          element={
            <Protegida superAdmin>
              <NuevaOrganizacion />
            </Protegida>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </ProveedorSesion>
  )
}
