import { NextRequest, NextResponse } from 'next/server'

const APP_SCHEME = 'ctt'
const CALLBACK_PATH = 'apple-callback'

function buildHtml(deepLink: string): string {
  const safeUrl = JSON.stringify(deepLink)
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>Completing sign-in</title>
  <meta name="robots" content="noindex,nofollow">
  <meta http-equiv="refresh" content="0; url=${deepLink}">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, system-ui, sans-serif; padding: 2rem; text-align: center; color: #333; }
  </style>
</head>
<body>
  <p>Completing sign-in&hellip;</p>
  <script>(function(){window.location.replace(${safeUrl});})();</script>
</body>
</html>`
}

function htmlResponse(body: string): NextResponse {
  return new NextResponse(body, {
    status: 200,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  })
}

export async function POST(req: NextRequest) {
  const formData = await req.formData()
  const params = new URLSearchParams()
  for (const [key, value] of formData.entries()) {
    if (typeof value === 'string') params.set(key, value)
  }
  const fragment = params.toString()
  const deepLink = fragment
    ? `${APP_SCHEME}://${CALLBACK_PATH}#${fragment}`
    : `${APP_SCHEME}://${CALLBACK_PATH}`
  return htmlResponse(buildHtml(deepLink))
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url)
  const search = url.searchParams.toString()
  const deepLink = search
    ? `${APP_SCHEME}://${CALLBACK_PATH}?${search}`
    : `${APP_SCHEME}://${CALLBACK_PATH}`
  return htmlResponse(buildHtml(deepLink))
}
