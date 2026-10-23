const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const envPath = path.join(__dirname, '..', '.env.local');
const envText = fs.readFileSync(envPath, 'utf8');
const env = {};
envText.split(/\r?\n/).forEach(l => {
  const m = l.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
  if (m) {
    let v = m[2] || '';
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1);
    }
    env[m[1]] = v.trim();
  }
});

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function inspectMp() {
  const { data, error } = await supabase.storage.from('product-images').download('_system/checkout_settings.json');
  if (error) {
    console.error('Storage error:', error);
    return;
  }
  const text = await data.text();
  const cfg = JSON.parse(text);
  const mp = cfg.mercadopago || {};
  console.log('--- Configuración Mercado Pago ---');
  console.log('Habilitado:', mp.enabled);
  console.log('Modo Sandbox:', mp.sandbox);
  console.log('Public Key (primeros 20 cars):', (mp.publicKey || '').slice(0, 20));
  console.log('Access Token (primeros 25 cars):', (mp.accessToken || '').slice(0, 25));
  console.log('¿Es token de prueba (TEST-)?', (mp.accessToken || '').startsWith('TEST-'));
  console.log('¿Es token de producción (APP_USR-)?', (mp.accessToken || '').startsWith('APP_USR-'));
}

inspectMp();
