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

function createAdminToken(email) {
  const secret = env.JWT_SECRET || 'foxdrop_ultra_secret_admin_key_2026';
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const now = Math.floor(Date.now() / 1000);
  const payload = Buffer.from(JSON.stringify({
    email,
    role: 'admin',
    iat: now,
    exp: now + 3600,
  })).toString('base64url');
  const signature = crypto.createHmac('sha256', secret).update(`${header}.${payload}`).digest('base64url');
  return `${header}.${payload}.${signature}`;
}

async function testWishlistIsolation() {
  const superAdminToken = createAdminToken('magc2204@gmail.com');
  const veroToken = createAdminToken('veronica.hdz.ms@gmail.com');
  const nydiaToken = createAdminToken('nydia.villarce405@gmail.com');

  const { POST } = await import('../src/app/api/admin/rakuten/route.ts');

  console.log('Testing Wishlist channel resolution & isolation...');

  // 1. Veronica guarda un producto en su wishlist
  const veroMockItem = {
    itemCode: 'test-candy-001',
    itemName: 'KitKat Japón Matcha',
    priceJpy: 500,
    baseCostMxn: 60,
    estimatedShippingMxn: 120,
    totalCostMxn: 180,
    suggestedPublicPrice: 249,
    images: ['https://example.com/kitkat.jpg'],
    shopName: 'Tokio Sweets',
    itemUrl: 'https://rakuten.co.jp/item1',
    addedBy: 'veronica.hdz.ms@gmail.com',
    addedAt: new Date().toISOString(),
    status: 'pending',
    note: 'Favorito para preventa'
  };

  const reqSaveVero = new Request('http://localhost:3000/api/admin/rakuten', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${veroToken}` },
    body: JSON.stringify({ action: 'save_wishlist', channel: 'vero', wishlist: [veroMockItem] })
  });
  const resSaveVero = await POST(reqSaveVero);
  const dataSaveVero = await resSaveVero.json();
  console.log('1. Vero guardando en canal vero:', dataSaveVero);

  // 2. Nydia intenta leer el canal de Vero (debe fallar o devolver su propio canal nydia)
  const reqNydiaTryVero = new Request('http://localhost:3000/api/admin/rakuten', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${nydiaToken}` },
    body: JSON.stringify({ action: 'get_wishlist', channel: 'vero' })
  });
  const resNydiaTryVero = await POST(reqNydiaTryVero);
  const dataNydiaTryVero = await resNydiaTryVero.json();
  console.log('2. Nydia intentando leer canal vero (esperado: canal nydia vacío):', dataNydiaTryVero);

  // 3. Super Admin (Mario) consulta canal Vero
  const reqMarioGetVero = new Request('http://localhost:3000/api/admin/rakuten', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${superAdminToken}` },
    body: JSON.stringify({ action: 'get_wishlist', channel: 'vero' })
  });
  const resMarioGetVero = await POST(reqMarioGetVero);
  const dataMarioGetVero = await resMarioGetVero.json();
  console.log('3. Mario consultando canal vero (debe ver el KitKat):', dataMarioGetVero.wishlist?.length, 'items');

  // 4. Vero intenta importar producto a la tienda (debe ser rechazado con 403)
  const reqVeroImport = new Request('http://localhost:3000/api/admin/rakuten', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${veroToken}` },
    body: JSON.stringify({ action: 'import', title: 'Producto Prohibido', publicPrice: 299 })
  });
  const resVeroImport = await POST(reqVeroImport);
  const dataVeroImport = await resVeroImport.json();
  console.log('4. Vero intentando importar (esperado 403 rechazado):', resVeroImport.status, dataVeroImport);
}

testWishlistIsolation().catch(console.error);
