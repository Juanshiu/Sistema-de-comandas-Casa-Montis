/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Configurar para conectar al backend usando variable de entorno
  async rewrites() {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
    
    return [
      {
        source: '/api/:path*',
        destination: `${apiUrl}/api/:path*`,
      },
    ];
  },
};

module.exports = nextConfig;
