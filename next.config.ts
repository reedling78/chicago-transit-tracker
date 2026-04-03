import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  output: 'export',
  serverExternalPackages: ['firebase-admin'],
}

export default nextConfig
