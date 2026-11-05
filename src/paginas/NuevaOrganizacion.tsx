import { useEffect, useState } from 'react'
import type { FormEvent, MouseEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { ErrorApi } from '../api/cliente'
import * as api from '../api/cliente'
import { Boton } from '../componentes/Boton'
import { Campo } from '../componentes/Campo'
import { Estructura } from '../componentes/Estructura'
import { Icono } from '../componentes/Icono'
import { Aviso, Dialogo } from '../componentes/Mensajes'
import { t } from '../i18n'
import estilos from './NuevaOrganizacion.module.css'

type Errores = Partial<
  Record<'nombre' | 'precio' | 'adminNombre' | 'adminCorreo', string>
>
type Tipo = 'universidad' | 'empresa'

const LISTA = '/organizaciones'

export default function NuevaOrganizacion() {
  const navegar = useNavigate()
  const [nombre, setNombre] = useState('')
  const [tipo, setTipo] = useState<Tipo>('universidad')
  const [precio, setPrecio] = useState('')
  const [adminNombre, setAdminNombre] = useState('')
  const [adminCorreo, setAdminCorreo] = useState('')
  const [errores, setErrores] = useState<Errores>({})
  const [falla, setFalla] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)
  const [descartar, setDescartar] = useState(false)

  // Un error se borra en cuanto la persona corrige el campo (9.2).
  const limpiar = (campo: keyof typeof errores) =>
    setErrores((e) => ({ ...e, [campo]: undefined }))

  const conCambios =
    !enviando &&
    [nombre, precio, adminNombre, adminCorreo].some((v) => v.trim())

  // Cerrar o recargar la pestaña con datos escritos pide confirmación al navegador (9.4).
  useEffect(() => {
    if (!conCambios) return
    const avisar = (e: BeforeUnloadEvent) => e.preventDefault()
    window.addEventListener('beforeunload', avisar)
    return () => window.removeEventListener('beforeunload', avisar)
  }, [conCambios])

  const salir = (e?: MouseEvent) => {
    e?.preventDefault()
    if (conCambios) setDescartar(true)
    else navegar(LISTA)
  }

  const enviar = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formulario = e.currentTarget
    const monto = Number(precio.replace(',', '.'))
    const nuevos: Errores = {
      nombre: nombre.trim()
        ? undefined
        : t('organizaciones.alta.nombre_requerido'),
      precio:
        precio.trim() && monto > 0
          ? undefined
          : t('organizaciones.alta.precio_maximo_invalido'),
      adminNombre: adminNombre.trim()
        ? undefined
        : t('organizaciones.alta.admin_nombre_requerido'),
      adminCorreo: /^\S+@\S+\.\S+$/.test(adminCorreo.trim())
        ? undefined
        : t('organizaciones.alta.correo_invalido'),
    }
    setErrores(nuevos)
    setFalla(null)
    const cantidad = Object.values(nuevos).filter(Boolean).length
    if (cantidad) {
      if (cantidad > 2) setFalla(t('organizaciones.alta.revisar'))
      // Foco en el primer campo con error, después de que se marquen (9.2).
      requestAnimationFrame(() =>
        formulario.querySelector<HTMLInputElement>('[aria-invalid]')?.focus(),
      )
      return
    }
    setEnviando(true) // el botón queda bloqueado: un doble clic no envía dos veces
    try {
      await api.crearOrganizacion({
        nombre: nombre.trim(),
        tipo,
        precioMaximoUrc: monto,
        adminNombre: adminNombre.trim(),
        adminCorreo: adminCorreo.trim(),
      })
      // Se reemplaza el formulario: "atrás" no permite repetir el alta (N5).
      navegar(LISTA, { replace: true, state: { creada: adminCorreo.trim() } })
    } catch (error) {
      if (
        error instanceof ErrorApi &&
        error.codigo === 'ORGANIZACION_NOMBRE_DUPLICADO'
      )
        setErrores({ nombre: t('organizaciones.alta.nombre_duplicado') })
      else if (error instanceof ErrorApi && error.codigo === 'SIN_CONEXION')
        setFalla(t('comun.errores.sin_conexion'))
      else setFalla(t('comun.errores.desconocido'))
      setEnviando(false)
    }
  }

  return (
    <Estructura
      titulo={t('organizaciones.alta.titulo')}
      descripcion={t('organizaciones.alta.descripcion')}
      // ponytail: la barra lateral no pide confirmación (BrowserRouter no tiene useBlocker); migrar a createBrowserRouter si molesta.
      miga={{
        hacia: LISTA,
        etiqueta: t('organizaciones.lista.titulo'),
        alPresionar: salir,
      }}
    >
      <div className={estilos.columnas}>
        <form className={estilos.formulario} onSubmit={enviar} noValidate>
          {falla && (
            <Aviso rol="alert" tono="peligro">
              {falla}
            </Aviso>
          )}
          <fieldset className={estilos.grupo}>
            <legend className={estilos.leyenda}>
              {t('organizaciones.alta.seccion_organizacion')}
            </legend>
            <Campo
              etiqueta={t('organizaciones.alta.nombre')}
              name="organizacion"
              autoComplete="off"
              placeholder={t('organizaciones.alta.nombre_ejemplo')}
              value={nombre}
              onChange={(e) => {
                setNombre(e.target.value)
                limpiar('nombre')
              }}
              error={errores.nombre}
            />
            <fieldset className={estilos.opciones}>
              <legend className={estilos.etiqueta}>
                {t('organizaciones.alta.tipo')}
              </legend>
              {(['universidad', 'empresa'] as const).map((valor) => (
                <label key={valor} className={estilos.opcion}>
                  <input
                    type="radio"
                    name="tipo"
                    value={valor}
                    checked={tipo === valor}
                    onChange={() => setTipo(valor)}
                  />
                  <Icono
                    nombre={valor === 'universidad' ? 'school' : 'apartment'}
                    tamano={20}
                  />
                  {t(`organizaciones.lista.tipo_${valor}`)}
                </label>
              ))}
            </fieldset>
            <Campo
              etiqueta={t('organizaciones.alta.precio_maximo')}
              name="precio"
              inputMode="decimal"
              autoComplete="off"
              placeholder={t('organizaciones.alta.precio_ejemplo')}
              sufijo="URC"
              value={precio}
              onChange={(e) => {
                setPrecio(e.target.value)
                limpiar('precio')
              }}
              ayuda={t('organizaciones.alta.precio_ayuda')}
              error={errores.precio}
            />
          </fieldset>
          <fieldset className={estilos.grupo}>
            <legend className={estilos.leyenda}>
              {t('organizaciones.alta.seccion_admin')}
            </legend>
            <div className={estilos.fila}>
              <Campo
                etiqueta={t('organizaciones.alta.admin_nombre')}
                name="admin-nombre"
                autoComplete="off"
                value={adminNombre}
                onChange={(e) => {
                  setAdminNombre(e.target.value)
                  limpiar('adminNombre')
                }}
                error={errores.adminNombre}
              />
              <Campo
                etiqueta={t('organizaciones.alta.admin_correo')}
                type="email"
                name="admin-correo"
                autoComplete="off"
                spellCheck={false}
                placeholder={t('organizaciones.alta.admin_correo_ejemplo')}
                value={adminCorreo}
                onChange={(e) => {
                  setAdminCorreo(e.target.value)
                  limpiar('adminCorreo')
                }}
                error={errores.adminCorreo}
              />
            </div>
          </fieldset>
          <div className={estilos.botones}>
            <Boton
              variante="texto"
              etiqueta={t('comun.acciones.cancelar')}
              onClick={() => salir()}
            />
            <Boton
              type="submit"
              cargando={enviando}
              etiqueta={t(
                enviando
                  ? 'organizaciones.alta.guardando'
                  : 'organizaciones.alta.guardar',
              )}
            />
          </div>
        </form>
        <aside className={estilos.lado}>
          <Aviso tono="info" titulo={t('organizaciones.alta.que_pasa_titulo')}>
            {t('organizaciones.alta.que_pasa')}
          </Aviso>
        </aside>
      </div>
      <Dialogo
        abierto={descartar}
        titulo={t('comun.descartar.titulo')}
        texto={t('comun.descartar.texto')}
        confirmar={t('comun.acciones.descartar')}
        alConfirmar={() => navegar(LISTA)}
        alVolver={() => setDescartar(false)}
      />
    </Estructura>
  )
}
