'use client';

import { Suspense, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';

export default function ReciboPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-screen">
          <p>Cargando recibo...</p>
        </div>
      }
    >
      <ReciboContent />
    </Suspense>
  );
}

function ReciboContent() {
  const searchParams = useSearchParams();
  const data = searchParams.get('data');

  useEffect(() => {
    // Auto-abrir diálogo de impresión
    const timer = setTimeout(() => {
      window.print();
    }, 300);

    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    // Cerrar automáticamente después de imprimir
    const handleAfterPrint = () => {
      setTimeout(() => {
        window.close();
      }, 500);
    };

    window.addEventListener('afterprint', handleAfterPrint);
    return () => window.removeEventListener('afterprint', handleAfterPrint);
  }, []);

  if (!data) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p>No hay datos de recibo</p>
      </div>
    );
  }

  // Decodificar desde base64
  const reciboContent = decodeURIComponent(escape(atob(data)));

  return (
    <>
      <style jsx global>{`
        @media print {
          @page {
            size: 80mm auto;
            margin: 0;
          }
          body {
            margin: 0 !important;
            padding: 2mm !important;
            width: 80mm;
          }
          .recibo-container {
            width: 100% !important;
            max-width: 100% !important;
          }
          .recibo-content {
            font-size: 10pt !important;
            line-height: 1.3 !important;
            font-weight: 700 !important;
            color: #000 !important;
          }
        }
        body {
          font-family: 'Courier New', 'Courier', monospace;
          font-size: 12px;
          line-height: 1.35;
          margin: 0;
          padding: 10px;
          background-color: white;
        }
        .recibo-container {
          width: 100%;
          max-width: 80mm;
          margin: 0 auto;
        }
        .recibo-content {
          white-space: pre-wrap;
          font-weight: 700;
          color: #000;
          word-wrap: break-word;
        }
      `}</style>
      
      <div className="recibo-container">
        <div className="recibo-content">{reciboContent}</div>
      </div>
    </>
  );
}
