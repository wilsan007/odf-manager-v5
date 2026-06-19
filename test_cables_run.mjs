import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

// Read .env from the project root
const env = fs.readFileSync('.env', 'utf-8');
let url = '', key = '';
env.split('\n').forEach(l => {
  if (l.startsWith('VITE_SUPABASE_URL=')) url = l.split('=')[1].trim();
  if (l.startsWith('VITE_SUPABASE_ANON_KEY=')) key = l.split('=')[1].trim();
});

const supabase = createClient(url, key);

async function run() {
  console.log("--- 1. Fetching raw cables count ---");
  const { data: rawCables, error: rawError } = await supabase
    .from('cables_fibre')
    .select('*');
  
  if (rawError) {
    console.error("Error fetching raw cables:", rawError);
    return;
  }
  
  console.log(`Total cables in DB: ${rawCables.length}`);
  console.log("Cables by type_lien:");
  const types = {};
  rawCables.forEach(c => {
    types[c.type_lien] = (types[c.type_lien] || 0) + 1;
  });
  console.log(types);

  console.log("\n--- 2. Fetching cables with full join (frontend query style) ---");
  const { data: joinCables, error: joinError } = await supabase.from('cables_fibre').select(`
    *,
    port_source:ports!cables_fibre_port_source_id_fkey(
      id, slot_port, slot_id,
      slots(id, name, slot_num,
        odfs(id, name, odf_type,
          racks(id, name,
            salles(id, name,
              sites(id, name)
            )
          )
        )
      )
    ),
    port_dest:ports!cables_fibre_port_dest_id_fkey(
      id, slot_port, slot_id,
      slots(id, name, slot_num,
        odfs(id, name, odf_type,
          racks(id, name,
            salles(id, name,
              sites(id, name)
            )
          )
        )
      )
    )
  `);

  if (joinError) {
    console.error("Error fetching with join:", joinError);
    return;
  }

  console.log(`Total cables returned with join: ${joinCables.length}`);
  const joinTypes = {};
  joinCables.forEach(c => {
    joinTypes[c.type_lien] = (joinTypes[c.type_lien] || 0) + 1;
  });
  console.log(joinTypes);

  // If there's a difference, let's find which cables are missing
  const rawIds = new Set(rawCables.map(c => c.id));
  const joinIds = new Set(joinCables.map(c => c.id));
  const missingIds = [...rawIds].filter(id => !joinIds.has(id));

  if (missingIds.length > 0) {
    console.log(`\n--- 3. Missing cables: ${missingIds.length} ---`);
    const missingCables = rawCables.filter(c => missingIds.includes(c.id));
    console.log("Missing cables references:", missingCables.map(c => c.cable_reference));

    // Let's inspect the ports for the first missing cable
    const missing = missingCables[0];
    console.log(`\nInspecting ports for cable ${missing.cable_reference}:`);
    console.log(`Source Port ID: ${missing.port_source_id}`);
    console.log(`Dest Port ID: ${missing.port_dest_id}`);

    const { data: srcPort } = await supabase.from('ports').select('*, slots(*)').eq('id', missing.port_source_id);
    const { data: dstPort } = await supabase.from('ports').select('*, slots(*)').eq('id', missing.port_dest_id);
    
    console.log("Source Port in DB:", srcPort);
    console.log("Dest Port in DB:", dstPort);
  }
}

run();
