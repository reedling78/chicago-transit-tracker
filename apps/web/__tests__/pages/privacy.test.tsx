import { render, screen } from '@testing-library/react'
import PrivacyPage from '@/app/privacy/page'

describe('PrivacyPage', () => {
  it('renders the page title and effective date', () => {
    render(<PrivacyPage />)
    expect(
      screen.getByRole('heading', { level: 1, name: /privacy statement/i }),
    ).toBeInTheDocument()
    expect(screen.getByText(/effective date: may 2026/i)).toBeInTheDocument()
  })

  it('discloses every account-data field we persist to Firestore', () => {
    // Each entry must match a data type listed in App Store Connect's App
    // Privacy section. Keep this test in sync with packages/shared/src/types.ts
    // (UserProfile) and the AuthProvider implementations on web + mobile so a
    // mismatch here trips the suite before App Store review trips on it.
    render(<PrivacyPage />)
    const account = screen.getByRole('heading', { name: /account data/i })
    expect(account).toBeInTheDocument()

    const body = document.body.textContent ?? ''
    expect(body).toMatch(/email address/i)
    expect(body).toMatch(/display name/i)
    expect(body).toMatch(/profile photo/i)
    expect(body).toMatch(/sign-in provider/i)
    expect(body).toMatch(/firebase user id/i)
    expect(body).toMatch(/favorites/i)
    expect(body).toMatch(/timestamps when your account was created/i)
  })

  it('explains where account data is stored and the access model', () => {
    render(<PrivacyPage />)
    const body = document.body.textContent ?? ''
    expect(body).toMatch(/firebase authentication/i)
    expect(body).toMatch(/firebase firestore/i)
    expect(body).toMatch(/owner-only access/i)
  })

  it('keeps the analytics disclosure and the GA opt-out link', () => {
    render(<PrivacyPage />)
    expect(screen.getByRole('heading', { name: /analytics/i })).toBeInTheDocument()
    expect(
      screen.getByRole('link', { name: /google analytics opt-out browser add-on/i }),
    ).toHaveAttribute('href', expect.stringContaining('tools.google.com/dlpage/gaoptout'))
  })

  it('provides a deletion contact path for App Store compliance', () => {
    // Apple requires a documented account-deletion flow. The privacy policy
    // is the canonical place for the email address; if it's removed, App
    // Store review will reject.
    render(<PrivacyPage />)
    const link = screen.getByRole('link', { name: /reed\.rizzo@gmail\.com/i })
    expect(link).toHaveAttribute('href', expect.stringContaining('mailto:reed.rizzo@gmail.com'))
  })

  it('exports the metadata required by the SEO standing rule', async () => {
    const { metadata } = await import('@/app/privacy/page')
    expect(metadata.title).toBe('Privacy Statement')
    expect(metadata.description).toBeTruthy()
    expect(metadata.openGraph?.title).toContain('Privacy Statement')
    expect(metadata.openGraph?.url).toMatch(/\/privacy$/)
    expect(metadata.openGraph?.type).toBe('website')
    expect(metadata.twitter?.card).toBe('summary_large_image')
  })
})
