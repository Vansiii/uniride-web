import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import App from './App'
import { t } from './i18n'

vi.mock('./api/cliente', async (original) => ({
  ...(await original<typeof import('./api/cliente')>()),
  renovarSesion: vi.fn().mockResolvedValue(false),
}))

describe('App', () => {
  it('sin sesión lleva a la pantalla de inicio de sesión', async () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <App />
      </MemoryRouter>,
    )
    expect(
      await screen.findByRole('heading', { name: 'Iniciar sesión' }),
    ).toBeTruthy()
  })
})

describe('t()', () => {
  it('devuelve la clave si el texto no existe', () => {
    expect(t('no.existe')).toBe('no.existe')
  })
})
