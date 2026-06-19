import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const envConfig = fs.readFileSync('.env.local', 'utf-8');
const matchUrl = envConfig.match(/VITE_SUPABASE_URL=(.*)/);
const SUPABASE_URL = matchUrl ? matchUrl[1].trim() : '';

const matchKey = envConfig.match(/VITE_SUPABASE_ANON_KEY=(.*)/);
const SUPABASE_ANON_KEY = matchKey ? matchKey[1].trim() : '';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function main() {
  const { data, error } = await supabase
    .from('cables_fibre')
    .update({ type_lien: 'INTERNE' })
    .eq('type_lien', 'JARRETIERE');
    
  if (error) {
    console.error('Error:', error);
  } else {
    console.log('Updated rows successfully');
  }
}

main();
