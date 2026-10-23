import { useState } from 'react'
import type { FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { ErrorApi } from '../api/cliente'
import * as api from '../api/cliente'
import { Boton } from '../componentes/Boton'
import { Campo } from '../componentes/Campo'
import { Estructura } from '../componentes/Estructura'
import { t } from '../i18n'
import estilos from './Organizaciones.module.css'

type Errores = Partial<
  Record<'nombre' | 'precio' | 'adminNombre' | 'adminCorreo', string>
>

export default function NuevaOrganizacion() {
  const navegar = useNavigate()
  const [nombre, setNombre] = useState('')
  const [tipo, setTipo] = useState<'universidad' | 'empresa'>('universidad')
  const [precio, setPrecio] = useState('')
  const [adminNombre, setAdminNombre] = useState('')
  const [adminCorreo, setAdminCorreo] = useState('')
  const [errores, setErrores] = useState<Errores>({})
  const [falla, setFalla] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)

  const enviar = async (e: FormEvent) => {
    e.preventDefault()
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
    if (Object.values(nuevos).some(Boolean)) return
    setEnviando(true) // el botón queda bloqueado: un doble clic no envía dos veces
    try {
      await api.crearOrganizacion({
        nombre: nombre.trim(),
        tipo,
        precioMaximoUrc: monto,
        adminNombre: adminNombre.trim(),
        adminCorreo: adminCorreo.trim(),
      })
      navegar('/organizaciones')
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
    >
      <form className={estilos.formulario} onSubmit={enviar} noValidate>
        {falla && (
          <p role="alert" className={estilos.falla}>
            {falla}
          </p>
        )}
        <Campo
          etiqueta={t('organizaciones.alta.nombre')}
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          error={errores.nombre}
        />
        <div className={estilos.selector}>
          <label htmlFor="tipo-organizacion">
            {t('organizaciones.alta.tipo')}
          </label>
          <select
            id="tipo-organizacion"
            value={tipo}
            onChange={(e) => setTipo(e.target.value as typeof tipo)}
          >
            <option value="universidad">
              {t('organizaciones.lista.tipo_universidad')}
            </option>
            <option value="empresa">
              {t('organizaciones.lista.tipo_empresa')}
            </option>
          </select>
        </div>
        <Campo
          etiqueta={t('organizaciones.alta.precio_maximo')}
          inputMode="decimal"
          value={precio}
          onChange={(e) => setPrecio(e.target.value)}
          ayuda={t('organizaciones.alta.precio_ayuda')}
          error={errores.precio}
        />
        <Campo
          etiqueta={t('organizaciones.alta.admin_nombre')}
          autoComplete="off"
          value={adminNombre}
          onChange={(e) => setAdminNombre(e.target.value)}
          error={errores.adminNombre}
        />
        <Campo
          etiqueta={t('organizaciones.alta.admin_correo')}
          type="email"
          autoComplete="off"
          value={adminCorreo}
          onChange={(e) => setAdminCorreo(e.target.value)}
          error={errores.adminCorreo}
        />
        <div className={estilos.botones}>
          <Boton
            type="submit"
            cargando={enviando}
            etiqueta={t(
              enviando
                ? 'organizaciones.alta.guardando'
                : 'organizaciones.alta.guardar',
            )}
          />
          <Boton
            variante="secundario"
            etiqueta={t('comun.acciones.cancelar')}
            onClick={() => navegar('/organizaciones')}
          />
        </div>
      </form>
    </Estructura>
  )
}
