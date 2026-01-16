
import { migrarNomina } from '../database/migration-nomina';

const run = async () => {
    try {
        await migrarNomina();
        console.log('Done!');
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
};

run();
