import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import * as api from '../api/cliente'
import type { Organizacion } from '../api/cliente'
import { Boton } from '../componentes/Boton'
import { Estructura } from '../componentes/Estructura'
import { t } from '../i18n'
import estilos from './Organizaciones.module.css'

export default function Organizaciones() {
  const [filas, setFilas] = useState<Organizacion[] | null>(null)
  const [falla, setFalla] = useState<string | null>(null)
  const [aviso, setAviso] = useState<string | null>(null)
  const [reenviando, setReenviando] = useState<string | null>(null)

  useEffect(() => {
    let vigente = true
    api
      .listarOrganizaciones()
      .then((f) => vigente && setFilas(f))
      .catch(
        () => vigente && setFalla(t('organizaciones.lista.cargando_error')),
      )
    return () => {
      vigente = false
    }
  }, [])

  const reenviar = async (o: Organizacion) => {
    setReenviando(o.id)
    setAviso(null)
    try {
      await api.reenviarInvitacion(o.id)
      setAviso(
        t('organizaciones.lista.reenviada').replace(
          '{correo}',
          o.admin?.correo ?? '',
        ),
      )
      setFilas(await api.listarOrganizaciones())
    } catch {
      setFalla(t('comun.errores.desconocido'))
    } finally {
      setReenviando(null)
    }
  }

  return (
    <Estructura
      titulo={t('organizaciones.lista.titulo')}
      descripcion={t('organizaciones.lista.descripcion')}
    >
      <div className={estilos.acciones}>
        <Link to="/organizaciones/nueva" className={estilos.enlaceBoton}>
          {t('organizaciones.lista.nueva')}
        </Link>
      </div>
      {falla && (
        <p role="alert" className={estilos.falla}>
          {falla}
        </p>
      )}
      {aviso && (
        <p role="status" className={estilos.aviso}>
          {aviso}
        </p>
      )}
      {filas && filas.length === 0 && <p>{t('organizaciones.lista.vacia')}</p>}
      {filas && filas.length > 0 && (
        <div className={estilos.envoltura}>
          <table className={estilos.tabla}>
            <caption className={estilos.oculto}>
              {t('organizaciones.lista.titulo')}
            </caption>
            <thead>
              <tr>
                <th scope="col">{t('organizaciones.lista.columna_nombre')}</th>
                <th scope="col">{t('organizaciones.lista.columna_tipo')}</th>
                <th scope="col">{t('organizaciones.lista.columna_estado')}</th>
                <th scope="col">{t('organizaciones.lista.columna_precio')}</th>
                <th scope="col">{t('organizaciones.lista.columna_admin')}</th>
                <th scope="col">
                  {t('organizaciones.lista.columna_invitacion')}
                </th>
                <th scope="col">{t('organizaciones.lista.columna_alta')}</th>
                <th scope="col">
                  {t('organizaciones.lista.columna_acciones')}
                </th>
              </tr>
            </thead>
            <tbody>
              {filas.map((o) => (
                <tr key={o.id}>
                  <th scope="row">{o.nombre}</th>
                  <td>{t(`organizaciones.lista.tipo_${o.tipo}`)}</td>
                  <td>{t(`organizaciones.lista.estado_${o.estado}`)}</td>
                  <td>{o.precioMaximoUrc.toFixed(2)}</td>
                  <td>
                    {o.admin?.nombre}
                    <br />
                    <span className={estilos.secundario}>
                      {o.admin?.correo}
                    </span>
                  </td>
                  <td>
                    <span
                      className={`${estilos.etiqueta} ${estilos[o.estadoInvitacion]}`}
                    >
                      {t(
                        `organizaciones.lista.invitacion_${o.estadoInvitacion}`,
                      )}
                    </span>
                  </td>
                  <td>{new Date(o.creadoEn).toLocaleDateString('es-BO')}</td>
                  <td>
                    {o.estadoInvitacion !== 'aceptada' && (
                      <Boton
                        variante="secundario"
                        etiqueta={t(
                          reenviando === o.id
                            ? 'organizaciones.lista.reenviando'
                            : 'organizaciones.lista.reenviar',
                        )}
                        cargando={reenviando === o.id}
                        onClick={() => reenviar(o)}
                      />
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Estructura>
  )
}
