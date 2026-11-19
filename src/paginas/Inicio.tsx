import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import * as api from '../api/cliente'
import type {
  BloqueoVigente,
  MetricasPlataforma,
  Organizacion,
  ResumenOrganizacion,
  Solicitud,
} from '../api/cliente'
import { administraOrganizacion, membresiaActiva } from '../app/membresia'
import { useSesion } from '../app/useSesion'
import {
  Barras,
  Cifra,
  Cifras,
  EsqueletoCifras,
  Panel,
  Rejilla,
} from '../componentes/Datos'
import { Estructura } from '../componentes/Estructura'
import { Icono } from '../componentes/Icono'
import { EtiquetaEstado } from '../componentes/Mensajes'
import {
  formatoFechaLarga,
  formatoNumero,
  formatoRelativo,
  iniciales,
} from '../formato'
import { t } from '../i18n'
import type { NombreIcono } from '../iconos/rutas'
import estilos from './Inicio.module.css'

const n = (clave: string, valor: number) =>
  t(clave).replace('{n}', formatoNumero(valor))

/** Pide un dato del tablero; si falla, la sección muestra su propio aviso y el resto sigue (11). */
function useDato<T>(cargar: () => Promise<T>) {
  const [dato, setDato] = useState<T | null>(null)
  const [falla, setFalla] = useState(false)
  const pedir = useRef(cargar) // una sola vez al montar
  useEffect(() => {
    let vigente = true
    pedir
      .current()
      .then((r) => vigente && setDato(r ?? null))
      .catch(() => vigente && setFalla(true))
    return () => {
      vigente = false
    }
  }, [])
  return { dato, falla }
}

function Acceso({
  hacia,
  icono,
  nombre,
  texto,
}: {
  hacia: string
  icono: NombreIcono
  nombre: string
  texto: string
}) {
  return (
    <Link to={hacia} className={estilos.acceso}>
      <span className={estilos.iconoAcceso}>
        <Icono nombre={icono} />
      </span>
      <span className={estilos.textoAcceso}>
        <span className={estilos.nombreAcceso}>{nombre}</span>
        <span className={estilos.descripcionAcceso}>{texto}</span>
      </span>
      <Icono nombre="chevron_right" className={estilos.flecha} />
    </Link>
  )
}

function FallaSeccion() {
  return <p className={estilos.falla}>{t('panel.inicio.error_datos')}</p>
}

function EnlaceSeccion({ hacia, texto }: { hacia: string; texto: string }) {
  return (
    <Link to={hacia} className={estilos.enlaceSeccion}>
      {texto}
      <Icono nombre="arrow_forward" tamano={16} />
    </Link>
  )
}

