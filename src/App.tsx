import type { ReactNode } from 'react'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { ProveedorSesion } from './app/sesion'
import { useSesion } from './app/useSesion'
import { Cargando } from './componentes/Estados'
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
  const { pathname } = useLocation()
  if (cargando) return <Cargando />
  // Tras ingresar vuelve a la ruta pedida (N10).
  if (!usuario)
    return <Navigate to="/iniciar-sesion" replace state={{ desde: pathname }} />
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
