import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import * as api from '../api/cliente'
import type { Organizacion } from '../api/cliente'
import { Boton } from '../componentes/Boton'
import { Buscador, Cifra, Cifras, Trayecto } from '../componentes/Datos'
import { EstadoVacio, Esqueleto } from '../componentes/Estados'
import { Estructura } from '../componentes/Estructura'
import { Icono } from '../componentes/Icono'
import { Aviso, EtiquetaEstado, Notificacion } from '../componentes/Mensajes'
import {
  formatoFecha,
  formatoMonto,
  formatoNumero,
  formatoPorcentaje,
  formatoRelativo,
  iniciales,
  contiene,
} from '../formato'
import { t } from '../i18n'
import estilos from './Organizaciones.module.css'

export default function Organizaciones() {
  const { pathname, state } = useLocation()
  const navegar = useNavigate()
  // Correo del administrador recién invitado; se lee una vez para que recargar no repita el aviso.
  const [creada] = useState((state as { creada?: string } | null)?.creada)
  const [filas, setFilas] = useState<Organizacion[] | null>(null)
  const [falla, setFalla] = useState(false)
  const [intento, setIntento] = useState(0)
  const [fallaReenvio, setFallaReenvio] = useState(false)
  const [notificacion, setNotificacion] = useState<string | null>(null)
  const [reenviando, setReenviando] = useState<string | null>(null)
  const [busqueda, setBusqueda] = useState('')

  useEffect(() => {
    if (creada) navegar(pathname, { replace: true, state: null })
  }, [creada, navegar, pathname])

  useEffect(() => {
    let vigente = true
    api
      .listarOrganizaciones()
      .then((f) => vigente && setFilas(f))
      .catch(() => vigente && setFalla(true))
    return () => {
      vigente = false
    }
  }, [intento])

  const reintentar = () => {
    setFalla(false)
    setIntento(intento + 1)
  }

  const reenviar = async (o: Organizacion) => {
    setReenviando(o.id)
    setFallaReenvio(false)
    try {
      await api.reenviarInvitacion(o.id)
      setNotificacion(
        t('organizaciones.lista.reenviada').replace(
          '{correo}',
          o.admin?.correo ?? '',
        ),
      )
      setFilas(await api.listarOrganizaciones())
    } catch {
      setFallaReenvio(true)
    } finally {
      setReenviando(null)
    }
  }

  const total = filas?.length ?? 0
  const contar = (f: (o: Organizacion) => boolean) =>
    (filas ?? []).filter(f).length
  const universidades = contar((o) => o.tipo === 'universidad')
  const aceptadas = contar((o) => o.estadoInvitacion === 'aceptada')
  const atender = contar(
    (o) =>
      o.estadoInvitacion === 'no_enviada' || o.estadoInvitacion === 'vencida',
  )
  const visibles = (filas ?? []).filter(
    (o) =>
      contiene(o.nombre, busqueda) ||
      contiene(o.admin?.nombre ?? '', busqueda) ||
      contiene(o.admin?.correo ?? '', busqueda),
  )
  const parte = (k: number) =>
    t('organizaciones.lista.resumen_tipo_nota').replace(
      '{p}',
      formatoPorcentaje(total ? k / total : 0),
    )

  return (
    <Estructura
      titulo={t('organizaciones.lista.titulo')}
      descripcion={t('organizaciones.lista.descripcion')}
      accion={
        <Boton
          hacia="/organizaciones/nueva"
          icono="add"
          etiqueta={t('organizaciones.lista.nueva')}
        />
      }
    >
      {creada && (
        <Aviso tono="exito" titulo={t('organizaciones.lista.creada_titulo')}>
          {t('organizaciones.lista.creada').replace('{correo}', creada)}
        </Aviso>
      )}
      {fallaReenvio && (
        <Aviso rol="alert" tono="peligro">
          {t('organizaciones.lista.reenviar_error')}
        </Aviso>
      )}
      {falla && (
        <Aviso
          rol="alert"
          tono="peligro"
          accion={{
            etiqueta: t('comun.acciones.reintentar'),
            alPresionar: reintentar,
          }}
        >
          {t('organizaciones.lista.cargando_error')}
        </Aviso>
      )}
      {!filas && !falla && <Esqueleto />}
      {filas && filas.length === 0 && (
        <EstadoVacio
          icono="corporate_fare"
          titulo={t('organizaciones.lista.vacia_titulo')}
          texto={t('organizaciones.lista.vacia')}
          accion={
            <Boton
              hacia="/organizaciones/nueva"
              icono="add"
              etiqueta={t('organizaciones.lista.nueva')}
            />
          }
        />
      )}
      {filas && filas.length > 0 && (
        <Cifras>
          <Cifra
            icono="corporate_fare"
            etiqueta={t('organizaciones.lista.resumen_total')}
            valor={formatoNumero(total)}
            nota={t('organizaciones.lista.resumen_total_nota')}
          />
          <Cifra
            icono="school"
            etiqueta={t('organizaciones.lista.resumen_universidades')}
            valor={formatoNumero(universidades)}
            nota={parte(universidades)}
          />
          <Cifra
            icono="apartment"
            etiqueta={t('organizaciones.lista.resumen_empresas')}
            valor={formatoNumero(total - universidades)}
            nota={parte(total - universidades)}
          />
          <Cifra
            icono="verified"
            tono="exito"
            etiqueta={t('organizaciones.lista.resumen_aceptadas')}
            valor={formatoNumero(aceptadas)}
            nota={
              <>
                {t('organizaciones.lista.resumen_aceptadas_nota')
                  .replace('{a}', formatoNumero(aceptadas))
                  .replace('{n}', formatoNumero(total))}
                <Trayecto
                  fraccion={total ? aceptadas / total : 0}
                  tono="exito"
                />
              </>
            }
          />
          <Cifra
            icono="send"
            tono={atender ? 'aviso' : 'neutro'}
            etiqueta={t('organizaciones.lista.resumen_atender')}
            valor={formatoNumero(atender)}
            nota={t('organizaciones.lista.resumen_atender_nota')}
          />
        </Cifras>
      )}
      {filas && filas.length > 0 && (
        <Buscador
          etiqueta={t('organizaciones.lista.buscar')}
          valor={busqueda}
          alCambiar={setBusqueda}
        />
      )}
      {filas && filas.length > 0 && visibles.length === 0 && (
        <p className={estilos.sinResultados}>
          {t('organizaciones.lista.sin_resultados').replace('{q}', () =>
            busqueda.trim(),
          )}
        </p>
      )}
      {visibles.length > 0 && (
        <div className={estilos.envoltura}>
          <table className={estilos.tabla}>
            <caption className={estilos.leyenda}>
              {visibles.length === 1
                ? t('organizaciones.lista.conteo_uno')
                : t('organizaciones.lista.conteo_varias').replace(
                    '{n}',
                    String(visibles.length),
                  )}
            </caption>
            <thead>
              <tr>
                <th scope="col">{t('organizaciones.lista.columna_nombre')}</th>
                <th scope="col" className={estilos.secundaria}>
                  {t('organizaciones.lista.columna_tipo')}
                </th>
                <th scope="col" className={estilos.secundaria}>
                  {t('organizaciones.lista.columna_estado')}
                </th>
                <th scope="col" className={estilos.numero}>
                  {t('organizaciones.lista.columna_precio')}
                </th>
                <th scope="col">{t('organizaciones.lista.columna_admin')}</th>
                <th scope="col">
                  {t('organizaciones.lista.columna_invitacion')}
                </th>
                <th scope="col" className={estilos.secundaria}>
                  {t('organizaciones.lista.columna_alta')}
                </th>
                <th scope="col">
                  <span className="solo-lector">
                    {t('organizaciones.lista.columna_acciones')}
                  </span>
                </th>
              </tr>
            </thead>
            <tbody>
              {visibles.map((o) => (
                <tr key={o.id}>
                  <th scope="row" className={estilos.nombre}>
                    <span className={estilos.conAvatar}>
                      <span className={estilos.avatar} aria-hidden="true">
                        {iniciales(o.nombre)}
                      </span>
                      <span>{o.nombre}</span>
                    </span>
                  </th>
                  <td
                    data-etiqueta={t('organizaciones.lista.columna_tipo')}
                    className={estilos.secundaria}
                  >
                    <span className={estilos.tipo}>
                      <Icono
                        nombre={
                          o.tipo === 'universidad' ? 'school' : 'apartment'
                        }
                        tamano={20}
                      />
                      <span>{t(`organizaciones.lista.tipo_${o.tipo}`)}</span>
                    </span>
                  </td>
                  <td
                    data-etiqueta={t('organizaciones.lista.columna_estado')}
                    className={estilos.secundaria}
                  >
                    <EtiquetaEstado
                      dominio="organizacion"
                      estado={o.estado}
                      texto={t(`organizaciones.lista.estado_${o.estado}`)}
                    />
                  </td>
                  <td
                    data-etiqueta={t('organizaciones.lista.columna_precio')}
                    className={estilos.numero}
                  >
                    {formatoMonto(o.precioMaximoUrc)}
                  </td>
                  <td data-etiqueta={t('organizaciones.lista.columna_admin')}>
                    <span className={estilos.admin}>
                      <span>{o.admin?.nombre}</span>
                      <span className={estilos.textoSecundario}>
                        {o.admin?.correo}
                      </span>
                    </span>
                  </td>
                  <td
                    data-etiqueta={t('organizaciones.lista.columna_invitacion')}
                  >
                    <EtiquetaEstado
                      dominio="invitacion"
                      estado={o.estadoInvitacion}
                      texto={t(
                        `organizaciones.lista.invitacion_${o.estadoInvitacion}`,
                      )}
                    />
                  </td>
                  <td
                    data-etiqueta={t('organizaciones.lista.columna_alta')}
                    className={`${estilos.secundaria} ${estilos.textoSecundario} ${estilos.numero}`}
                  >
                    <span>{formatoFecha(o.creadoEn)}</span>
                    <span className={estilos.relativo}>
                      {formatoRelativo(o.creadoEn)}
                    </span>
                  </td>
                  <td className={estilos.acciones}>
                    {o.estadoInvitacion !== 'aceptada' && (
                      <Boton
                        variante="secundario"
                        tamano="compacto"
                        icono="send"
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
      <Notificacion mensaje={notificacion} alCerrar={setNotificacion} />
    </Estructura>
  )
}
