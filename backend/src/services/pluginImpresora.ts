/**
 * Plugin HTTP propio para impresión térmica
 * Inspirado en el concepto de quiero1app.com
 * 
 * Servidor HTTP local que recibe peticiones y envía comandos ESC/POS
 * a la impresora USB sin intermediarios ni marcas de agua
 */

import express, { Request, Response } from 'express';
import * as os from 'os';
import * as fs from 'fs';
import * as path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import { getFechaHoraColombia } from '../utils/dateUtils';

const execAsync = promisify(exec);

const app = express();
const PORT = 8001; // Puerto diferente al plugin de Parzibyte

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// CORS para permitir peticiones desde el backend
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

interface OperacionImpresion {
  texto: string;
  impresora: string;
  cortar?: boolean;
  encoding?: string;
}

/**
 * Convierte texto a bytes con encoding específico
 */
function convertirABytes(texto: string, encoding: string = 'cp850'): Buffer {
  // CP850 (DOS Latin 1) - Encoding para impresoras térmicas en LATAM
  // Para Xprinter: usar mapeo directo ASCII extendido
  if (encoding === 'cp850') {
    const mapaCP850: { [key: string]: number } = {
      // Minúsculas con tilde - posiciones ASCII extendido
      'á': 0xE1, 'é': 0xE9, 'í': 0xED, 'ó': 0xF3, 'ú': 0xFA,
      // Mayúsculas con tilde
      'Á': 0xC1, 'É': 0xC9, 'Í': 0xCD, 'Ó': 0xD3, 'Ú': 0xDA,
      // Eñes
      'ñ': 0xF1, 'Ñ': 0xD1,
      // Signos especiales
      '¿': 0xBF, '¡': 0xA1,
      '°': 0xB0, '€': 0x80
    };

    const bytes: number[] = [];
    
    for (let i = 0; i < texto.length; i++) {
      const char = texto[i];
      const code = char.charCodeAt(0);
      
      // Si es carácter especial español, usar mapeo (IMPORTANTE: !== undefined)
      if (mapaCP850[char] !== undefined) {
        bytes.push(mapaCP850[char]);
      }
      // Si es ASCII estándar (0-127), usar directo
      else if (code < 128) {
        bytes.push(code);
      }
      // Otros caracteres, usar '?'
      else {
        bytes.push(0x3F); // '?'
      }
    }
    
    return Buffer.from(bytes);
  }
  
  // ISO-8859-1 (Latin-1) - Alternativo
  if (encoding === 'latin1' || encoding === 'iso-8859-1') {
    // En Latin-1, los caracteres españoles están en posiciones naturales:
    // á=225, é=233, í=237, ó=243, ú=250
    // Á=193, É=201, Í=205, Ó=211, Ú=218
    // ñ=241, Ñ=209
    const bytes: number[] = [];
    
    for (let i = 0; i < texto.length; i++) {
      const char = texto[i];
      const code = char.charCodeAt(0);
      
      // Latin-1 usa directamente los códigos Unicode para el rango 0-255
      if (code <= 255) {
        bytes.push(code);
      } else {
        // Caracteres fuera del rango Latin-1
        bytes.push(0x3F); // '?'
      }
    }
    
    return Buffer.from(bytes);
  }
  
  // ISO-8859-1 (Latin-1) - Alternativo
  if (encoding === 'latin1' || encoding === 'iso-8859-1') {
    // En Latin-1, los caracteres españoles están en posiciones naturales:
    // á=225, é=233, í=237, ó=243, ú=250
    // Á=193, É=201, Í=205, Ó=211, Ú=218
    // ñ=241, Ñ=209
    const bytes: number[] = [];
    
    for (let i = 0; i < texto.length; i++) {
      const char = texto[i];
      const code = char.charCodeAt(0);
      
      // Latin-1 usa directamente los códigos Unicode para el rango 0-255
      if (code <= 255) {
        bytes.push(code);
      } else {
        // Caracteres fuera del rango Latin-1
        bytes.push(0x3F); // '?'
      }
    }
    
    return Buffer.from(bytes);
  }
  
  // CP437 (IBM PC) - Alternativo (tabla USA estándar)
  if (encoding === 'cp437') {
    // Mapeo completo CP437 para caracteres españoles
    const mapaCP437: { [key: string]: number } = {
      // Minúsculas con tilde
      'á': 160, 'é': 130, 'í': 161, 'ó': 162, 'ú': 163,
      // Mayúsculas con tilde  
      'Á': 181, 'É': 144, 'Í': 214, 'Ó': 224, 'Ú': 233,
      // Eñes
      'ñ': 164, 'Ñ': 165,
      // Signos especiales
      '¿': 168, '¡': 173,
      '°': 248, '€': 238,
      // Diéresis
      'ü': 129, 'Ü': 154,
      // Otros caracteres latinos
      'ç': 135, 'Ç': 128
    };

    const bytes: number[] = [];
    
    for (let i = 0; i < texto.length; i++) {
      const char = texto[i];
      const code = char.charCodeAt(0);
      
      // Si es carácter especial español, usar mapeo CP437 (IMPORTANTE: !== undefined)
      if (mapaCP437[char] !== undefined) {
        bytes.push(mapaCP437[char]);
      }
      // Si es ASCII estándar (0-127), usar directo
      else if (code < 128) {
        bytes.push(code);
      }
      // Otros caracteres, usar '?'
      else {
        bytes.push(0x3F); // '?'
      }
    }
    
    return Buffer.from(bytes);
  }
  
  // ANSI (Windows-1252) - Alternativo
  if (encoding === 'ansi' || encoding === 'windows-1252') {
    const bytes: number[] = [];
    
    for (let i = 0; i < texto.length; i++) {
      const char = texto[i];
      const code = char.charCodeAt(0);
      
      if (code < 256) {
        bytes.push(code);
      } else {
        bytes.push(0x3F); // '?'
      }
    }
    
    return Buffer.from(bytes);
  }
  
  // CP850 - Encoding alternativo (DOS Latin)
  if (encoding === 'cp850') {
    const mapaCP850: { [key: string]: number } = {
      'á': 0xA0, 'é': 0x82, 'í': 0xA1, 'ó': 0xA2, 'ú': 0xA3,
      'Á': 0xB5, 'É': 0x90, 'Í': 0xD6, 'Ó': 0xE0, 'Ú': 0xE9,
      'ñ': 0xA4, 'Ñ': 0xA5,
      '¿': 0xA8, '¡': 0xAD,
      '°': 0xF8, '€': 0xEE
    };

    const bytes: number[] = [];
    
    for (let i = 0; i < texto.length; i++) {
      const char = texto[i];
      const code = char.charCodeAt(0);
      
      // Si es carácter especial español, usar mapeo
      if (mapaCP850[char]) {
        bytes.push(mapaCP850[char]);
      }
      // Si es ASCII estándar (0-127), usar directo
      else if (code < 128) {
        bytes.push(code);
      }
      // Otros caracteres, intentar conversión
      else {
        bytes.push(code & 0xFF);
      }
    }
    
    return Buffer.from(bytes);
  }
  
  // UTF-8 - Para compatibilidad
  if (encoding === 'utf-8' || encoding === 'utf8') {
    return Buffer.from(texto, 'utf8');
  }
  
  // Default: usar el encoding como string de Node.js
  try {
    return Buffer.from(texto, encoding as BufferEncoding);
  } catch (error) {
    console.warn(`⚠️  Encoding '${encoding}' no reconocido, usando ANSI por defecto`);
    return convertirABytes(texto, 'ansi');
  }
}

