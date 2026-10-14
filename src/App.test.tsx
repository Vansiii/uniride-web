import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import App from './App'
import { t } from './i18n'

describe('App', () => {
  it('muestra el nombre del panel desde los textos es-BO', () => {
    render(<App />)
    expect(screen.getByRole('heading').textContent).toBe('UniRide')
  })
})

describe('t()', () => {
  it('devuelve la clave si el texto no existe', () => {
    expect(t('no.existe')).toBe('no.existe')
  })
})
