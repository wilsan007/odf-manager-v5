import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// read .env
const env = fs.readFileSync('.env', 'utf-8');
const lines = env.split('\n');
let url = '';
let key = '';
lines.forEach(l => {
  if (l.startsWith('VITE_SUPABASE_URL=')) url = l.split('=')[1].trim();
  if (l.startsWith('VITE_SUPABASE_ANON_KEY=')) key = l.split('=')[1].trim();
});

const supabase = createClient(url, key);

async function check() {
  const { data, error } = await supabase.from('sites').select('*').limit(1);
  console.log("Sites table:", error ? error.message : "Exists!");
  
  const { data: d2, error: e2 } = await supabase.from('app_state').select('*').limit(1);
  console.log("app_state table:", e2 ? e2.message : "Exists!");
}
check();
