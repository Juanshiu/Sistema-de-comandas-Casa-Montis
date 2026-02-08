import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Panel Admin SaaS - Montis Cloud',
  description: 'Panel de administración del sistema SaaS',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body className="bg-slate-900 text-white">{children}</body>
    </html>
  );
}
