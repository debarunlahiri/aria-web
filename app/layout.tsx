import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import { Analytics } from "@vercel/analytics/next"
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Aria',
  description: 'Your intelligent assistant powered by Google Gemini',
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  viewportFit: 'cover',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.className} dark:bg-black`}>
        {children}
        <Analytics />
      </body>
    </html>
  )
}

