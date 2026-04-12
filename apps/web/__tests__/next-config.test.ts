/**
 * @jest-environment node
 *
 * Guards the next/image remotePatterns allowlist so uploaded station photos
 * from the Firebase Storage bucket keep rendering via <Image>.
 */

import nextConfig from '../next.config'

describe('next.config.ts images.remotePatterns', () => {
  it('allowlists the Firebase Storage bucket for next/image', () => {
    const patterns = nextConfig.images?.remotePatterns ?? []
    const match = patterns.find(
      (p) => p.hostname === 'storage.googleapis.com' && p.protocol === 'https',
    )
    expect(match).toBeDefined()
    expect(match?.pathname).toContain('chicago-transit-tracker.firebasestorage.app')
  })
})
