import https from 'https';
import fs from 'fs';

const env = fs.readFileSync('.env', 'utf-8');
let url = '', key = '';
env.split('\n').forEach(l => {
    if (l.startsWith('VITE_SUPABASE_URL=')) url = l.split('=')[1].trim();
    if (l.startsWith('VITE_SUPABASE_ANON_KEY=')) key = l.split('=')[1].trim();
});

const runQuery = () => {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: url.replace('https://', ''),
            path: '/rest/v1/vue_routes_service?select=*',
            headers: {
                'apikey': key,
                'Authorization': `Bearer ${key}`
            }
        };
        https.get(options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                resolve({ status: res.statusCode, data });
            });
        }).on('error', reject);
    });
};

async function main() {
    const r = await runQuery();
    console.log("Status:", r.status);
    console.log("Response:", r.data);
}

main();
