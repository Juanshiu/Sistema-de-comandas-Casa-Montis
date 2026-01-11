import type { Metadata } from 'next'
import './globals.css'
import { Providers } from '@/components/Providers'

export const metadata: Metadata = {
  title: 'Casa Montis - Sistema de Comandas',
  description: 'Sistema de comandas para restaurante Casa Montis',
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
