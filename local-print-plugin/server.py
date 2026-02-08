"""
Plugin de Impresión Local - Montis Cloud
Servidor HTTP para detección e impresión en impresoras térmicas
Compatible con Windows - Puerto 8001
"""

from flask import Flask, jsonify, request
from flask_cors import CORS
import subprocess
import json
import os
import sys
import tempfile
import platform
from datetime import datetime

app = Flask(__name__)
CORS(app)  # Permitir peticiones desde cualquier origen

PORT = 8001
VERSION = "2.0.0"


def obtener_impresoras():
    """
    Obtiene la lista de impresoras instaladas en Windows usando PowerShell
    """
    try:
        comando = 'powershell -Command "Get-Printer | Select-Object Name | ConvertTo-Json"'
        resultado = subprocess.run(
            comando,
            shell=True,
            capture_output=True,
            text=True,
            timeout=10
        )
        
        if resultado.returncode != 0:
            print(f"Error al ejecutar PowerShell: {resultado.stderr}")
            return []
        
        # Parsear JSON de PowerShell
        data = json.loads(resultado.stdout)
        
        # PowerShell devuelve un objeto si hay 1 impresora, array si hay múltiples
        if isinstance(data, list):
            return [printer['Name'] for printer in data]
        elif isinstance(data, dict) and 'Name' in data:
            return [data['Name']]
        
        return []
    
    except subprocess.TimeoutExpired:
        print("Timeout al consultar impresoras")
        return []
    except json.JSONDecodeError as e:
        print(f"Error al parsear JSON de impresoras: {e}")
        return []
    except Exception as e:
        print(f"Error inesperado al listar impresoras: {e}")
        return []


def imprimir_texto_raw(texto, impresora, cortar=True, encoding='cp850'):
    """
    Imprime texto raw en una impresora térmica usando comandos ESC/POS
    """
    try:
        # Comandos ESC/POS estándar
        ESC_INIT = bytes([0x1B, 0x40])  # ESC @ - Inicializar impresora
        ESC_CODEPAGE = bytes([0x1B, 0x74, 0x02])  # ESC t 2 - Página de códigos CP850
        GS_CUT = bytes([0x1D, 0x56, 0x00])  # GS V 0 - Cortar papel
        
        # Convertir texto a bytes con el encoding especificado
        texto_bytes = texto.encode(encoding, errors='replace')
        
        # Agregar saltos de línea antes del corte
        feed_lines = b'\n\n\n\n'
        
        # Construir buffer final
        buffer_final = ESC_INIT + ESC_CODEPAGE + texto_bytes + feed_lines
        
        if cortar:
            buffer_final += GS_CUT
        
        # Crear archivo temporal
        with tempfile.NamedTemporaryFile(mode='wb', delete=False, suffix='.bin') as temp_file:
            temp_file.write(buffer_final)
            temp_path = temp_file.name
        
        # Imprimir usando copy /b (Windows)
        # La impresora debe estar compartida o ser accesible vía \\localhost\NombreImpresora
        comando_imprimir = f'copy /b "{temp_path}" "\\\\localhost\\{impresora}"'
        
        print(f"Ejecutando: {comando_imprimir}")
        
        resultado = subprocess.run(
            comando_imprimir,
            shell=True,
            capture_output=True,
            text=True,
            timeout=15
        )
        
        # Eliminar archivo temporal
        try:
            os.unlink(temp_path)
        except:
            pass
        
        if resultado.returncode != 0:
            error_msg = resultado.stderr or resultado.stdout or "Error desconocido"
            raise Exception(f"Error al imprimir: {error_msg}. Asegúrese de que la impresora esté COMPARTIDA en Windows.")
        
        print("✅ Impresión enviada correctamente")
        return True
    
    except subprocess.TimeoutExpired:
        raise Exception("Timeout al intentar imprimir. La impresora no responde.")
    except Exception as e:
        raise Exception(f"Error durante impresión: {str(e)}")


# ========================
# RUTAS / ENDPOINTS
# ========================

@app.route('/status', methods=['GET'])
def status():
    """Endpoint de estado del servicio"""
    return jsonify({
        'success': True,
        'servicio': 'Plugin de Impresión Montis Cloud',
        'version': VERSION,
        'puerto': PORT,
        'sistema': platform.system(),
        'activo': True,
        'timestamp': datetime.now().isoformat()
    })


@app.route('/impresoras', methods=['GET'])
def listar_impresoras():
    """Endpoint para obtener lista de impresoras disponibles"""
    try:
        impresoras = obtener_impresoras()
        return jsonify({
            'success': True,
            'impresoras': impresoras,
            'total': len(impresoras)
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@app.route('/imprimir', methods=['POST'])
def imprimir():
    """Endpoint para enviar impresión a una impresora térmica"""
    try:
        data = request.get_json()
        
        texto = data.get('texto')
        impresora = data.get('impresora')
        cortar = data.get('cortar', True)
        encoding = data.get('encoding', 'cp850')
        
        if not texto or not impresora:
            return jsonify({
                'success': False,
                'error': 'Faltan parámetros requeridos: texto, impresora'
            }), 400
        
        print(f"🖨️  Solicitud de impresión para: {impresora}")
        
        # Ejecutar impresión
        imprimir_texto_raw(texto, impresora, cortar, encoding)
        
        return jsonify({
            'success': True,
            'mensaje': 'Enviado a impresora correctamente'
        })
    
    except Exception as e:
        print(f"❌ Error: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@app.route('/probar', methods=['POST'])
def probar():
    """Endpoint de prueba de conexión"""
    try:
        data = request.get_json()
        impresora = data.get('impresora')
        
        if not impresora:
            return jsonify({
                'success': False,
                'error': 'Falta nombre de impresora'
            }), 400
        
        # Texto de prueba
        texto_prueba = f"""
================================
      PRUEBA DE CONEXION
================================
El plugin esta funcionando.
Impresora: {impresora}
Fecha: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}
================================
        """
        
        imprimir_texto_raw(texto_prueba.strip(), impresora, cortar=True)
        
        return jsonify({
            'success': True,
            'mensaje': 'Prueba de impresión enviada'
        })
    
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@app.route('/', methods=['GET'])
def home():
    """Ruta principal con información del servicio"""
    return jsonify({
        'servicio': 'Plugin de Impresión Montis Cloud',
        'version': VERSION,
        'estado': 'Activo',
        'endpoints': {
            'status': '/status',
            'impresoras': '/impresoras [GET]',
            'imprimir': '/imprimir [POST]',
            'probar': '/probar [POST]'
        }
    })


def main():
    """Función principal"""
    print("=" * 60)
    print(f"🖨️  Plugin de Impresión Montis Cloud v{VERSION}")
    print("=" * 60)
    print(f"Puerto: {PORT}")
    print(f"Sistema: {platform.system()}")
    print(f"Endpoints disponibles:")
    print(f"  - http://localhost:{PORT}/status")
    print(f"  - http://localhost:{PORT}/impresoras")
    print(f"  - http://localhost:{PORT}/imprimir")
    print("=" * 60)
    print("Presione Ctrl+C para detener el servicio")
    print("=" * 60)
    
    # Iniciar servidor Flask
    app.run(
        host='0.0.0.0',
        port=PORT,
        debug=False,
        use_reloader=False
    )


if __name__ == '__main__':
    main()
