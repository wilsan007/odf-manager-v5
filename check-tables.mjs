import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const env = fs.readFileSync('.env', 'utf-8');
let url = '', key = '';
env.split('\n').forEach(l => {
  if (l.startsWith('VITE_SUPABASE_URL=')) url = l.split('=')[1].trim();
  if (l.startsWith('VITE_SUPABASE_ANON_KEY=')) key = l.split('=')[1].trim();
});

const supabase = createClient(url, key);

async function check() {
  console.log("Checking tables...");
  
  const tables = ['sites', 'racks', 'odfs', 'ports', 'app_state'];
  
  for (const t of tables) {
    const { data, error } = await supabase.from(t).select('*').limit(3);
    console.log(`--- Table ${t} ---`);
    if (error) {
      console.log(`Error: ${error.message}`);
    } else {
      console.log(`Count: ${data.length} rows (showing up to 3)`);
      if (data.length > 0) console.log(JSON.stringify(data[0]));
    }
  }
}
check();
