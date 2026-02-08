"""
Script de prueba para el plugin de impresión
Prueba todos los endpoints sin necesidad del frontend
"""

import requests
import json
import sys
import time

BASE_URL = "http://localhost:8001"


def color_text(text, color_code):
    """Colorea texto en consola"""
    colors = {
        'green': '\033[92m',
        'red': '\033[91m',
        'yellow': '\033[93m',
        'blue': '\033[94m',
        'end': '\033[0m'
    }
    return f"{colors.get(color_code, '')}{text}{colors['end']}"


def test_status():
    """Prueba el endpoint /status"""
    print("\n" + "=" * 60)
    print("🔍 PRUEBA 1: Estado del servicio (/status)")
    print("=" * 60)
    
    try:
        response = requests.get(f"{BASE_URL}/status", timeout=5)
        
        if response.status_code == 200:
            data = response.json()
            print(color_text("✅ Plugin detectado correctamente", 'green'))
            print(f"\nDetalles:")
            print(f"  - Servicio: {data.get('servicio')}")
            print(f"  - Versión: {data.get('version')}")
            print(f"  - Puerto: {data.get('puerto')}")
            print(f"  - Sistema: {data.get('sistema')}")
            print(f"  - Estado: {data.get('activo')}")
            return True
        else:
            print(color_text(f"❌ Error: HTTP {response.status_code}", 'red'))
            return False
    
    except requests.exceptions.ConnectionError:
        print(color_text("❌ No se pudo conectar al plugin", 'red'))
        print("\n💡 Posibles soluciones:")
        print("   1. Asegúrese de que el plugin esté corriendo")
        print("   2. Ejecute: python server.py")
        print("   3. O ejecute: INICIAR_PLUGIN.bat")
        return False
    
    except Exception as e:
        print(color_text(f"❌ Error inesperado: {e}", 'red'))
        return False


def test_impresoras():
    """Prueba el endpoint /impresoras"""
    print("\n" + "=" * 60)
    print("🖨️  PRUEBA 2: Detección de impresoras (/impresoras)")
    print("=" * 60)
    
    try:
        response = requests.get(f"{BASE_URL}/impresoras", timeout=10)
        
        if response.status_code == 200:
            data = response.json()
            impresoras = data.get('impresoras', [])
            
            if len(impresoras) > 0:
                print(color_text(f"✅ Se detectaron {len(impresoras)} impresora(s)", 'green'))
                print("\nImpresoras encontradas:")
                for i, impresora in enumerate(impresoras, 1):
                    print(f"  {i}. {impresora}")
                return impresoras
            else:
                print(color_text("⚠️  No se detectaron impresoras", 'yellow'))
                print("\n💡 Posibles soluciones:")
                print("   1. Instale una impresora en Windows")
                print("   2. Verifique en Panel de Control > Dispositivos e Impresoras")
                return []
        else:
            print(color_text(f"❌ Error: HTTP {response.status_code}", 'red'))
            return []
    
    except Exception as e:
        print(color_text(f"❌ Error: {e}", 'red'))
        return []


def test_imprimir(impresora):
    """Prueba el endpoint /imprimir"""
    print("\n" + "=" * 60)
    print(f"📄 PRUEBA 3: Impresión de prueba (/imprimir)")
    print("=" * 60)
    print(f"Impresora seleccionada: {color_text(impresora, 'blue')}")
    
    # Texto de prueba
    texto_prueba = f"""
================================
   PRUEBA DE IMPRESION
================================
Plugin: Montis Cloud v2.0.0
Impresora: {impresora}
Fecha: {time.strftime('%Y-%m-%d %H:%M:%S')}

Este es un ticket de prueba
para verificar que la impresora
esta funcionando correctamente.
================================
    """
    
    try:
        payload = {
            'texto': texto_prueba.strip(),
            'impresora': impresora,
            'cortar': True,
            'encoding': 'cp850'
        }
        
        print("\nEnviando impresión...")
        response = requests.post(
            f"{BASE_URL}/imprimir",
            json=payload,
            timeout=15
        )
        
        if response.status_code == 200:
            data = response.json()
            if data.get('success'):
                print(color_text("✅ Impresión enviada correctamente", 'green'))
                print(f"\nMensaje: {data.get('mensaje')}")
                print("\n💡 Verifique que la impresora haya impreso el ticket.")
                return True
            else:
                print(color_text(f"❌ Error: {data.get('error')}", 'red'))
                return False
        else:
            print(color_text(f"❌ Error HTTP {response.status_code}", 'red'))
            print(f"Respuesta: {response.text}")
            return False
    
    except Exception as e:
        print(color_text(f"❌ Error: {e}", 'red'))
        return False