function TableroOrganizacion({ organizacionId }: { organizacionId: string }) {
  const resumen = useDato<ResumenOrganizacion>(() =>
    api.consultarResumen('30d'),
  )
  const solicitudes = useDato<Solicitud[]>(() =>
    api.listarSolicitudes(organizacionId),
  )
  const bloqueos = useDato<{ bloqueos: BloqueoVigente[] }>(
    api.listarBloqueosVigentes,
  )
  const r = resumen.dato
  const pendientes = solicitudes.dato ?? []
  const vigentes = bloqueos.dato?.bloqueos ?? []
  const proximo = [...vigentes].sort((a, b) =>
    a.hasta.localeCompare(b.hasta),
  )[0]

  return (
    <>
      {resumen.falla ? (
        <FallaSeccion />
      ) : !r ? (
        <EsqueletoCifras />
      ) : (
        <Cifras>
          <Cifra
            icono="directions_car"
            etiqueta={t('resumen.viajes')}
            valor={formatoNumero(r.viajesPagados)}
            nota={n('resumen.viajes_nota', r.viajesPagados / 30)}
          />
          <Cifra
            icono="group"
            etiqueta={t('resumen.miembros')}
            valor={formatoNumero(r.miembrosActivos)}
            nota={t('resumen.miembros_nota')}
          />
          <Cifra
            icono="airline_seat_recline_normal"
            etiqueta={t('resumen.pasajeros')}
            valor={formatoNumero(r.pasajeros)}
            nota={
              r.viajesPagados
                ? n('resumen.pasajeros_nota', r.pasajeros / r.viajesPagados)
                : undefined
            }
          />
          <Cifra
            icono="eco"
            tono="exito"
            etiqueta={t('resumen.co2')}
            valor={formatoNumero(r.co2Kg)}
            extra={t('resumen.estimado')}
            nota={n('resumen.co2_nota', r.co2Kg / 0.12)}
          />
        </Cifras>
      )}

      <Rejilla>
        <Panel
          icono="person_add"
          titulo={t('panel.inicio.pendientes_titulo')}
          descripcion={t('panel.inicio.pendientes_texto')}
          accion={
            pendientes.length > 0 && (
              <span className={estilos.contador}>
                {formatoNumero(pendientes.length)}
              </span>
            )
          }
        >
          {solicitudes.falla ? (
            <FallaSeccion />
          ) : pendientes.length === 0 ? (
            <p className={estilos.vacio}>
              <Icono nombre="task_alt" tamano={20} />
              {t('panel.inicio.pendientes_vacio')}
            </p>
          ) : (
            <ul className={estilos.personas}>
              {pendientes.slice(0, 4).map((s) => (
                <li key={s.id}>
                  <span className={estilos.avatarPequeno} aria-hidden="true">
                    {iniciales(s.nombreCompleto)}
                  </span>
                  <span className={estilos.datosPersona}>
                    <span className={estilos.nombrePersona}>
                      {s.nombreCompleto}
                    </span>
                    <span className={estilos.secundario}>
                      {t('panel.inicio.espera').replace(
                        '{tiempo}',
                        formatoRelativo(s.creadoEn),
                      )}
                    </span>
                  </span>
                </li>
              ))}
              {pendientes.length > 4 && (
                <li className={estilos.secundario}>
                  {n('panel.inicio.pendientes_mas', pendientes.length - 4)}
                </li>
              )}
            </ul>
          )}
          <EnlaceSeccion
            hacia="/organizacion/solicitudes"
            texto={t('panel.inicio.pendientes_ver')}
          />
        </Panel>

        <Panel
          icono="shield"
          titulo={t('panel.inicio.seguridad_titulo')}
          descripcion={t('panel.inicio.seguridad_texto')}
        >
          {bloqueos.falla ? (
            <FallaSeccion />
          ) : (
            <div
              className={`${estilos.estadoSeguridad} ${vigentes.length ? estilos.conBloqueos : ''}`}
            >
              <Icono
                nombre={vigentes.length ? 'block' : 'verified'}
                tamano={24}
              />
              <span>
                <span className={estilos.nombrePersona}>
                  {vigentes.length === 0
                    ? t('panel.inicio.bloqueos_cero')
                    : vigentes.length === 1
                      ? t('panel.inicio.bloqueos_uno')
                      : n('panel.inicio.bloqueos_varios', vigentes.length)}
                </span>
                {proximo && (
                  <span className={estilos.secundario}>
                    {t('panel.inicio.proximo_vence').replace(
                      '{tiempo}',
                      formatoRelativo(proximo.hasta),
                    )}
                  </span>
                )}
              </span>
            </div>
          )}
          <EnlaceSeccion
            hacia="/organizacion/alertas"
            texto={t('panel.inicio.bloqueos_ver')}
          />
        </Panel>
      </Rejilla>

      <section aria-labelledby="titulo-accesos" className={estilos.accesos}>
        <h2 id="titulo-accesos" className={estilos.subtitulo}>
          {t('panel.inicio.accesos')}
        </h2>
        <div className={estilos.rejillaAccesos}>
          <Acceso
            hacia="/organizacion/resumen"
            icono="leaderboard"
            nombre={t('navegacion.resumen')}
            texto={t('panel.inicio.acceso_resumen')}
          />
          <Acceso
            hacia="/organizacion/solicitudes"
            icono="verified"
            nombre={t('navegacion.solicitudes')}
            texto={t('panel.inicio.acceso_solicitudes')}
          />
          <Acceso
            hacia="/organizacion/alertas"
            icono="warning"
            nombre={t('navegacion.alertas_fraude')}
            texto={t('panel.inicio.acceso_alertas')}
          />
          <Acceso
            hacia="/organizacion/afiliacion"
            icono="school"
            nombre={t('navegacion.afiliacion')}
            texto={t('panel.inicio.acceso_afiliacion')}
          />
        </div>
      </section>
    </>
  )
}

