import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import * as api from '../api/cliente'
import { ErrorApi } from '../api/cliente'
import { useSesion } from '../app/useSesion'
import { Boton } from '../componentes/Boton'
import { Campo } from '../componentes/Campo'
import { t } from '../i18n'
import estilos from './RecuperarContrasena.module.css'

type Campos = { correo?: string; codigo?: string; contrasena?: string }

/** Traduce el `codigo` de la API; nunca muestra códigos técnicos ni revela si el correo tiene cuenta. */
function traducir(error: unknown): { campo?: keyof Campos; texto: string } {
  if (!(error instanceof ErrorApi))
    return { texto: t('comun.errores.desconocido') }
  switch (error.codigo) {
    case 'OTP_INVALIDO':
      return {
        campo: 'codigo',
        texto: t('autenticacion.recuperacion.codigo_invalido'),
      }
    case 'OTP_VENCIDO':
      return {
        campo: 'codigo',
        texto: t('autenticacion.recuperacion.codigo_vencido'),
      }
    case 'OTP_BLOQUEADO': {
      const hora = new Date(
        String(error.datos.reintentarEn),
      ).toLocaleTimeString('es-BO', { hour: '2-digit', minute: '2-digit' })
      return {
        // "a. m." ya termina en punto: sin esto la frase acaba en "..".
        texto: t('autenticacion.recuperacion.bloqueado')
          .replace('{hora}', () => hora)
          .replace(/\.\.$/, '.'),
      }
    }
    case 'OTP_LIMITE_REENVIO':
      return { texto: t('autenticacion.recuperacion.limite_reenvio') }
    case 'CONTRASENA_DEBIL':
      return {
        campo: 'contrasena',
        texto: t('autenticacion.recuperacion.contrasena_debil'),
      }
    case 'SIN_CONEXION':
      return { texto: t('comun.errores.sin_conexion') }
    default:
      return { texto: t('comun.errores.desconocido') }
  }
}

const correoValido = (correo: string) => /^\S+@\S+\.\S+$/.test(correo)
// Mismo requisito que el registro (RN-2); el servidor es quien decide.
const contrasenaValida = (c: string) =>
  c.length >= 8 && /[A-Za-z]/.test(c) && /\d/.test(c)

