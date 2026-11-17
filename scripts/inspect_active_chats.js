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

async function inspectChat() {
  const { data: chats, error } = await supabase
    .from('whatsapp_chats')
    .select('id, phone, client_name, last_message')
    .order('last_message_time', { ascending: false })
    .limit(5);

  console.log('Recent chats:');
  for (const c of chats) {
    const { count } = await supabase
      .from('whatsapp_messages')
      .select('id', { count: 'exact', head: true })
      .eq('chat_id', c.id);
    console.log(`- Chat: ${c.clientName} (+${c.phone}), ID=${c.id}, Total msgs=${count}`);
  }
}
inspectChat();
