/**
 * @jest-environment node
 */

jest.mock('next/font/google', () => ({
  Geist: () => ({ className: 'mock-geist' }),
}))

jest.mock('@components/Navbar', () => () => null)
jest.mock('@components/Footer', () => () => null)
jest.mock('@components/Analytics', () => () => null)

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { metadata } = require('../app/layout')

describe('root layout metadata', () => {
  it('references the PWA manifest so iOS/Android home-screen bookmarks use the generated icons', () => {
    expect(metadata.manifest).toBe('/site.webmanifest')
  })

  it('still exposes the required OpenGraph and Twitter fields', () => {
    expect(metadata.openGraph).toBeDefined()
    expect(metadata.openGraph.type).toBe('website')
    expect(metadata.twitter).toBeDefined()
    expect(metadata.twitter.card).toBe('summary_large_image')
  })

  it('does not inject the legacy gtag script (analytics goes through Firebase)', () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const fs = require('fs')
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const path = require('path')
    const layoutSource = fs.readFileSync(path.join(__dirname, '..', 'app', 'layout.tsx'), 'utf-8')
    expect(layoutSource).not.toMatch(/googletagmanager\.com/)
    expect(layoutSource).not.toMatch(/gtag\(/)
    expect(layoutSource).not.toMatch(/siteConfig\.gaId/)
  })
})
