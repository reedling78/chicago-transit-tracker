/**
 * @jest-environment node
 */

afterEach(() => {
  jest.resetModules()
})

describe('POST /api/apple-redirect', () => {
  it('forwards form-post fields from Apple as a fragment on the ctt:// deep link', async () => {
    const { POST } = await import('@/app/api/apple-redirect/route')
    const body = new URLSearchParams({
      id_token: 'eyJ-token',
      code: 'apple-auth-code',
      state: 'state-xyz',
    })
    const req = new Request('http://localhost/api/apple-redirect', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    })
    const res = await POST(req as never)
    expect(res.status).toBe(200)
    expect(res.headers.get('content-type')).toMatch(/text\/html/)
    expect(res.headers.get('cache-control')).toBe('no-store')
    const html = await res.text()
    expect(html).toContain(
      'ctt://apple-callback#id_token=eyJ-token&code=apple-auth-code&state=state-xyz',
    )
    // Sanity: noindex meta + auto-redirect both present
    expect(html).toContain('noindex')
    expect(html).toContain('http-equiv="refresh"')
  })

  it('returns the bare deep link when there are no form fields', async () => {
    const { POST } = await import('@/app/api/apple-redirect/route')
    const req = new Request('http://localhost/api/apple-redirect', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: '',
    })
    const res = await POST(req as never)
    expect(res.status).toBe(200)
    const html = await res.text()
    expect(html).toContain('ctt://apple-callback"')
    expect(html).not.toContain('ctt://apple-callback#')
  })

  it('encodes URL-unsafe characters in form values when re-emitting them', async () => {
    const { POST } = await import('@/app/api/apple-redirect/route')
    const body = new URLSearchParams({
      id_token: 'value with spaces & ampersands',
    })
    const req = new Request('http://localhost/api/apple-redirect', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    })
    const res = await POST(req as never)
    const html = await res.text()
    // URLSearchParams.toString() uses + for spaces and %26 for &
    expect(html).toContain('ctt://apple-callback#id_token=value+with+spaces+%26+ampersands')
  })
})

describe('GET /api/apple-redirect', () => {
  it('forwards query-string params as a query-string on the deep link', async () => {
    const { GET } = await import('@/app/api/apple-redirect/route')
    const req = new Request('http://localhost/api/apple-redirect?error=user_cancelled')
    const res = await GET(req as never)
    expect(res.status).toBe(200)
    const html = await res.text()
    expect(html).toContain('ctt://apple-callback?error=user_cancelled')
  })

  it('returns the bare deep link when there are no query params', async () => {
    const { GET } = await import('@/app/api/apple-redirect/route')
    const req = new Request('http://localhost/api/apple-redirect')
    const res = await GET(req as never)
    const html = await res.text()
    expect(html).toContain('ctt://apple-callback"')
    expect(html).not.toContain('ctt://apple-callback?')
  })
})
