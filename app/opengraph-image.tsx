import { ImageResponse } from 'next/og'
import { readFileSync } from 'fs'
import path from 'path'
import { siteConfig } from '@lib/siteConfig'

export const runtime = 'nodejs'
export const dynamic = 'force-static'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default function OgImage() {
  const svgData = readFileSync(path.join(process.cwd(), 'public/logo.svg'))
  const base64Svg = Buffer.from(svgData).toString('base64')
  const logoSrc = `data:image/svg+xml;base64,${base64Svg}`

  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        backgroundColor: '#0f172a',
        padding: '72px 80px',
        gap: '64px',
      }}
    >
      {/* Logo */}
      <img src={logoSrc} width={260} height={260} alt="" />

      {/* Text */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', flex: 1 }}>
        <div
          style={{
            fontSize: '68px',
            fontWeight: 800,
            color: '#ffffff',
            lineHeight: 1.05,
            letterSpacing: '-1px',
          }}
        >
          {siteConfig.name}
        </div>
        <div
          style={{
            fontSize: '28px',
            color: '#7BD3F7',
            lineHeight: 1.4,
          }}
        >
          CTA &amp; Metra lines, stations, and schedules
        </div>
      </div>
    </div>,
    { ...size },
  )
}
