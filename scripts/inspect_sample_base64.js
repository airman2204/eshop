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

async function inspectSample() {
  const { data: msgs, error } = await supabase
    .from('whatsapp_messages')
    .select('id, text, media_type, media_url, sender, created_at')
    .ilike('media_url', 'data:image%')
    .order('created_at', { ascending: false })
    .limit(3);

  if (error) {
    console.error(error);
    return;
  }

  msgs.forEach((m, i) => {
    console.log(`Msg ${i}: ID=${m.id}, length=${m.media_url?.length}, start=${m.media_url?.slice(0, 50)}, end=${m.media_url?.slice(-20)}`);
  });
}
inspectSample();
