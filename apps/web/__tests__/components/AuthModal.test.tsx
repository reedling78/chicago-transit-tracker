import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'

const mockSignInWithEmail = jest.fn()
const mockSignUpWithEmail = jest.fn()
const mockResetPassword = jest.fn()
const mockSignInWithGoogle = jest.fn()
const mockSignInWithApple = jest.fn()

jest.mock('../../app/lib/auth', () => ({
  signInWithEmail: jest.fn((...args) => mockSignInWithEmail(...args)),
  signUpWithEmail: jest.fn((...args) => mockSignUpWithEmail(...args)),
  resetPassword: jest.fn((...args) => mockResetPassword(...args)),
  signInWithGoogle: jest.fn((...args) => mockSignInWithGoogle(...args)),
  signInWithApple: jest.fn((...args) => mockSignInWithApple(...args)),
}))

jest.mock('../../app/lib/firebase-client', () => ({
  auth: {},
  db: {},
}))

import AuthModal from '../../app/components/AuthModal'

describe('AuthModal', () => {
  const onClose = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders sign-in form by default', () => {
    render(<AuthModal onClose={onClose} />)
    expect(screen.getByRole('heading', { name: 'Sign In' })).toBeInTheDocument()
    expect(screen.getByLabelText('Email')).toBeInTheDocument()
    expect(screen.getByLabelText('Password')).toBeInTheDocument()
  })

  it('switches to sign-up mode', () => {
    render(<AuthModal onClose={onClose} />)
    fireEvent.click(screen.getByText('Create account'))
    expect(screen.getByRole('heading', { name: 'Create Account' })).toBeInTheDocument()
  })

  it('opens directly in sign-up mode when initialMode="signUp"', () => {
    render(<AuthModal onClose={onClose} initialMode="signUp" />)
    expect(screen.getByRole('heading', { name: 'Create Account' })).toBeInTheDocument()
  })

  it('switches to reset password mode', () => {
    render(<AuthModal onClose={onClose} />)
    fireEvent.click(screen.getByText('Forgot password?'))
    expect(screen.getByText('Reset Password')).toBeInTheDocument()
    expect(screen.queryByLabelText('Password')).not.toBeInTheDocument()
  })

  it('calls signInWithEmail on sign-in submit', async () => {
    mockSignInWithEmail.mockResolvedValue({ user: { uid: '123' } })
    render(<AuthModal onClose={onClose} />)

    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'test@example.com' } })
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'password123' } })
    fireEvent.submit(screen.getByLabelText('Email').closest('form')!)

    await waitFor(() => {
      expect(mockSignInWithEmail).toHaveBeenCalledWith('test@example.com', 'password123')
      expect(onClose).toHaveBeenCalled()
    })
  })

  it('calls resetPassword on reset submit', async () => {
    mockResetPassword.mockResolvedValue(undefined)
    render(<AuthModal onClose={onClose} />)

    fireEvent.click(screen.getByText('Forgot password?'))
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'test@example.com' } })
    fireEvent.submit(screen.getByLabelText('Email').closest('form')!)

    await waitFor(() => {
      expect(mockResetPassword).toHaveBeenCalledWith('test@example.com')
      expect(screen.getByText(/check your email/i)).toBeInTheDocument()
    })
  })

  it('shows error on failed sign-in', async () => {
    mockSignInWithEmail.mockRejectedValue(new Error('Invalid credentials'))
    render(<AuthModal onClose={onClose} />)

    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'test@example.com' } })
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'wrong' } })
    fireEvent.submit(screen.getByLabelText('Email').closest('form')!)

    await waitFor(() => {
      expect(screen.getByText('Invalid credentials')).toBeInTheDocument()
    })
  })

  it('renders social sign-in buttons', () => {
    render(<AuthModal onClose={onClose} />)
    expect(screen.getByText('Google')).toBeInTheDocument()
    expect(screen.getByText('Apple')).toBeInTheDocument()
    expect(screen.queryByText('Facebook')).not.toBeInTheDocument()
  })

  it('calls signInWithGoogle when Google button is clicked', async () => {
    mockSignInWithGoogle.mockResolvedValue({ user: { uid: '123' } })
    render(<AuthModal onClose={onClose} />)
    fireEvent.click(screen.getByText('Google'))

    await waitFor(() => {
      expect(mockSignInWithGoogle).toHaveBeenCalled()
      expect(onClose).toHaveBeenCalled()
    })
  })

  it('closes when backdrop is clicked', () => {
    render(<AuthModal onClose={onClose} />)
    // The outer div is the backdrop
    fireEvent.click(screen.getByRole('heading', { name: 'Sign In' }).closest('[class*="fixed"]')!)
    expect(onClose).toHaveBeenCalled()
  })

  it('closes when close button is clicked', () => {
    render(<AuthModal onClose={onClose} />)
    fireEvent.click(screen.getByLabelText('Close'))
    expect(onClose).toHaveBeenCalled()
  })

  it('closes when Escape key is pressed', () => {
    render(<AuthModal onClose={onClose} />)
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(onClose).toHaveBeenCalled()
  })
})
