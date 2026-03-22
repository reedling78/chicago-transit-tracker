// app/layout.tsx
import type { Metadata } from 'next'
import { Geist } from 'next/font/google'
import './globals.css'
import Navbar from './components/Navbar'

const geist = Geist({ subsets: ['latin'] })

export const metadata: Metadata = {
  metadataBase: new URL('https://chicago-transit-tracker.com'),
  title: {
    template: '%s | Chicago Transit Tracker',
    default: 'Chicago Transit Tracker',
  },
  description: 'Track Chicago-area transit in real time.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={`${geist.className} bg-gray-50 min-h-screen`}>
        <Navbar />
        <main>{children}</main>
        <footer />
      </body>
    </html>
  )
}
