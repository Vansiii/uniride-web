import type { ReactNode } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { ProveedorSesion } from './app/sesion'
import { useSesion } from './app/useSesion'
import { t } from './i18n'
import AceptarInvitacion from './paginas/AceptarInvitacion'
import Inicio from './paginas/Inicio'
import IniciarSesion from './paginas/IniciarSesion'
import Afiliacion from './paginas/admin/Afiliacion'
import NuevaOrganizacion from './paginas/NuevaOrganizacion'
import Organizaciones from './paginas/Organizaciones'

/**
 * Exige sesión; con `superAdmin` exige además ese rol y con `deOrganizacion` una organización activa
 * sin ser super administrador (el servidor vuelve a comprobar el rol en cada petición).
 */
function Protegida({
  children,
  superAdmin = false,
  deOrganizacion = false,
}: {
  children: ReactNode
  superAdmin?: boolean
  deOrganizacion?: boolean
}) {
  const { cargando, usuario } = useSesion()
  if (cargando) return <p role="status">{t('comun.estados.cargando')}</p>
  if (!usuario) return <Navigate to="/iniciar-sesion" replace />
  if (superAdmin && usuario.rolPlataforma !== 'super_admin')
    return <Navigate to="/" replace />
  if (
    deOrganizacion &&
    (usuario.rolPlataforma === 'super_admin' || !usuario.organizacionActiva)
  )
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
        <Route
          path="/organizacion/afiliacion"
          element={
            <Protegida deOrganizacion>
              <Afiliacion />
            </Protegida>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </ProveedorSesion>
  )
}
