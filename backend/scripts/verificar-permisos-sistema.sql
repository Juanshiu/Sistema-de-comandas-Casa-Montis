-- Script para verificar y crear permisos necesarios para configuración del sistema
-- Ejecutar esto si tienes problemas de permisos

-- 1. Ver permisos existentes
SELECT id, clave, nombre, descripcion FROM permisos WHERE clave LIKE '%admin%' OR clave LIKE '%sistema%';

-- 2. Ver roles existentes
SELECT id, nombre, descripcion FROM roles;

-- 3. Insertar permiso 'admin' si no existe (para operaciones administrativas)
INSERT INTO permisos (id, clave, nombre, descripcion, created_at)
VALUES (
    gen_random_uuid(),
    'admin',
    'Administrador',
    'Permiso completo de administración del sistema',
    NOW()
)
ON CONFLICT (clave) DO NOTHING;

-- 4. Asignar permiso 'admin' a roles de administrador para TODAS las empresas
-- Nota: Esto asigna el permiso a todos los roles de administrador en todas las empresas
INSERT INTO permisos_rol (id, rol_id, permiso_id, empresa_id, created_at)
SELECT 
    gen_random_uuid(),
    r.id,
    p.id,
    r.empresa_id,
    NOW()
FROM roles r
CROSS JOIN permisos p
WHERE p.clave = 'admin'
  AND r.nombre IN ('Administrador', 'Admin', 'Super Admin', 'Master')
  AND NOT EXISTS (
      SELECT 1 FROM permisos_rol pr
      WHERE pr.rol_id = r.id 
        AND pr.permiso_id = p.id 
        AND pr.empresa_id = r.empresa_id
  );

-- 5. Verificar que los permisos fueron asignados
SELECT 
    r.nombre as rol,
    p.clave as permiso,
    e.razon_social as empresa,
    pr.created_at
FROM permisos_rol pr
JOIN roles r ON r.id = pr.rol_id
JOIN permisos p ON p.id = pr.permiso_id
JOIN empresas e ON e.id = pr.empresa_id
WHERE p.clave = 'admin'
ORDER BY e.razon_social, r.nombre;
