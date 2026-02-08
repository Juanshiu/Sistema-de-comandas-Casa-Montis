import type { Metadata } from 'next'
import './globals.css'
import { Providers } from '@/components/Providers'

export const metadata: Metadata = {
  title: 'Montis Cloud - Sistema de Comandas',
  description: 'Sistema de comandas para restaurantes Montis Cloud',
  icons: {
    icon: '/favicon.webp',
    shortcut: '/favicon.webp',
    apple: '/favicon.webp',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es">
      <body className="bg-secondary-50 min-h-screen">
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  )
}
