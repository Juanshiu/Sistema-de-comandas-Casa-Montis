'use client';

import { useEffect } from 'react';
import { useSearchParams } from 'next/navigation';

export default function FacturaPage() {
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
        <p>No hay datos de factura</p>
      </div>
    );
  }

  // Decodificar desde base64
  const facturaContent = decodeURIComponent(escape(atob(data)));

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
            padding: 0 !important;
            background-color: white !important;
            width: 80mm;
          }
          .factura-container {
            padding: 2mm !important;
            margin: 0 !important;
            box-shadow: none !important;
            border-radius: 0 !important;
            width: 100% !important;
            max-width: 100% !important;
          }
          .factura-content {
            font-size: 10pt !important;
            line-height: 1.3 !important;
            color: #000 !important;
            font-weight: 700 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
        }
        body {
          font-family: 'Courier New', 'Courier', monospace;
          margin: 0;
          padding: 10px;
          background-color: white;
        }
        .factura-container {
          background-color: white;
          padding: 5px;
          max-width: 80mm;
          margin: 0 auto;
        }
        .factura-content {
          white-space: pre-wrap;
          font-size: 12px;
          line-height: 1.35;
          color: #000;
          font-weight: 700;
          word-wrap: break-word;
        }
      `}</style>
      
      <div className="factura-container">
        <div className="factura-content">{facturaContent}</div>
      </div>
    </>
  );
}
