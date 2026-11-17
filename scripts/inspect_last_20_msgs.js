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

async function inspectLast20() {
  const { data: msgs, error } = await supabase
    .from('whatsapp_messages')
    .select('id, text, media_type, media_url, sender, created_at')
    .order('created_at', { ascending: false })
    .limit(20);

  if (error) {
    console.error(error);
    return;
  }

  msgs.forEach((m, idx) => {
    console.log(`[${idx}] sender=${m.sender} | media_type=${m.media_type} | text="${m.text}" | url_len=${m.media_url?.length} | is_data=${m.media_url?.startsWith('data:')}`);
  });
}
inspectLast20();
