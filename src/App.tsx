import type { ReactNode } from 'react'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { ProveedorSesion } from './app/sesion'
import { administraOrganizacion } from './app/membresia'
import { useSesion } from './app/useSesion'
import { Cargando } from './componentes/Estados'
import AceptarInvitacion from './paginas/AceptarInvitacion'
import Inicio from './paginas/Inicio'
import IniciarSesion from './paginas/IniciarSesion'
import Afiliacion from './paginas/admin/Afiliacion'
import Solicitudes from './paginas/admin/Solicitudes'
import NuevaOrganizacion from './paginas/NuevaOrganizacion'
import Organizaciones from './paginas/Organizaciones'
import RecuperarContrasena from './paginas/RecuperarContrasena'

/**
 * Exige sesión; con `superAdmin` exige además ese rol y con `deOrganizacion` ser administrador de la
 * organización activa (el servidor vuelve a comprobar el rol en cada petición).
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
  const { pathname } = useLocation()
  if (cargando) return <Cargando />
  // Tras ingresar vuelve a la ruta pedida (N10).
  if (!usuario)
    return <Navigate to="/iniciar-sesion" replace state={{ desde: pathname }} />
  if (superAdmin && usuario.rolPlataforma !== 'super_admin')
    return <Navigate to="/" replace />
  if (deOrganizacion && !administraOrganizacion(usuario))
    return <Navigate to="/" replace />
  return children
}

export default function App() {
  return (
    <ProveedorSesion>
      <Routes>
        <Route path="/iniciar-sesion" element={<IniciarSesion />} />
        <Route path="/recuperar-contrasena" element={<RecuperarContrasena />} />
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
        <Route
          path="/organizacion/solicitudes"
          element={
            <Protegida deOrganizacion>
              <Solicitudes />
            </Protegida>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </ProveedorSesion>
  )
}
