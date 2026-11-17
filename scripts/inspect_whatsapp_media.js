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

async function checkMedia() {
  const { data: msgs, error } = await supabase
    .from('whatsapp_messages')
    .select('id, text, media_type, media_url, sender, created_at')
    .not('media_url', 'is', null)
    .order('created_at', { ascending: false })
    .limit(10);

  if (error) {
    console.error('Error fetching messages:', error);
    return;
  }

  console.log('Recent messages with media:');
  msgs.forEach(m => {
    console.log(`- [${m.media_type}] URL: ${m.media_url?.slice(0, 100)}... | Text: ${m.text}`);
  });
}
checkMedia();
