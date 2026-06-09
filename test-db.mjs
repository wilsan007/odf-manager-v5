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
  const { error: e1 } = await supabase.from('sites').select('*').limit(1);
  console.log("sites:", e1 ? e1.message : "Exists!");
  
  const { error: e2 } = await supabase.from('racks').select('*').limit(1);
  console.log("racks:", e2 ? e2.message : "Exists!");
  
  const { error: e3 } = await supabase.from('odfs').select('*').limit(1);
  console.log("odfs:", e3 ? e3.message : "Exists!");
  
  const { error: e4 } = await supabase.from('ports').select('*').limit(1);
  console.log("ports:", e4 ? e4.message : "Exists!");

  const { error: e5 } = await supabase.from('services').select('*').limit(1);
  console.log("services:", e5 ? e5.message : "Exists!");
}
check();