def main():
    """Función principal"""
    print("\n" + "=" * 60)
    print(color_text("🖨️  PRUEBA DEL PLUGIN DE IMPRESIÓN - MONTIS CLOUD", 'blue'))
    print("=" * 60)
    print("\nEste script probará todos los endpoints del plugin.")
    print("Asegúrese de que el plugin esté corriendo antes de continuar.")
    print("\n" + "=" * 60)
    
    input("\nPresione ENTER para comenzar las pruebas...")
    
    # Prueba 1: Status
    if not test_status():
        print("\n" + color_text("❌ FALLO: El plugin no está corriendo", 'red'))
        sys.exit(1)
    
    # Prueba 2: Impresoras
    impresoras = test_impresoras()
    
    if len(impresoras) == 0:
        print("\n" + color_text("⚠️  ADVERTENCIA: No hay impresoras para probar", 'yellow'))
        print("\nLas pruebas básicas fueron exitosas, pero no se puede probar impresión.")
        sys.exit(0)
    
    # Seleccionar impresora para prueba
    print("\n" + "=" * 60)
    print("Selección de impresora para prueba de impresión")
    print("=" * 60)
    
    if len(impresoras) == 1:
        impresora_seleccionada = impresoras[0]
        print(f"\nSe seleccionará automáticamente: {impresora_seleccionada}")
    else:
        print("\nSeleccione el número de la impresora a usar:")
        for i, imp in enumerate(impresoras, 1):
            print(f"  [{i}] {imp}")
        
        while True:
            try:
                seleccion = int(input("\nIngrese número: "))
                if 1 <= seleccion <= len(impresoras):
                    impresora_seleccionada = impresoras[seleccion - 1]
                    break
                else:
                    print(color_text("❌ Número inválido", 'red'))
            except ValueError:
                print(color_text("❌ Ingrese un número válido", 'red'))
    
    # Confirmación antes de imprimir
    print(f"\n⚠️  Se enviará una impresión de prueba a: {color_text(impresora_seleccionada, 'yellow')}")
    confirmacion = input("¿Continuar? (S/N): ")
    
    if confirmacion.upper() != 'S':
        print("\n" + color_text("❌ Prueba de impresión cancelada", 'yellow'))
        sys.exit(0)
    
    # Prueba 3: Imprimir
    if test_imprimir(impresora_seleccionada):
        print("\n" + "=" * 60)
        print(color_text("✅ TODAS LAS PRUEBAS COMPLETADAS EXITOSAMENTE", 'green'))
        print("=" * 60)
        print("\n💡 El plugin está funcionando correctamente.")
        print("   Puede proceder a configurarlo en el sistema web.")
    else:
        print("\n" + "=" * 60)
        print(color_text("❌ LA PRUEBA DE IMPRESIÓN FALLÓ", 'red'))
        print("=" * 60)
        print("\n💡 Posibles causas:")
        print("   1. La impresora no está COMPARTIDA en Windows")
        print("   2. El nombre de la impresora no es correcto")
        print("   3. La impresora está desconectada o apagada")
        print("\n   Solución: Ir a Panel de Control > Dispositivos e Impresoras")
        print("   → Clic derecho en impresora → Propiedades → Pestaña Compartir")
        print("   → Activar 'Compartir esta impresora'")


if __name__ == '__main__':
    try:
        main()
    except KeyboardInterrupt:
        print("\n\n" + color_text("❌ Prueba interrumpida por el usuario", 'yellow'))
        sys.exit(0)
    except Exception as e:
        print("\n\n" + color_text(f"❌ Error inesperado: {e}", 'red'))
        sys.exit(1)
