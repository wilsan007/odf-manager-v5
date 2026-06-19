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
  console.log("Checking racks...");
  const racksRes = await makeRequest('GET', '/rest/v1/racks?select=id,name&id=in.(BET-S1-R1,BET-S2-R2)');
  console.log("Racks:", racksRes.data);

  console.log("Checking ODFs for BET-S1-R1...");
  const odfsS1Res = await makeRequest('GET', '/rest/v1/odfs?select=id,name,odf_type&rack_id=eq.BET-S1-R1');
  console.log("BET-S1-R1 ODFs:", odfsS1Res.data);

  console.log("Checking ODFs for BET-S2-R2...");
  const odfsS2Res = await makeRequest('GET', '/rest/v1/odfs?select=id,name,odf_type&rack_id=eq.BET-S2-R2');
  console.log("BET-S2-R2 ODFs:", odfsS2Res.data);

  // If there are ODFs, let's select the first ones or check all of them
  const allOdfs = [...(odfsS1Res.data || []), ...(odfsS2Res.data || [])];
  for (const odf of allOdfs) {
    console.log(`\n--- ODF: ${odf.id} (${odf.name}) ---`);
    const slotsRes = await makeRequest('GET', `/rest/v1/slots?select=id,name,slot_num&odf_id=eq.${odf.id}&order=slot_num`);
    console.log(`Slots for ${odf.id}:`, slotsRes.data?.map(s => s.name));
    for (const slot of (slotsRes.data || [])) {
      const portsRes = await makeRequest('GET', `/rest/v1/ports?select=id,statut&slot_id=eq.${slot.id}`);
      const libreCount = (portsRes.data || []).filter(p => p.statut === 'LIBRE').length;
      const totalCount = (portsRes.data || []).length;
      console.log(`  Slot ${slot.name}: ${libreCount} / ${totalCount} ports LIBRE`);
    }
  }
}

main();
