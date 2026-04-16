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
})
