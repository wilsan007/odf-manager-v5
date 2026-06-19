import https from 'https';
import fs from 'fs';

const env = fs.readFileSync('.env', 'utf-8');
let url = '', key = '';
env.split('\n').forEach(l => {
  if (l.startsWith('VITE_SUPABASE_URL=')) url = l.split('=')[1].trim();
  if (l.startsWith('VITE_SUPABASE_ANON_KEY=')) key = l.split('=')[1].trim();
});

const makeRequest = (method, path, body = null) => {
  return new Promise((resolve) => {
    const postData = body ? JSON.stringify(body) : '';
    const options = {
      hostname: url.replace('https://', ''),
      path: path,
      method: method,
      headers: {
        'apikey': key,
        'Authorization': `Bearer ${key}`,
        'Content-Type': 'application/json',
        ...(body ? { 'Content-Length': Buffer.byteLength(postData) } : {})
      }
    };
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = data ? JSON.parse(data) : {};
          resolve({ status: res.statusCode, data: parsed });
        } catch(e) {
          resolve({ status: res.statusCode, error: 'JSON parse error: ' + data });
        }
      });
    });
    req.on('error', (e) => resolve({ error: 'HTTPS error: ' + e.message }));
    if (body) req.write(postData);
    req.end();
  });
};

async function main() {
  console.log("Checking ports for BET-S1-R1-ODF1_S02...");
  const portsRes = await makeRequest('GET', '/rest/v1/ports?select=id,statut,cid,cable_id&slot_id=eq.BET-S1-R1-ODF1_S02');
  console.log("Ports for S1-R1-ODF1 S02:", portsRes.data);

  console.log("\nChecking ports for BET-S2-R2-ODF1_S02...");
  const portsRes2 = await makeRequest('GET', '/rest/v1/ports?select=id,statut,cid,cable_id&slot_id=eq.BET-S2-R2-ODF1_S02');
  console.log("Ports for S2-R2-ODF1 S02:", portsRes2.data);
}

main();
