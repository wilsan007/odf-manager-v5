/**
 * create-demo-users.mjs
 * ─────────────────────────────────────────────────────────────────────────────
 * Crée les comptes de démonstration dans Supabase Auth avec la service_role key.
 *
 * Usage :
 *   SUPABASE_SERVICE_KEY=eyJ... node create-demo-users.mjs
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

// ─── Lire le .env ─────────────────────────────────────────────────────────────
const env = fs.readFileSync('.env', 'utf-8');
let url = '', anonKey = '';
env.split('\n').forEach(function(l) {
  if (l.startsWith('VITE_SUPABASE_URL='))     url     = l.split('=').slice(1).join('=').trim();
  if (l.startsWith('VITE_SUPABASE_ANON_KEY=')) anonKey = l.split('=').slice(1).join('=').trim();
});

// ─── Service role key ──────────────────────────────────────────────────────────
let serviceKey = process.env.SUPABASE_SERVICE_KEY || '';
if (!serviceKey) {
  env.split('\n').forEach(function(l) {
    if (l.startsWith('SUPABASE_SERVICE_KEY=')) serviceKey = l.split('=').slice(1).join('=').trim();
  });
}

if (!url || !serviceKey) {
  console.error('\n❌ ERREUR : URL ou SUPABASE_SERVICE_KEY manquante.\n');
  console.error('Utilisation :');
  console.error('  SUPABASE_SERVICE_KEY=eyJ... node create-demo-users.mjs\n');
  console.error('Trouvez la service_role key dans :');
  console.error('  Supabase Dashboard → Project Settings → API → service_role key\n');
  process.exit(1);
}

// ─── Client admin (service_role bypasse le RLS) ────────────────────────────
const supabase = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

// ─── Comptes à créer ──────────────────────────────────────────────────────────
const DEMO_USERS = [
  {
    email:    'admin@demo.dj',
    password: 'admin123',
    user_metadata: { name: 'Administrateur', role: 'admin' }
  },
  {
    email:    'tech@demo.dj',
    password: 'tech123',
    user_metadata: { name: 'Technicien', role: 'technicien' }
  },
];

// ─── Création ─────────────────────────────────────────────────────────────────
async function createDemoUsers() {
  console.log('\n🚀 Création des comptes de démonstration dans Supabase Auth...\n');
  console.log('   URL        : ' + url);
  console.log('   Service key: ' + serviceKey.slice(0, 20) + '...\n');

  // Lister les utilisateurs existants
  const listResult = await supabase.auth.admin.listUsers();
  const existingUsers = (listResult.data && listResult.data.users) ? listResult.data.users : [];

  for (let i = 0; i < DEMO_USERS.length; i++) {
    const user = DEMO_USERS[i];
    let alreadyExists = null;
    for (let j = 0; j < existingUsers.length; j++) {
      if (existingUsers[j].email === user.email) {
        alreadyExists = existingUsers[j];
        break;
      }
    }

    if (alreadyExists) {
      console.log('⚠️  ' + user.email + ' existe déjà (id: ' + alreadyExists.id + ') — mise à jour...');
      const updateResult = await supabase.auth.admin.updateUserById(alreadyExists.id, {
        password:      user.password,
        user_metadata: user.user_metadata,
        email_confirm: true,
      });
      if (updateResult.error) {
        console.error('   ❌ Erreur mise à jour : ' + updateResult.error.message);
      } else {
        console.log('   ✅ Mot de passe mis à jour pour ' + user.email);
      }
    } else {
      const createResult = await supabase.auth.admin.createUser({
        email:         user.email,
        password:      user.password,
        user_metadata: user.user_metadata,
        email_confirm: true,
      });
      if (createResult.error) {
        console.error('   ❌ Erreur création ' + user.email + ' : ' + createResult.error.message);
      } else {
        const createdUser = createResult.data && createResult.data.user;
        console.log('   ✅ Créé : ' + (createdUser ? createdUser.email : user.email) + (createdUser ? ' (id: ' + createdUser.id + ')' : ''));
      }
    }
  }

  console.log('\n✅ Terminé ! Vous pouvez maintenant vous connecter avec :');
  console.log('   📧 admin@demo.dj  /  🔑 admin123');
  console.log('   📧 tech@demo.dj   /  🔑 tech123\n');

  // ─── Test de connexion ────────────────────────────────────────────────────
  console.log('🔍 Test de connexion avec le client anonyme...');
  const anonClient = createClient(url, anonKey);
  const loginResult = await anonClient.auth.signInWithPassword({
    email:    'admin@demo.dj',
    password: 'admin123',
  });
  if (loginResult.error) {
    console.error('   ❌ Connexion échouée : ' + loginResult.error.message);
  } else {
    const session = loginResult.data && loginResult.data.session;
    const token   = session && session.access_token ? session.access_token.slice(0, 30) + '...' : '(none)';
    console.log('   ✅ Connexion réussie ! Token: ' + token);

    // Test accès DB
    const sitesResult = await anonClient.from('sites').select('id,name').limit(3);
    if (sitesResult.error) {
      console.warn('   ⚠️  DB sites: ' + sitesResult.error.message + ' (vérifiez les policies RLS)');
    } else {
      const names = (sitesResult.data || []).map(function(s) { return s.name; }).join(', ');
      console.log('   ✅ DB OK — ' + (sitesResult.data || []).length + ' site(s) lisibles : ' + (names || '(aucun encore)'));
    }
    await anonClient.auth.signOut();
  }
}

createDemoUsers().catch(console.error);
