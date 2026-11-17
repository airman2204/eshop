const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const crypto = require('crypto');

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

function hashPassword(pass) {
  return crypto.createHash('sha256').update(pass.trim()).digest('hex');
}

async function provisionVero() {
  const { data, error } = await supabase.storage.from('admin-vault').download('credentials.json');
  if (error) {
    console.error('Download error:', error);
    return;
  }
  const creds = JSON.parse(await data.text());

  // Asignar roles explícitos
  if (creds['magc2204@gmail.com']) {
    creds['magc2204@gmail.com'].role = 'super_admin';
  }
  if (creds['nydia.villarce405@gmail.com']) {
    creds['nydia.villarce405@gmail.com'].role = 'admin';
  }

  // Provisionar a Veronica
  const defaultPassword = 'FoxDrop2026!Vero';
  creds['veronica.hdz.ms@gmail.com'] = {
    password: hashPassword(defaultPassword),
    mustChangePassword: true,
    role: 'seller_japan',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    twoFactor: {
      enabled: false,
      secret: null,
      backupCodes: []
    }
  };

  const uploadRes = await supabase.storage.from('admin-vault').upload(
    'credentials.json',
    Buffer.from(JSON.stringify(creds, null, 2)),
    {
      contentType: 'application/json',
      upsert: true
    }
  );

  if (uploadRes.error) {
    console.error('Upload error:', uploadRes.error);
    return;
  }

  console.log('✅ Veronica provisioned successfully with default password and role seller_japan!');
}

provisionVero();
