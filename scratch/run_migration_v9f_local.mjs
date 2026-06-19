import fs from 'fs';
import pg from 'pg';

const { Client } = pg;

async function main() {
    const client = new Client({
        connectionString: 'postgresql://postgres:postgres@localhost:5432/postgres'
    });
    
    await client.connect();
    
    try {
        console.log("1. Running migration v9e (Fix Port/CID integrity)...");
        const sqlV9e = fs.readFileSync('supabase/migrations/20260619_v9e_fix_port_cid_integrity.sql', 'utf-8');
        await client.query(sqlV9e);
        console.log("SUCCESS: v9e completed.");

        console.log("2. Running migration v9f (Remove Capacity & Add Atomic RPC)...");
        const sqlV9f = fs.readFileSync('supabase/migrations/20260620_v9f_remove_capacity_and_atomic_service.sql', 'utf-8');
        await client.query(sqlV9f);
        console.log("SUCCESS: v9f completed.");

        console.log("Migrations applied successfully!");
    } catch (err) {
        console.error("ERROR running migration:", err.message);
        console.error(err.stack);
    } finally {
        await client.end();
    }
}

main();
