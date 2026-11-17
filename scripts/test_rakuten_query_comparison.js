const fs = require('fs');
const env = fs.readFileSync('.env.local', 'utf8');
const envVars = Object.fromEntries(env.split('\n').filter(l => l.includes('=')).map(l => {
  const idx = l.indexOf('=');
  return [l.slice(0, idx).trim(), l.slice(idx + 1).trim()];
}));

const appId = envVars.RAKUTEN_APPLICATION_ID || '02f0acd7-36ba-4ef7-9538-fd9d6e1eaa9e';
const accessKey = envVars.RAKUTEN_ACCESS_KEY || 'pk_uY1yOYNOOvMm9eYnXJRBre7sYo7RegTGPSVLAVx5vZ0';

async function testComparison() {
  const r1 = await fetch('https://openapi.rakuten.co.jp/ichibams/api/IchibaItem/Search/20260701?applicationId=' + appId + '&accessKey=' + accessKey + '&keyword=maoams&format=json', { headers: { Origin: 'https://foxdrop.mx' } });
  const d1 = await r1.json();
  console.log('API con "maoams":', d1.count);

  const r2 = await fetch('https://openapi.rakuten.co.jp/ichibams/api/IchibaItem/Search/20260701?applicationId=' + appId + '&accessKey=' + accessKey + '&keyword=maoam&format=json', { headers: { Origin: 'https://foxdrop.mx' } });
  const d2 = await r2.json();
  console.log('API con "maoam":', d2.count);

  const r3 = await fetch('https://openapi.rakuten.co.jp/ichibams/api/IchibaItem/Search/20260701?applicationId=' + appId + '&accessKey=' + accessKey + '&keyword=' + encodeURIComponent('マオアム') + '&format=json', { headers: { Origin: 'https://foxdrop.mx' } });
  const d3 = await r3.json();
  console.log('API con Katakana "マオアム":', d3.count);
}
testComparison();
