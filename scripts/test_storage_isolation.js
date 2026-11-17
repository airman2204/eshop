const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');
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

async function testStorageBuckets() {
  console.log('Testing Supabase Storage for isolated wishlists...');

  const veroFile = '_system/japan_wishlist_vero.json';
  const nydiaFile = '_system/japan_wishlist_nydia.json';

  // 1. Guardar item en vero
  const mockVeroItem = [{
    itemCode: 'test-vero-01',
    itemName: 'KitKat Matcha Tokio',
    itemNameEs: 'KitKat de Té Verde Matcha',
    priceJpy: 650,
    baseCostMxn: 78,
    estimatedShippingMxn: 120,
    totalCostMxn: 198,
    suggestedPublicPrice: 299,
    images: ['https://example.com/kitkat.jpg'],
    shopName: 'Tokio Sweets',
    addedBy: 'veronica.hdz.ms@gmail.com',
    addedAt: new Date().toISOString(),
    status: 'pending',
    note: 'Favorito para preventa con Mario'
  }];

  const upVero = await supabase.storage.from('product-images').upload(
    veroFile,
    Buffer.from(JSON.stringify(mockVeroItem, null, 2)),
    { contentType: 'application/json', upsert: true }
  );
  console.log('1. Subida a Wishlist Vero:', upVero.error ? upVero.error : '✅ OK');

  // 2. Verificar que Nydia NO tiene este archivo o está vacío
  const { data: nydiaData } = await supabase.storage.from('product-images').download(nydiaFile);
  console.log('2. Descarga Wishlist Nydia:', nydiaData ? 'Contiene datos' : '✅ No existe o está vacía (Aislada)');

  // 3. Descargar Wishlist Vero
  const { data: veroData } = await supabase.storage.from('product-images').download(veroFile);
  if (veroData) {
    const parsed = JSON.parse(await veroData.text());
    console.log('3. Wishlist Vero descargada:', parsed.length, 'items');
    console.log('   Item 0:', parsed[0].itemName, '-', parsed[0].note);
  }
}

testStorageBuckets();