/**
 * Genera comandos ESC/POS para inicializar impresora
 */
function comandosInicializar(): Buffer {
  return Buffer.from([
    0x1B, 0x40,        // ESC @ - Inicializar impresora
    0x1B, 0x74, 0x00,  // ESC t 0 - Tabla de caracteres 0 (USA/Standard) - Más compatible con Xprinter
    0x1D, 0x21, 0x11,  // GS ! 17 - Fuente ligeramente más grande (altura x2, ancho x2)
  ]);
}

/**
 * Genera comandos ESC/POS para cortar papel
 */
function comandosCortar(): Buffer {
  return Buffer.from([
    0x1D, 0x56, 0x00   // GS V 0 - Corte parcial
  ]);
}

/**
 * Genera comandos ESC/POS para avanzar líneas
 */
function comandosAvanzar(lineas: number = 3): Buffer {
  return Buffer.from([
    0x1B, 0x64, lineas // ESC d n - Avanzar n líneas
  ]);
}

/**
 * Imprime en impresora Windows usando comandos nativos
 */
async function imprimirEnWindows(
  contenido: Buffer,
  nombreImpresora: string
): Promise<void> {
  const tempDir = os.tmpdir();
  const tempFile = path.join(tempDir, `comanda_${Date.now()}.bin`);
  
  try {
    // Escribir datos binarios al archivo temporal
    fs.writeFileSync(tempFile, contenido);
    
    // Enviar a impresora usando comando copy de Windows
    // Este método preserva los bytes exactos sin conversión
    const comando = `copy /b "${tempFile}" "\\\\localhost\\${nombreImpresora}"`;
    
    console.log('🖨️  Ejecutando:', comando);
    
    const { stdout, stderr } = await execAsync(comando, {
      windowsHide: true,
      encoding: 'buffer'
    });
    
    if (stderr && stderr.length > 0) {
      const errorText = stderr.toString('utf8');
      if (!errorText.includes('copiado') && !errorText.includes('copied')) {
        throw new Error(`Error de impresora: ${errorText}`);
      }
    }
    
    console.log('✅ Impresión enviada exitosamente');
    
  } catch (error: any) {
    console.error('❌ Error al imprimir:', error);
    throw error;
  } finally {
    // Limpiar archivo temporal
    try {
      if (fs.existsSync(tempFile)) {
        fs.unlinkSync(tempFile);
      }
    } catch (cleanupError) {
      console.warn('⚠️  No se pudo eliminar archivo temporal:', cleanupError);
    }
  }
}

