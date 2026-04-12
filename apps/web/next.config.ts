import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  serverExternalPackages: ['firebase-admin'],
  transpilePackages: ['@ctt/shared'],
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'storage.googleapis.com',
        pathname: '/chicago-transit-tracker.firebasestorage.app/**',
      },
    ],
  },
}

export default nextConfig
