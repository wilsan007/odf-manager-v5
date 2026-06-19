import https from 'https';
import fs from 'fs';

const env = fs.readFileSync('.env', 'utf-8');
let url = '', key = '';
env.split('\n').forEach(l => {
  if (l.startsWith('VITE_SUPABASE_URL=')) url = l.split('=')[1].trim();
  if (l.startsWith('VITE_SUPABASE_ANON_KEY=')) key = l.split('=')[1].trim();
});

const getCount = (table) => {
  return new Promise((resolve) => {
    const options = {
      hostname: url.replace('https://', ''),
      path: `/rest/v1/${table}?select=id`,
      headers: {
        'apikey': key,
        'Authorization': `Bearer ${key}`
      }
    };
    https.get(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const arr = JSON.parse(data);
          resolve({ table, count: Array.isArray(arr) ? arr.length : 'Error: ' + data });
        } catch(e) {
          resolve({ table, count: 'JSON parse error: ' + data });
        }
      });
    }).on('error', (e) => resolve({ table, count: 'HTTPS error: ' + e.message }));
  });
};

async function main() {
  const tables = ['services', 'service_jonctions', 'cables_fibre', 'ports', 'slots', 'odfs', 'racks', 'salles', 'sites', 'fournisseurs', 'clients'];
  for (const t of tables) {
    const res = await getCount(t);
    console.log(`${res.table}: ${res.count}`);
  }
}

main();
