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
  console.log("Checking ODFs on BET site...");
  // Let's get ODFs containing 'BET'
  const odfsRes = await makeRequest('GET', '/rest/v1/odfs?select=id,name,rack_id,odf_type&id=like.*BET*');
  console.log("ODFs found:", odfsRes.data);

  if (!odfsRes.data || odfsRes.data.length === 0) {
    return;
  }

  // Let's check slots for these ODFs
  const odfIds = odfsRes.data.map(o => o.id);
  const slotsRes = await makeRequest('GET', `/rest/v1/slots?select=id,name,odf_id&odf_id=in.(${odfIds.join(',')})`);
  console.log("Slots count:", slotsRes.data?.length);

  // Let's check ports status of those slots
  const slotIds = slotsRes.data?.map(s => s.id) || [];
  if (slotIds.length > 0) {
    const portsRes = await makeRequest('GET', `/rest/v1/ports?select=id,slot_id,statut&slot_id=in.(${slotIds.slice(0, 50).join(',')})`);
    const statusCounts = {};
    (portsRes.data || []).forEach(p => {
      statusCounts[p.statut] = (statusCounts[p.statut] || 0) + 1;
    });
    console.log("Ports status summary (first 50 slots):", statusCounts);
    
    // Print all ports with slot_id that has S02 in name
    const s02Slots = slotsRes.data.filter(s => s.name === 'S02').map(s => s.id);
    if (s02Slots.length > 0) {
      const s02PortsRes = await makeRequest('GET', `/rest/v1/ports?select=id,slot_id,statut&slot_id=in.(${s02Slots.join(',')})`);
      console.log("Ports status in S02 slots:");
      console.log(JSON.stringify(s02PortsRes.data, null, 2));
    }
  }
}

main();
