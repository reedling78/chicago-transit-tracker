import { render, screen, fireEvent, act } from '@testing-library/react'
import ThemeToggle from '@components/ThemeToggle'

describe('ThemeToggle', () => {
  beforeEach(() => {
    // Start each test in light mode
    document.documentElement.classList.remove('dark')
    localStorage.removeItem('theme')
  })

  it('renders a button after mount', async () => {
    render(<ThemeToggle />)
    await act(async () => {})
    expect(screen.getByRole('button')).toBeInTheDocument()
  })

  it('has aria-label "Switch to dark mode" in light mode', async () => {
    render(<ThemeToggle />)
    await act(async () => {})
    expect(screen.getByRole('button')).toHaveAttribute('aria-label', 'Switch to dark mode')
  })

  it('has aria-label "Switch to light mode" when document is in dark mode', async () => {
    document.documentElement.classList.add('dark')
    render(<ThemeToggle />)
    await act(async () => {})
    expect(screen.getByRole('button')).toHaveAttribute('aria-label', 'Switch to light mode')
  })

  it('clicking toggles the aria-label from dark to light', async () => {
    render(<ThemeToggle />)
    await act(async () => {})
    const btn = screen.getByRole('button')
    expect(btn).toHaveAttribute('aria-label', 'Switch to dark mode')
    fireEvent.click(btn)
    expect(btn).toHaveAttribute('aria-label', 'Switch to light mode')
  })

  it('clicking adds .dark class to documentElement', async () => {
    render(<ThemeToggle />)
    await act(async () => {})
    fireEvent.click(screen.getByRole('button'))
    expect(document.documentElement.classList.contains('dark')).toBe(true)
  })

  it('persists theme preference to localStorage', async () => {
    render(<ThemeToggle />)
    await act(async () => {})
    fireEvent.click(screen.getByRole('button'))
    expect(localStorage.getItem('theme')).toBe('dark')
  })

  it('matches snapshot in light mode', async () => {
    const { container } = render(<ThemeToggle />)
    await act(async () => {})
    expect(container).toMatchSnapshot()
  })
})
