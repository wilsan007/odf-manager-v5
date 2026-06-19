/**
 * create-demo-users.cjs
 * Compatible Node.js v12+ (utilise https natif, pas de dépendances ESM)
 */

const https = require('https');
const fs    = require('fs');

// ─── Lire .env ────────────────────────────────────────────────────────────────
const env = fs.readFileSync('.env', 'utf-8');
let url = '', anonKey = '', serviceKey = '';
env.split('\n').forEach(function(l) {
  var trimmed = l.trim();
  if (trimmed.startsWith('VITE_SUPABASE_URL='))     url        = trimmed.slice('VITE_SUPABASE_URL='.length).trim();
  if (trimmed.startsWith('VITE_SUPABASE_ANON_KEY=')) anonKey    = trimmed.slice('VITE_SUPABASE_ANON_KEY='.length).trim();
  if (trimmed.startsWith('SUPABASE_SERVICE_KEY='))   serviceKey = trimmed.slice('SUPABASE_SERVICE_KEY='.length).trim();
});

if (!url || !serviceKey) {
  console.error('\n❌ ERREUR : VITE_SUPABASE_URL ou SUPABASE_SERVICE_KEY manquante dans .env\n');
  console.log('Contenu .env détecté :');
  console.log('  url        :', url || '(vide)');
  console.log('  serviceKey :', serviceKey ? serviceKey.slice(0,20)+'...' : '(vide)');
  process.exit(1);
}

console.log('\n✅ .env lu correctement');
console.log('  URL        :', url);
console.log('  Service key:', serviceKey.slice(0,20) + '...\n');

// ─── Fonction requête HTTPS ────────────────────────────────────────────────────
function request(method, urlStr, headers, body) {
  return new Promise(function(resolve, reject) {
    var u = new URL(urlStr);
    var opts = {
      hostname: u.hostname,
      path:     u.pathname + u.search,
      method:   method,
      headers:  headers,
    };
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
var HEADERS_ADMIN = {
  'Content-Type':  'application/json',
  'Authorization': 'Bearer ' + serviceKey,
  'apikey':        serviceKey,
};
var HEADERS_ANON = {
  'Content-Type':  'application/json',
  'Authorization': 'Bearer ' + anonKey,
  'apikey':        anonKey,
};

// ─── Comptes à créer ──────────────────────────────────────────────────────────
var DEMO_USERS = [
  { email: 'admin@demo.dj', password: 'admin123', data: { name: 'Administrateur', role: 'admin' } },
  { email: 'tech@demo.dj',  password: 'tech123',  data: { name: 'Technicien',     role: 'technicien' } },
];

// ─── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log('🚀 Création des comptes démo dans Supabase Auth...\n');

  // Lister les utilisateurs existants
  var listRes = await request('GET', BASE + '/auth/v1/admin/users?per_page=100', HEADERS_ADMIN, null);
  var existingList = [];
  if (listRes.status === 200 && listRes.body && listRes.body.users) {
    existingList = listRes.body.users;
    console.log('👥 ' + existingList.length + ' utilisateur(s) existant(s) trouvé(s)\n');
  } else {
    console.warn('⚠️  Impossible de lister les utilisateurs (status ' + listRes.status + ')');
    console.warn('   Réponse:', JSON.stringify(listRes.body).slice(0, 200));
  }

  for (var i = 0; i < DEMO_USERS.length; i++) {
    var user = DEMO_USERS[i];
    var existing = null;
    for (var j = 0; j < existingList.length; j++) {
      if (existingList[j].email === user.email) { existing = existingList[j]; break; }
    }

    if (existing) {
      // Mettre à jour le mot de passe
      console.log('⚠️  ' + user.email + ' existe déjà → mise à jour mot de passe...');
      var upRes = await request('PUT',
        BASE + '/auth/v1/admin/users/' + existing.id,
        HEADERS_ADMIN,
        { password: user.password, user_metadata: user.data, email_confirm: true }
      );
      if (upRes.status >= 200 && upRes.status < 300) {
        console.log('   ✅ Mis à jour avec succès');
      } else {
        console.error('   ❌ Erreur (' + upRes.status + '):', JSON.stringify(upRes.body));
      }
    } else {
      // Créer l'utilisateur
      console.log('➕ Création de ' + user.email + '...');
      var crRes = await request('POST',
        BASE + '/auth/v1/admin/users',
        HEADERS_ADMIN,
        {
          email:          user.email,
          password:       user.password,
          user_metadata:  user.data,
          email_confirm:  true,
        }
      );
      if (crRes.status >= 200 && crRes.status < 300) {
        var uid = crRes.body && crRes.body.id ? crRes.body.id : '?';
        console.log('   ✅ Créé ! id: ' + uid);
      } else {
        console.error('   ❌ Erreur (' + crRes.status + '):', JSON.stringify(crRes.body));
      }
    }
  }

  console.log('\n─────────────────────────────────────');
  console.log('✅ Comptes créés :');
  console.log('   📧 admin@demo.dj  /  🔑 admin123');
  console.log('   📧 tech@demo.dj   /  🔑 tech123');
  console.log('─────────────────────────────────────\n');

  // ─── Test de connexion ────────────────────────────────────────────────────
  console.log('🔍 Test de connexion avec admin@demo.dj...');
  var loginRes = await request('POST',
    BASE + '/auth/v1/token?grant_type=password',
    HEADERS_ANON,
    { email: 'admin@demo.dj', password: 'admin123' }
  );

  if (loginRes.status === 200 && loginRes.body && loginRes.body.access_token) {
    var token = loginRes.body.access_token.slice(0, 30) + '...';
    console.log('   ✅ Connexion réussie ! Token: ' + token);

    // Test accès DB
    var authHeaders = {
      'Authorization': 'Bearer ' + loginRes.body.access_token,
      'apikey':        anonKey,
    };
    var sitesRes = await request('GET', BASE + '/rest/v1/sites?select=id,name&limit=3', authHeaders, null);
    if (sitesRes.status === 200) {
      var names = (sitesRes.body || []).map(function(s) { return s.name; }).join(', ');
      console.log('   ✅ DB sites OK — ' + (sitesRes.body || []).length + ' site(s) : ' + (names || '(aucun encore)'));
    } else {
      console.warn('   ⚠️  DB sites (' + sitesRes.status + '): ' + JSON.stringify(sitesRes.body).slice(0,150));
      console.warn('      → Vérifiez les policies RLS sur la table "sites"');
    }
  } else {
    console.error('   ❌ Connexion échouée (' + loginRes.status + ') :', JSON.stringify(loginRes.body));
  }

  console.log('\n🎉 Script terminé. Relancez l\'app et connectez-vous !\n');
}

main().catch(function(err) {
  console.error('Erreur fatale:', err.message);
  process.exit(1);
});