export default function RecuperarContrasena() {
  const { usuario } = useSesion()
  const navegar = useNavigate()
  const [paso, setPaso] = useState<'correo' | 'codigo'>('correo')
  const [correo, setCorreo] = useState('')
  const [codigo, setCodigo] = useState('')
  const [contrasena, setContrasena] = useState('')
  const [verContrasena, setVerContrasena] = useState(false)
  const [errores, setErrores] = useState<Campos>({})
  const [falla, setFalla] = useState<string | null>(null)
  const [reenviado, setReenviado] = useState(false)
  const [enviando, setEnviando] = useState(false)
  const [reenviando, setReenviando] = useState(false)
  const [reenviarEn, setReenviarEn] = useState(0)
  const [ahora, setAhora] = useState(() => Date.now())
  const primerCampo = useRef<HTMLInputElement>(null)

  // Cuenta atrás del reenvío: solo corre mientras falta tiempo.
  useEffect(() => {
    if (reenviarEn <= Date.now()) return
    const reloj = setInterval(() => setAhora(Date.now()), 1000)
    return () => clearInterval(reloj)
  }, [reenviarEn])

  // Al cambiar de paso el foco va al primer campo.
  useEffect(() => {
    primerCampo.current?.focus()
  }, [paso])

  if (usuario) return <Navigate to="/" replace />

  const segundos = Math.max(0, Math.ceil((reenviarEn - ahora) / 1000))

  const marcarEnvio = (r: { reenviarEn?: string }) => {
    const hasta = new Date(String(r.reenviarEn)).getTime()
    setReenviarEn(Number.isNaN(hasta) ? 0 : hasta)
    setAhora(Date.now())
  }

  const mostrar = (error: unknown) => {
    const { campo, texto } = traducir(error)
    if (campo) setErrores({ [campo]: texto })
    else setFalla(texto)
    if (error instanceof ErrorApi && error.codigo === 'OTP_LIMITE_REENVIO')
      marcarEnvio(error.datos)
  }

  const pedirCodigo = async (e: FormEvent) => {
    e.preventDefault()
    const limpio = correo.trim()
    const nuevos = {
      correo: correoValido(limpio)
        ? undefined
        : t('autenticacion.recuperacion.correo_invalido'),
    }
    setErrores(nuevos)
    setFalla(null)
    if (nuevos.correo) return
    setEnviando(true)
    try {
      marcarEnvio(await api.recuperarContrasena(limpio))
      setCorreo(limpio)
      setReenviado(false)
      setPaso('codigo')
    } catch (error) {
      mostrar(error)
    } finally {
      setEnviando(false)
    }
  }

  // Quien ya recibió un código (o chocó con el límite de reenvío) puede pasar directo a escribirlo.
  const yaTengoCodigo = () => {
    const limpio = correo.trim()
    if (!correoValido(limpio)) {
      setErrores({ correo: t('autenticacion.recuperacion.correo_invalido') })
      return
    }
    setCorreo(limpio)
    setErrores({})
    setFalla(null)
    setReenviado(false)
    setPaso('codigo')
  }

  const reenviar = async () => {
    setErrores({})
    setFalla(null)
    setReenviando(true)
    try {
      marcarEnvio(await api.recuperarContrasena(correo))
      setReenviado(true)
    } catch (error) {
      mostrar(error)
    } finally {
      setReenviando(false)
    }
  }

  const cambiar = async (e: FormEvent) => {
    e.preventDefault()
    const nuevos = {
      codigo: /^\d{6}$/.test(codigo)
        ? undefined
        : t('autenticacion.recuperacion.codigo_requerido'),
      contrasena: contrasenaValida(contrasena)
        ? undefined
        : t('autenticacion.recuperacion.contrasena_debil'),
    }
    setErrores(nuevos)
    setFalla(null)
    if (nuevos.codigo || nuevos.contrasena) return
    setEnviando(true)
    try {
      await api.restablecerContrasena(correo, codigo, contrasena)
      navegar('/iniciar-sesion', {
        replace: true,
        state: { contrasenaCambiada: true },
      })
    } catch (error) {
      mostrar(error)
      setEnviando(false)
    }
  }

  return (
    <div className={estilos.pagina}>
      <div className={estilos.tarjeta}>
        <Link to="/iniciar-sesion" className={estilos.miga}>
          {t('autenticacion.recuperacion.volver')}
        </Link>
        <div>
          <h1 className={estilos.titulo}>
            {t('autenticacion.recuperacion.titulo')}
          </h1>
          {paso === 'correo' && (
            <p className={estilos.ayuda}>
              {t('autenticacion.recuperacion.descripcion')}
            </p>
          )}
        </div>
        {falla && (
          <p role="alert" className={estilos.falla}>
            {falla}
          </p>
        )}
        {paso === 'correo' ? (
          <form
            className={estilos.formulario}
            onSubmit={pedirCodigo}
            noValidate
          >
            <Campo
              ref={primerCampo}
              etiqueta={t('autenticacion.recuperacion.correo')}
              type="email"
              autoComplete="email"
              placeholder={t('autenticacion.sesion.correo_ejemplo')}
              value={correo}
              onChange={(e) => setCorreo(e.target.value)}
              error={errores.correo}
            />
            <Boton
              type="submit"
              anchoCompleto
              cargando={enviando}
              etiqueta={t(
                enviando
                  ? 'autenticacion.recuperacion.enviando'
                  : 'autenticacion.recuperacion.enviar',
              )}
            />
            <Boton
              variante="texto"
              etiqueta={t('autenticacion.recuperacion.ya_tengo_codigo')}
              onClick={yaTengoCodigo}
            />
          </form>
        ) : (
          <form className={estilos.formulario} onSubmit={cambiar} noValidate>
            <p role="status" className={estilos.aviso}>
              {t(
                reenviado
                  ? 'autenticacion.recuperacion.reenviado'
                  : 'autenticacion.recuperacion.solicitud_enviada',
              ).replace('{correo}', () => correo)}
            </p>
            <Campo
              ref={primerCampo}
              etiqueta={t('autenticacion.recuperacion.codigo')}
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              value={codigo}
              onChange={(e) => setCodigo(e.target.value.replace(/\D/g, ''))}
              error={errores.codigo}
            />
            <Campo
              etiqueta={t('autenticacion.recuperacion.contrasena')}
              type={verContrasena ? 'text' : 'password'}
              autoComplete="new-password"
              value={contrasena}
              onChange={(e) => setContrasena(e.target.value)}
              ayuda={t('autenticacion.recuperacion.contrasena_ayuda')}
              error={errores.contrasena}
            />
            <Boton
              variante="texto"
              etiqueta={t(
                verContrasena
                  ? 'autenticacion.sesion.ocultar_contrasena'
                  : 'autenticacion.sesion.mostrar_contrasena',
              )}
              onClick={() => setVerContrasena(!verContrasena)}
            />
            <Boton
              type="submit"
              anchoCompleto
              cargando={enviando}
              etiqueta={t(
                enviando
                  ? 'autenticacion.recuperacion.cambiando'
                  : 'autenticacion.recuperacion.cambiar',
              )}
            />
            <Boton
              variante="secundario"
              anchoCompleto
              disabled={segundos > 0}
              cargando={reenviando}
              etiqueta={
                reenviando
                  ? t('autenticacion.recuperacion.reenviando')
                  : segundos > 0
                    ? t('autenticacion.recuperacion.reenviar_en').replace(
                        '{segundos}',
                        () => String(segundos),
                      )
                    : t('autenticacion.recuperacion.reenviar')
              }
              onClick={reenviar}
            />
            <Boton
              variante="texto"
              etiqueta={t('autenticacion.recuperacion.otro_correo')}
              onClick={() => {
                setErrores({})
                setFalla(null)
                setCodigo('')
                setContrasena('')
                setPaso('correo')
              }}
            />
          </form>
        )}
      </div>
    </div>
  )
}
