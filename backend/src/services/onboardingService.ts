import { db } from '../database/database';
import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcrypt';
import { AuthService } from './authService';

export class OnboardingService {
    private authService = new AuthService();

    async createTenant(data: {
        nombreEmpresa: string;
        nombreAdmin: string;
        emailAdmin: string;
        passwordAdmin: string;
    }) {
        const { nombreEmpresa, nombreAdmin, emailAdmin, passwordAdmin } = data;

        const PERMISOS_SISTEMA = [
            { clave: 'crear_comandas', nombre: 'Crear Comandas', descripcion: 'Permite tomar pedidos' },
            { clave: 'gestionar_caja', nombre: 'Gestionar Caja', descripcion: 'Procesar pagos y cierres' },
            { clave: 'ver_reportes', nombre: 'Ver Reportes', descripcion: 'Acceso a estadísticas' },
            { clave: 'ver_historial', nombre: 'Ver Historial', descripcion: 'Ver comandas pasadas' },
            { clave: 'gestion_menu', nombre: 'Gestionar Menú', descripcion: 'Editar productos y precios' },
            { clave: 'gestion_espacios', nombre: 'Gestionar Espacios', descripcion: 'Administrar mesas y salones' },
            { clave: 'gestionar_sistema', nombre: 'Configuración Sistema', descripcion: 'Ajustes generales' },
            { clave: 'nomina.gestion', nombre: 'Gestión Nómina', descripcion: 'Administrar sueldos y contratos' }
        ];

        return await db.transaction().execute(async (trx) => {
            // 1. Validar si usuario ya existe
            const existingUser = await trx
                .selectFrom('usuarios')
                .select('id')
                .where('email', '=', emailAdmin)
                .executeTakeFirst();

            if (existingUser) {
                throw new Error('El correo electrónico ya está registrado.');
            }

            // 2. Asegurar que los permisos existan en el sistema (Global)
            // Usamos un loop o una query múltiple
            for (const p of PERMISOS_SISTEMA) {
                // Verificar si existe por clave
                const existe = await trx.selectFrom('permisos')
                    .select('id')
                    .where('clave', '=', p.clave)
                    .executeTakeFirst();
                
                if (!existe) {
                    await trx.insertInto('permisos')
                        .values(p)
                        .execute();
                }
            }

            // Obtener todos los IDs de permisos actuales para asignarlos al SuperAdmin
            const todosLosPermisos = await trx.selectFrom('permisos')
                .select(['id', 'clave'])
                .execute();

            // 3. Crear Empresa
            const empresaId = uuidv4();
            const slug = nombreEmpresa.toLowerCase().replace(/[^a-z0-9]/g, '-');
            await trx
                .insertInto('empresas')
                .values({
                    id: empresaId,
                    nombre: nombreEmpresa,
                    slug: slug,
                    estado: 'activo'
                })
                .execute();

            // 4. Crear Rol de SuperAdmin para la empresa
            const rolId = uuidv4();
            await trx
                .insertInto('roles')
                .values({
                    id: rolId,
                    empresa_id: empresaId,
                    nombre: 'SuperAdmin',
                    es_superusuario: true
                })
                .execute();

            // 5. Asignar TODOS los permisos al Rol de SuperAdmin
            const permisosRolData = todosLosPermisos.map(p => ({
                rol_id: rolId,
                permiso_id: p.id,
                empresa_id: empresaId
            }));

            if (permisosRolData.length > 0) {
                await trx.insertInto('permisos_rol')
                    .values(permisosRolData)
                    .execute();
            }

            // 6. Crear Usuario Admin
            const userId = uuidv4();
            const passwordHash = await bcrypt.hash(passwordAdmin, 10);
            // Generar nombre de usuario a partir del email (antes del @)
            const usuarioNombre = emailAdmin.split('@')[0].toLowerCase().replace(/[^a-z0-9_]/g, '_');
            await trx
                .insertInto('usuarios')
                .values({
                    id: userId,
                    empresa_id: empresaId,
                    rol_id: rolId,
                    nombre: nombreAdmin,
                    usuario: usuarioNombre,
                    email: emailAdmin,
                    password_hash: passwordHash,
                    activo: true
                })
                .execute();

            // 5. Inicializar datos base (Categorías por defecto)
            const categoriasDefault = ['Platos Fuertes', 'Bebidas', 'Entradas', 'Postres'];
            for (const [index, nombre] of categoriasDefault.entries()) {
                await trx
                    .insertInto('categorias_productos')
                    .values({
                        id: uuidv4(),
                        empresa_id: empresaId,
                        nombre: nombre,
                        orden: index,
                        activo: true
                    })
                    .execute();
            }

            // 6. Generar JWT para login inmediato
            const token = this.authService.generateToken(userId, empresaId);

            return {
                token,
                empresaId,
                userId
            };
        });
    }
}
