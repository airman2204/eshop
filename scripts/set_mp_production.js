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

async function setProduction() {
  const { data, error } = await supabase.storage.from('product-images').download('_system/checkout_settings.json');
  if (error) {
    console.error('Storage read error:', error);
    return;
  }
  const text = await data.text();
  const cfg = JSON.parse(text);
  
  if (!cfg.mercadopago) cfg.mercadopago = {};
  cfg.mercadopago.enabled = true;
  cfg.mercadopago.sandbox = false; // PRODUCCIÓN REAL
  
  const updatedBuffer = Buffer.from(JSON.stringify(cfg, null, 2), 'utf-8');
  const { error: uploadError } = await supabase.storage
    .from('product-images')
    .upload('_system/checkout_settings.json', updatedBuffer, {
      contentType: 'application/json',
      upsert: true
    });

  if (uploadError) {
    console.error('Error saving updated settings:', uploadError);
  } else {
    console.log('SUCCESS: Mercado Pago configurado en PRODUCCIÓN (sandbox: false).');
  }
}

setProduction();
