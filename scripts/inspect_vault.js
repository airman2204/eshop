const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const envFile = fs.readFileSync('.env.local', 'utf8');
const env = {};
envFile.split('\n').forEach(line => {
  const idx = line.indexOf('=');
  if (idx > 0) {
    const k = line.substring(0, idx).trim();
    let v = line.substring(idx + 1).trim();
    if (v.startsWith('"') && v.endsWith('"')) v = v.slice(1, -1);
    env[k] = v;
  }
});

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

async function check() {
  const { data, error } = await supabase.storage.from('admin-vault').download('credentials.json');
  if (error) {
    console.error('Download error:', error);
    return;
  }
  const creds = JSON.parse(await data.text());
  console.log('Users in vault:', Object.keys(creds));
  for (const [email, user] of Object.entries(creds)) {
    console.log(`- ${email}: role=${user.role}, mustChangePassword=${user.mustChangePassword}, 2FA=${Boolean(user.twoFactor?.enabled)}`);
  }
}
check();