const ATENDER: Organizacion['estadoInvitacion'][] = [
  'no_enviada',
  'vencida',
  'pendiente',
]

function TableroPlataforma() {
  const metricas = useDato<MetricasPlataforma>(() =>
    api.consultarMetricas('30d'),
  )
  const organizaciones = useDato<Organizacion[]>(api.listarOrganizaciones)
  const g = metricas.dato?.global
  const ranking = [...(metricas.dato?.porOrganizacion ?? [])]
    .filter((o) => o.viajesPagados > 0)
    .sort((a, b) => b.viajesPagados - a.viajesPagados)
    .slice(0, 5)
  const sinViajes = (metricas.dato?.porOrganizacion ?? []).filter(
    (o) => o.viajesPagados === 0,
  ).length
  const atender = (organizaciones.dato ?? []).filter((o) =>
    ATENDER.includes(o.estadoInvitacion),
  )

  return (
    <>
      {metricas.falla ? (
        <FallaSeccion />
      ) : !g ? (
        <EsqueletoCifras />
      ) : (
        <Cifras>
          <Cifra
            icono="corporate_fare"
            etiqueta={t('plataforma.metricas.organizaciones')}
            valor={formatoNumero(g.organizacionesActivas)}
            nota={n('plataforma.metricas.organizaciones_nota', sinViajes)}
          />
          <Cifra
            icono="group"
            etiqueta={t('plataforma.metricas.miembros')}
            valor={formatoNumero(g.miembrosActivos)}
            nota={
              g.organizacionesActivas
                ? n(
                    'plataforma.metricas.miembros_nota',
                    g.miembrosActivos / g.organizacionesActivas,
                  )
                : undefined
            }
          />
          <Cifra
            icono="directions_car"
            etiqueta={t('plataforma.metricas.viajes')}
            valor={formatoNumero(g.viajesPagados)}
            nota={n('plataforma.metricas.viajes_nota', g.viajesPagados / 30)}
          />
          <Cifra
            icono="eco"
            tono="exito"
            etiqueta={t('plataforma.metricas.co2')}
            valor={formatoNumero(g.co2Kg)}
            extra={t('plataforma.metricas.estimado')}
            nota={n('plataforma.metricas.co2_nota', g.co2Kg / 21)}
          />
        </Cifras>
      )}

      <Rejilla>
        <Panel
          icono="leaderboard"
          titulo={t('panel.inicio.ranking_titulo')}
          descripcion={t('panel.inicio.ranking_texto')}
        >
          {metricas.falla ? (
            <FallaSeccion />
          ) : ranking.length === 0 ? (
            <p className={estilos.vacio}>
              <Icono nombre="route" tamano={20} />
              {t('panel.inicio.ranking_vacio')}
            </p>
          ) : (
            <Barras
              datos={ranking.map((o) => ({
                etiqueta: o.nombre,
                valor: o.viajesPagados,
                texto: n('panel.inicio.viajes_n', o.viajesPagados),
              }))}
            />
          )}
          <EnlaceSeccion
            hacia="/plataforma/metricas"
            texto={t('panel.inicio.ver_metricas')}
          />
        </Panel>

        <Panel
          icono="send"
          titulo={t('panel.inicio.atencion_titulo')}
          descripcion={t('panel.inicio.atencion_texto')}
          accion={
            atender.length > 0 && (
              <span className={estilos.contador}>
                {formatoNumero(atender.length)}
              </span>
            )
          }
        >
          {organizaciones.falla ? (
            <FallaSeccion />
          ) : atender.length === 0 ? (
            <p className={estilos.vacio}>
              <Icono nombre="task_alt" tamano={20} />
              {t('panel.inicio.atencion_vacio')}
            </p>
          ) : (
            <ul className={estilos.personas}>
              {atender.slice(0, 4).map((o) => (
                <li key={o.id}>
                  <span className={estilos.avatarPequeno} aria-hidden="true">
                    <Icono
                      nombre={o.tipo === 'universidad' ? 'school' : 'apartment'}
                      tamano={16}
                    />
                  </span>
                  <span className={estilos.datosPersona}>
                    <span className={estilos.nombrePersona}>{o.nombre}</span>
                    <span className={estilos.secundario}>
                      {o.admin?.correo}
                    </span>
                  </span>
                  <EtiquetaEstado
                    dominio="invitacion"
                    estado={o.estadoInvitacion}
                    texto={t(
                      `organizaciones.lista.invitacion_${o.estadoInvitacion}`,
                    )}
                  />
                </li>
              ))}
            </ul>
          )}
          <EnlaceSeccion
            hacia="/organizaciones"
            texto={t('panel.inicio.atencion_ver')}
          />
        </Panel>
      </Rejilla>

      <section aria-labelledby="titulo-accesos" className={estilos.accesos}>
        <h2 id="titulo-accesos" className={estilos.subtitulo}>
          {t('panel.inicio.accesos')}
        </h2>
        <div className={estilos.rejillaAccesos}>
          <Acceso
            hacia="/organizaciones"
            icono="corporate_fare"
            nombre={t('navegacion.organizaciones')}
            texto={t('panel.inicio.organizaciones_texto')}
          />
          <Acceso
            hacia="/plataforma/metricas"
            icono="leaderboard"
            nombre={t('navegacion.metricas')}
            texto={t('panel.inicio.acceso_metricas')}
          />
        </div>
      </section>
    </>
  )
}

