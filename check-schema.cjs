/**
 * check-schema.cjs — Inspecte le schéma des tables via l'API Supabase
 */

const https = require('https');
const fs    = require('fs');

const env = fs.readFileSync('.env', 'utf-8');
let url = '', anonKey = '', serviceKey = '';
env.split('\n').forEach(function(l) {
  var t = l.trim();
  if (t.startsWith('VITE_SUPABASE_URL='))     url        = t.slice('VITE_SUPABASE_URL='.length).trim();
  if (t.startsWith('VITE_SUPABASE_ANON_KEY=')) anonKey    = t.slice('VITE_SUPABASE_ANON_KEY='.length).trim();
  if (t.startsWith('SUPABASE_SERVICE_KEY='))   serviceKey = t.slice('SUPABASE_SERVICE_KEY='.length).trim();
});

function request(method, urlStr, headers, body) {
  return new Promise(function(resolve, reject) {
    var u = new URL(urlStr);
    var opts = { hostname: u.hostname, path: u.pathname + u.search, method: method, headers: headers };
    var req = https.request(opts, function(res) {
      var data = '';
      res.on('data', function(chunk) { data += chunk; });
      res.on('end', function() {
        try { resolve({ status: res.statusCode, body: JSON.parse(data) }); }
        catch(e) { resolve({ status: res.statusCode, body: data }); }
      });
    });
    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

var BASE = url.replace(/\/$/, '');

async function main() {
  // Connexion avec admin@demo.dj pour obtenir un token
  var loginRes = await request('POST',
    BASE + '/auth/v1/token?grant_type=password',
    { 'Content-Type': 'application/json', 'apikey': anonKey },
    { email: 'admin@demo.dj', password: 'admin123' }
  );
  if (!loginRes.body.access_token) {
    console.error('❌ Connexion échouée:', JSON.stringify(loginRes.body));
    return;
  }
  var token = loginRes.body.access_token;
  console.log('✅ Connecté comme admin@demo.dj\n');

  var H = { 'Authorization': 'Bearer ' + token, 'apikey': anonKey };
  var Hs = { 'Authorization': 'Bearer ' + serviceKey, 'apikey': serviceKey };

  // Tester chaque table avec SELECT * LIMIT 1
  var tables = ['sites', 'racks', 'odfs', 'slots', 'ports', 'salles', 'clients', 'fournisseurs'];

  console.log('─── TEST TABLES (avec token user) ───────────────────────────────');
  for (var i = 0; i < tables.length; i++) {
    var t = tables[i];
    var r = await request('GET', BASE + '/rest/v1/' + t + '?limit=1', H, null);
    if (r.status === 200) {
      var cols = r.body && r.body.length > 0 ? Object.keys(r.body[0]).join(', ') : '(table vide)';
      console.log('✅ ' + t + ' — ' + (r.body || []).length + ' ligne(s) | colonnes: ' + cols);
    } else {
      var msg = r.body && r.body.message ? r.body.message : JSON.stringify(r.body).slice(0,100);
      console.log('❌ ' + t + ' (' + r.status + '): ' + msg);
    }
  }

  console.log('\n─── TEST TABLES (avec service_role) ─────────────────────────────');
  for (var i = 0; i < tables.length; i++) {
    var t = tables[i];
    var r = await request('GET', BASE + '/rest/v1/' + t + '?limit=1', Hs, null);
    if (r.status === 200) {
      var cols = r.body && r.body.length > 0 ? Object.keys(r.body[0]).join(', ') : '(table vide)';
      console.log('✅ ' + t + ' — ' + (r.body || []).length + ' ligne(s) | colonnes: ' + cols);
    } else {
      var msg = r.body && r.body.message ? r.body.message : JSON.stringify(r.body).slice(0,100);
      console.log('❌ ' + t + ' (' + r.status + '): ' + msg);
    }
  }
}

main().catch(console.error);