/**
 * Endpoint principal de impresión
 * Compatible con formato similar al plugin de Parzibyte
 */
app.post('/imprimir', async (req: Request, res: Response) => {
  try {
    const { texto, impresora, cortar = true, encoding = 'cp850' } = req.body as OperacionImpresion;
    
    if (!texto) {
      return res.status(400).json({
        success: false,
        error: 'Falta el parámetro "texto"'
      });
    }
    
    if (!impresora) {
      return res.status(400).json({
        success: false,
        error: 'Falta el parámetro "impresora"'
      });
    }
    
    console.log(`📄 Recibida petición de impresión para: ${impresora}`);
    
    // Construir buffer de comandos ESC/POS
    const buffers: Buffer[] = [];
    
    // 1. Inicializar impresora
    buffers.push(comandosInicializar());
    
    // 2. Convertir texto con encoding correcto
    buffers.push(convertirABytes(texto, encoding));
    
    // 3. Avanzar líneas
    buffers.push(comandosAvanzar(3));
    
    // 4. Cortar papel si se solicita
    if (cortar) {
      buffers.push(comandosCortar());
    }
    
    // Combinar todos los buffers
    const contenidoCompleto = Buffer.concat(buffers);
    
    // Imprimir
    await imprimirEnWindows(contenidoCompleto, impresora);
    
    res.json({
      success: true,
      mensaje: 'Impresión completada',
      bytes: contenidoCompleto.length
    });
    
  } catch (error: any) {
    console.error('❌ Error en endpoint /imprimir:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Error desconocido'
    });
  }
});

/**
 * Endpoint de estado del servidor
 */
app.get('/status', (req: Request, res: Response) => {
  res.json({
    success: true,
    servicio: 'Plugin de Impresión Casa Montis',
    version: '1.0.0',
    puerto: PORT,
    sistema: os.platform(),
    activo: true
  });
});

/**
 * Endpoint para probar impresora
 */
app.post('/probar', async (req: Request, res: Response) => {
  try {
    const { impresora } = req.body;
    
    if (!impresora) {
      return res.status(400).json({
        success: false,
        error: 'Falta el parámetro "impresora"'
      });
    }
    
    const textoPrueba = `
================================
   PRUEBA DE IMPRESORA
================================
Fecha: ${getFechaHoraColombia().toLocaleString('es-CO')}
Sistema: Casa Montis

Caracteres especiales:
- Tildes minusculas: á é í ó ú
- Tildes mayusculas: Á É Í Ó Ú
- Enes: ñ Ñ  
- Signos: ¿ ¡ $ €

Palabras completas:
piña niño acción

Productos:
- RÓBALO A LA PLANCHA
- PECHUGA DE POLLO
- ALMUERZO DEL DÍA

Mesa: Principal-1
Total: $25,000

================================
    ✓ Prueba exitosa
================================
`;
    
    const buffers: Buffer[] = [];
    buffers.push(comandosInicializar());
    buffers.push(convertirABytes(textoPrueba, 'cp850'));
    buffers.push(comandosAvanzar(3));
    buffers.push(comandosCortar());
    
    const contenido = Buffer.concat(buffers);
    await imprimirEnWindows(contenido, impresora);
    
    res.json({
      success: true,
      mensaje: 'Prueba de impresión completada'
    });
    
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Iniciar servidor
 */
export function iniciarPluginImpresora(): void {
  app.listen(PORT, '127.0.0.1', () => {
    console.log('\n' + '='.repeat(50));
    console.log('🖨️  PLUGIN DE IMPRESIÓN CASA MONTIS');
    console.log('='.repeat(50));
    console.log(`✅ Servidor HTTP iniciado en http://127.0.0.1:${PORT}`);
    console.log(`📡 Endpoints disponibles:`);
    console.log(`   POST /imprimir - Imprimir contenido`);
    console.log(`   POST /probar   - Prueba de impresora`);
    console.log(`   GET  /status   - Estado del servicio`);
    console.log('='.repeat(50));
    console.log('💡 Sin marcas de agua | 100% control propio\n');
  });
}

// Si se ejecuta directamente este archivo
if (require.main === module) {
  iniciarPluginImpresora();
}
