const fs = require('fs');
const env = fs.readFileSync('d:/Foxdrop/eshop/.env.local', 'utf8');
const bridgeUrl = env.match(/WHATSAPP_BRIDGE_URL=(.*)/)?.[1]?.trim();
const bridgeKey = env.match(/WHATSAPP_BRIDGE_API_KEY=(.*)/)?.[1]?.trim();
console.log('Bridge URL:', bridgeUrl);
console.log('Bridge Key present?', !!bridgeKey);

async function checkBridge() {
  if (!bridgeUrl) {
    console.log('No bridge URL found in .env.local');
    return;
  }
  try {
    const res = await fetch(`${bridgeUrl}/status`, {
      headers: {
        'x-api-key': bridgeKey || ''
      }
    });
    console.log('Status code:', res.status);
    const text = await res.text();
    console.log('Bridge status response:', text);
  } catch (err) {
    console.log('Error contacting bridge:', err.message);
  }
}
checkBridge();
