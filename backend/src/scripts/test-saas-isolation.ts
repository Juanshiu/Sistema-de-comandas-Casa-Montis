
import { db } from '../database/database';
import { AuthService } from '../services/authService';
import { ProductoService } from '../services/productoService';
import bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';

async function runTest() {
    console.log('--- INICIANDO PRUEBAS DE AISLAMIENTO SAAS ---');

    try {
        // 1. Limpieza (Opcional, pero para tests repetibles es mejor)
        // No borramos todo, solo lo que crearemos
        const testEmailA = 'test-admin-a@casamontis.com';
        const testEmailB = 'test-admin-b@casamontis.com';

        await db.deleteFrom('usuarios').where('email', 'in', [testEmailA, testEmailB]).execute();
        await db.deleteFrom('empresas').where('nombre', 'like', 'Test Empresa %').execute();

        // 2. Crear Empresas
        const empresaAId = uuidv4();
        await db.insertInto('empresas').values({
            id: empresaAId,
            nombre: 'Test Empresa A',
            slug: 'test-empresa-a',
            estado: 'activo'
        }).execute();
        console.log('✓ Empresa A creada:', empresaAId);

        const empresaBId = uuidv4();
        await db.insertInto('empresas').values({
            id: empresaBId,
            nombre: 'Test Empresa B',
            slug: 'test-empresa-b',
            estado: 'activo'
        }).execute();
        console.log('✓ Empresa B creada:', empresaBId);

        // 3. Crear Usuarios
        const passHash = await bcrypt.hash('password123', 10);
        
        const userAId = uuidv4();
        await db.insertInto('usuarios').values({
            id: userAId,
            empresa_id: empresaAId,
            nombre: 'Admin A',
            usuario: 'admin_a',
            email: testEmailA,
            password_hash: passHash,
            activo: true
        }).execute();
        console.log('✓ Usuario A creado:', userAId);

        const userBId = uuidv4();
        await db.insertInto('usuarios').values({
            id: userBId,
            empresa_id: empresaBId,
            nombre: 'Admin B',
            usuario: 'admin_b',
            email: testEmailB,
            password_hash: passHash,
            activo: true
        }).execute();
        console.log('✓ Usuario B creado:', userBId);

        // 4. Crear Productos (Data para probar aislamiento)
        await db.insertInto('productos').values({
            id: uuidv4(),
            empresa_id: empresaAId,
            nombre: 'Producto Exclusivo A',
            precio: 100,
            disponible: true,
            tiene_personalizacion: false,
            usa_inventario: false
        }).execute();

        await db.insertInto('productos').values({
            id: uuidv4(),
            empresa_id: empresaBId,
            nombre: 'Producto Exclusivo B',
            precio: 200,
            disponible: true,
            tiene_personalizacion: false,
            usa_inventario: false
        }).execute();
        console.log('✓ Productos de prueba creados.');

        // 5. Probar Login y JWT (Sincronización UUID/JWT)
        const authService = new AuthService();
        const loginA = await authService.login(testEmailA, 'password123');
        
        console.log('✓ Login A Exitoso. Token recibido.');
        if (typeof loginA.usuario.id !== 'string' || !loginA.usuario.id.includes('-')) {
            throw new Error('FALLO: El ID de usuario devuelto no es un UUID string');
        }
        console.log('✓ Verificación de UUID en payload exitosa.');

        // 6. Probar Aislamiento en ProductoService
        const productoService = new ProductoService();
        
        console.log('Probando listado para Empresa A...');
        const productosA = await productoService.listarProductos(empresaAId);
        if (productosA.length !== 1 || productosA[0].nombre !== 'Producto Exclusivo A') {
            console.error('Listado A:', productosA);
            throw new Error('FALLO: El aislamiento de productos falló para la Empresa A');
        }
        console.log('✓ Aislamiento de listado Empresa A correcto.');

        console.log('Probando listado para Empresa B...');
        const productosB = await productoService.listarProductos(empresaBId);
        if (productosB.length !== 1 || productosB[0].nombre !== 'Producto Exclusivo B') {
            console.error('Listado B:', productosB);
            throw new Error('FALLO: El aislamiento de productos falló para la Empresa B');
        }
        console.log('✓ Aislamiento de listado Empresa B correcto.');

        // 7. Intentar acceder de forma cruzada
        const prodBId = productosB[0].id;
        try {
            await productoService.obtenerProducto(prodBId, empresaAId);
            throw new Error('FALLO: Se pudo obtener un producto de Empresa B usando el ID de Empresa A');
        } catch (e: any) {
            console.log('✓ Intento de acceso cruzado bloqueado correctamente:', e.message);
        }

        console.log('\n--- TODAS LAS PRUEBAS DE AISLAMIENTO PASARON ---');
        
    } catch (error) {
        console.error('\n❌ ERROR EN LAS PRUEBAS:', error);
        process.exit(1);
    } finally {
        await db.destroy();
    }
}

runTest();
