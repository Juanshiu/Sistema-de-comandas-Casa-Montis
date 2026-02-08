import { db as kyselyDb } from './database';
import { sql } from 'kysely';

// Helper to convert SQLite '?' to Postgres '$n'
function convertSql(query: string): string {
    let i = 1;
    let converted = query.replace(/\?/g, () => `$${i++}`);
    // Basic fix for boolean literals: 1 -> true, 0 -> false in comparisons might be needed
    // But harder to do safely with regex.
    return converted;
}

export const db = {
    // Adapter for legacy db.all
    all: async (query: string, params: any = [], callback?: (err: any, rows: any[]) => void) => {
        let actualParams = params;
        let actualCallback = callback;
        
        if (typeof params === 'function') {
            actualCallback = params;
            actualParams = [];
        }

        try {
            const pgQuery = convertSql(query);
            const result = await sql([pgQuery] as any, ...actualParams).execute(kyselyDb);
            if (actualCallback) actualCallback(null, result.rows);
        } catch (err) {
            console.error('[LegacyDB Adaptor] All Error:', err);
            if (actualCallback) actualCallback(err, []);
        }
    },
    // Adapter for legacy db.get
    get: async (query: string, params: any = [], callback?: (err: any, row: any) => void) => {
         let actualParams = params;
         let actualCallback = callback;
         
         if (typeof params === 'function') {
             actualCallback = params;
             actualParams = [];
         }

         try {
            const pgQuery = convertSql(query);
            const result = await sql([pgQuery] as any, ...actualParams).execute(kyselyDb);
            if (actualCallback) actualCallback(null, result.rows[0]);
        } catch (err) {
            console.error('[LegacyDB Adaptor] Get Error:', err);
            if (actualCallback) actualCallback(err, null);
        }
    },
    // Adapter for legacy db.run
    run: async function(query: string, params: any = [], callback?: (err: any) => void) {
         try {
            const pgQuery = convertSql(query);
            // Ignore params if empty for Transaction commands
            // Or if params is callback in legacy loose typing
            let actualParams = params;
            let actualCallback = callback;
            
            if (typeof params === 'function') {
                actualCallback = params;
                actualParams = [];
            } else if (!params) {
                actualParams = [];
            }

            const result = await sql([pgQuery] as any, ...actualParams).execute(kyselyDb);
            
            // Mock context for 'this.lastID' and 'this.changes'
            // NOTE: This won't capture actual ID unless query had RETURNING id
            const mockContext = {
                lastID: 0, // Cannot reliably get this from generic raw query without RETURNING
                changes: 0
            };

            // Call callback with mock context
            if (actualCallback) {
                actualCallback.call(mockContext, null);
            }
        } catch (err) {
            console.error('[LegacyDB Adaptor] Run Error:', err);
            if (callback) {
                callback(err);
            }
        }
    },
    // Mock serialize
    serialize: (callback: () => void) => {
        callback();
    }
};
