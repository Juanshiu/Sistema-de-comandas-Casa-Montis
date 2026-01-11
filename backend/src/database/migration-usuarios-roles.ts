import { db } from './init';
import bcrypt from 'bcrypt';

const SALT_ROUNDS = 10;

/**
 * Migración para crear el sistema de usuarios y roles
 * - Crea tablas: roles, usuarios, permisos_rol, sesiones
 * - Agrega columna usuario_id a comandas y facturas
 * - Crea usuario admin inicial
 */
export const migrarUsuariosYRoles = async (): Promise<void> => {
  return new Promise((resolve, reject) => {
    db.serialize(async () => {
      try {
        // 1. Crear tabla ROLES
        await new Promise<void>((res, rej) => {
          db.run(`
            CREATE TABLE IF NOT EXISTS roles (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              nombre TEXT NOT NULL UNIQUE,
              descripcion TEXT,
              es_superusuario BOOLEAN DEFAULT FALSE,
              activo BOOLEAN DEFAULT TRUE,
              created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
              updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
          `, (err) => {
            if (err) rej(err);
            else res();
          });
        });

        // 2. Crear tabla USUARIOS
        await new Promise<void>((res, rej) => {
          db.run(`
            CREATE TABLE IF NOT EXISTS usuarios (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              usuario TEXT NOT NULL UNIQUE,
              password_hash TEXT NOT NULL,
              nombre_completo TEXT NOT NULL,
              rol_id INTEGER NOT NULL,
              pin TEXT,
              telefono TEXT,
              activo BOOLEAN DEFAULT TRUE,
              ultimo_login DATETIME,
              created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
              updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
              FOREIGN KEY (rol_id) REFERENCES roles(id)
            )
          `, (err) => {
            if (err) rej(err);
            else res();
          });
        });

        // 3. Crear tabla PERMISOS_ROL
        await new Promise<void>((res, rej) => {
          db.run(`
            CREATE TABLE IF NOT EXISTS permisos_rol (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              rol_id INTEGER NOT NULL,
              permiso TEXT NOT NULL,
              activo BOOLEAN DEFAULT TRUE,
              created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
              FOREIGN KEY (rol_id) REFERENCES roles(id),
              UNIQUE(rol_id, permiso)
            )
          `, (err) => {
            if (err) rej(err);
            else res();
          });
        });

        // 4. Crear tabla SESIONES
        await new Promise<void>((res, rej) => {
          db.run(`
            CREATE TABLE IF NOT EXISTS sesiones (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              usuario_id INTEGER NOT NULL,
              token TEXT NOT NULL UNIQUE,
              fecha_creacion DATETIME DEFAULT CURRENT_TIMESTAMP,
              fecha_expiracion DATETIME NOT NULL,
              activo BOOLEAN DEFAULT TRUE,
              FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
            )
          `, (err) => {
            if (err) rej(err);
            else res();
          });
        });

        // 5. Agregar columna usuario_id a comandas (si no existe)
        await new Promise<void>((res, rej) => {
          db.run(`
            ALTER TABLE comandas ADD COLUMN usuario_id INTEGER REFERENCES usuarios(id)
          `, (err) => {
            // Ignorar error si la columna ya existe
            if (err && !err.message.includes('duplicate column')) {
              console.error('Error al agregar usuario_id a comandas:', err.message);
            }
            res();
          });
        });

        // 6. Agregar columna usuario_id a facturas (si no existe)
        await new Promise<void>((res, rej) => {
          db.run(`
            ALTER TABLE facturas ADD COLUMN usuario_id INTEGER REFERENCES usuarios(id)
          `, (err) => {
            // Ignorar error si la columna ya existe
            if (err && !err.message.includes('duplicate column')) {
              console.error('Error al agregar usuario_id a facturas:', err.message);
            }
            res();
          });
        });

        // 7. Verificar si ya existe el rol de superusuario
        const rolExistente = await new Promise<any>((res, rej) => {
          db.get('SELECT id FROM roles WHERE nombre = ?', ['Super Usuario'], (err, row) => {
            if (err) rej(err);
            else res(row);
          });
        });

        let rolId: number;

        if (!rolExistente) {
          // 8. Crear rol "Super Usuario"
          rolId = await new Promise<number>((res, rej) => {
            db.run(`
              INSERT INTO roles (nombre, descripcion, es_superusuario, activo)
              VALUES (?, ?, ?, ?)
            `, ['Super Usuario', 'Acceso completo a todas las funciones del sistema', true, true], function(err) {
              if (err) rej(err);
              else res(this.lastID);
            });
          });

          console.log('✅ Rol "Super Usuario" creado con ID:', rolId);

          // 9. Asignar todos los permisos al Super Usuario
          const permisos = [
            'comandas.crear',
            'comandas.editar',
            'comandas.eliminar',
            'caja.acceso',
            'reportes.visualizar',
            'historial.visualizar',
            'menu.gestion',
            'espacios.gestion',
            'configuracion.acceso',
            'usuarios.gestion',
            'roles.gestion'
          ];

          for (const permiso of permisos) {
            await new Promise<void>((res, rej) => {
              db.run(`
                INSERT INTO permisos_rol (rol_id, permiso, activo)
                VALUES (?, ?, ?)
              `, [rolId, permiso, true], (err) => {
                if (err && !err.message.includes('UNIQUE constraint')) rej(err);
                else res();
              });
            });
          }

          console.log('✅ Permisos asignados al rol Super Usuario');
        } else {
          rolId = rolExistente.id;
          console.log('ℹ️  Rol "Super Usuario" ya existe con ID:', rolId);
        }

        // 10. Verificar si ya existe el usuario admin
        const usuarioExistente = await new Promise<any>((res, rej) => {
          db.get('SELECT id FROM usuarios WHERE usuario = ?', ['admin@casamontis'], (err, row) => {
            if (err) rej(err);
            else res(row);
          });
        });

        if (!usuarioExistente) {
          // 11. Crear usuario admin con contraseña hasheada
          const passwordHash = await bcrypt.hash('Admin123!', SALT_ROUNDS);

          await new Promise<void>((res, rej) => {
            db.run(`
              INSERT INTO usuarios (usuario, password_hash, nombre_completo, rol_id, activo)
              VALUES (?, ?, ?, ?, ?)
            `, ['admin@casamontis', passwordHash, 'Administrador del Sistema', rolId, true], function(err) {
              if (err) rej(err);
              else {
                console.log('✅ Usuario admin creado con ID:', this.lastID);
                console.log('📧 Usuario: admin@casamontis');
                console.log('🔑 Contraseña: Admin123!');
                res();
              }
            });
          });
        } else {
          console.log('ℹ️  Usuario admin ya existe');
        }

        console.log('✅ Migración de usuarios y roles completada');
        resolve();
      } catch (error) {
        console.error('❌ Error en migración de usuarios y roles:', error);
        reject(error);
      }
    });
  });
};