const PASOS: [NombreIcono, string][] = [
  ['search', 'panel.inicio.app_paso_1'],
  ['lock', 'panel.inicio.app_paso_2'],
  ['qr_code_2', 'panel.inicio.app_paso_3'],
  ['verified', 'panel.inicio.app_paso_4'],
]

function TableroMiembro() {
  return (
    <Panel icono="route" titulo={t('panel.inicio.app_titulo')}>
      <ol className={estilos.pasos}>
        {PASOS.map(([icono, clave]) => (
          <li key={clave}>
            <span className={estilos.iconoPaso}>
              <Icono nombre={icono} tamano={20} />
            </span>
            {t(clave)}
          </li>
        ))}
      </ol>
    </Panel>
  )
}

export default function Inicio() {
  const { usuario } = useSesion()
  const nombre = usuario?.nombreCompleto ?? ''
  const superAdmin = usuario?.rolPlataforma === 'super_admin'
  const administra = administraOrganizacion(usuario)
  const organizacion = membresiaActiva(usuario)?.organizacion ?? ''
  const [hoy] = useState(() => new Date())
  const descripcion = superAdmin
    ? t('panel.inicio.descripcion_super')
    : administra
      ? t('panel.inicio.descripcion_admin').replace(
          '{organizacion}',
          () => organizacion,
        )
      : t('panel.inicio.descripcion_miembro')

  return (
    <Estructura
      titulo={t('panel.inicio.titulo').replace('{nombre}', () => nombre)}
      descripcion={descripcion}
      banda={
        <div className={estilos.cuenta}>
          <span className={estilos.avatar} aria-hidden="true">
            {iniciales(nombre)}
          </span>
          <dl className={estilos.datos}>
            <div>
              <dt className="solo-lector">{t('panel.inicio.rol')}</dt>
              <dd>
                <span className={estilos.etiqueta}>
                  {t(
                    superAdmin
                      ? 'panel.inicio.rol_super_admin'
                      : administra
                        ? 'panel.inicio.rol_admin_organizacion'
                        : 'panel.inicio.rol_miembro',
                  )}
                </span>
              </dd>
            </div>
            <div>
              <dt className="solo-lector">{t('panel.inicio.correo')}</dt>
              <dd className={estilos.dato}>
                <Icono nombre="mail" tamano={16} />
                {usuario?.correo}
              </dd>
            </div>
            <div>
              <dt className="solo-lector">{t('comun.datos.periodo')}</dt>
              <dd className={estilos.dato}>
                <Icono nombre="calendar_month" tamano={16} />
                {t('panel.inicio.hoy').replace(
                  '{fecha}',
                  formatoFechaLarga(hoy),
                )}
              </dd>
            </div>
          </dl>
        </div>
      }
    >
      {superAdmin ? (
        <TableroPlataforma />
      ) : administra && usuario?.organizacionActiva ? (
        <TableroOrganizacion organizacionId={usuario.organizacionActiva} />
      ) : (
        <TableroMiembro />
      )}
    </Estructura>
  )
}
