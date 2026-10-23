import { useEffect } from 'react'
import { t } from '../i18n'

/** Título de la pestaña del navegador: "Organizaciones · UniRide" (DESIGN_SYSTEM §14.4). */
export function useTituloDocumento(titulo: string) {
  useEffect(() => {
    document.title = `${titulo} · ${t('aplicacion.nombre')}`
  }, [titulo])
}
