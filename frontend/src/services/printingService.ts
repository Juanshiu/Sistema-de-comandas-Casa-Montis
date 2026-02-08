import { Comanda, ItemComanda } from '@/types';

const PLUGIN_URL = 'http://localhost:8001';

export interface PrinterStatus {
  success: boolean;
  servicio?: string;
  version?: string;
  activo?: boolean;
  error?: string;
}

export const printingService = {
  /**
   * Verifica si el plugin de impresión está activo
   */
  async checkStatus(): Promise<boolean> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000); // 2s timeout
      
      const res = await fetch(`${PLUGIN_URL}/status`, { 
        signal: controller.signal,
        method: 'GET'
      });
      clearTimeout(timeoutId);
      
      if (res.ok) {
        const data = await res.json();
        return data.success && data.activo;
      }
      return false;
    } catch (error) {
      return false;
    }
  },

  /**
   * Obtiene la lista de impresoras disponibles en el equipo local
   */
  async getPrinters(): Promise<string[]> {
    try {
      const res = await fetch(`${PLUGIN_URL}/impresoras`);
      if (res.ok) {
        const data = await res.json();
        return data.success ? data.impresoras : [];
      }
      return [];
    } catch (error) {
      console.error('Error al obtener impresoras:', error);
      return [];
    }
  },

  /**
   * Envía un texto plano a imprimir
   */
  async printRaw(text: string, printerName: string): Promise<{ success: boolean; message?: string; error?: string }> {
    try {
      const res = await fetch(`${PLUGIN_URL}/imprimir`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          texto: text,
          impresora: printerName,
          cortar: true,
          encoding: 'cp850'
        })
      });
      
      const data = await res.json();
      return data;
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }
};
