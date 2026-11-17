const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../src/components/AdminJapanTab.tsx');
let file = fs.readFileSync(filePath, 'utf8');

const normalize = s => s.replace(/\r\n/g, '\n');
file = normalize(file);

const oldHelper = normalize(`// Helper infalible para abrir directamente la ficha del producto en ZenMarket
const getZenMarketUrl = (rawUrl: string, itemName?: string): string => {
  if (!rawUrl) return 'https://zenmarket.jp/es/rakuten.aspx';
  
  let targetUrl = rawUrl.trim();
  // 1. Si viene como URL de afiliado de Rakuten (hb.afl.rakuten.co.jp), extraer la URL real del producto
  try {
    if (targetUrl.includes('hb.afl.rakuten.co.jp')) {
      const parsed = new URL(targetUrl);
      const pc = parsed.searchParams.get('pc');
      if (pc) targetUrl = decodeURIComponent(pc);
    }
  } catch (e) {}

  // 2. Extraer tienda y código de producto para ir DIRECTO a la ficha de ZenMarket
  try {
    const match = targetUrl.match(/item\\.rakuten\\.co\\.jp\\/([^\\/\\?#]+)\\/([^\\/\\?#]+)/);
    if (match) {
      const shopCode = match[1];
      const itemCode = match[2];
      return \`https://zenmarket.jp/es/rakutenproduct.aspx?itemCode=\${shopCode}:\${itemCode}\`;
    }
  } catch (e) {}

  // 3. Fallback: Si no coincide con el regex de Rakuten, buscar por la URL limpia en ZenMarket
  return \`https://zenmarket.jp/es/rakuten.aspx?q=\${encodeURIComponent(targetUrl)}\`;
};`);

const newHelper = normalize(`// Helper infalible para abrir directamente el producto en ZenMarket
const getZenMarketUrl = (rawUrl: string, itemName?: string): string => {
  if (!rawUrl) return 'https://zenmarket.jp/es/rakuten.aspx';
  
  let cleanUrl = rawUrl.trim();
  // 1. Extraer la URL real limpia de la tienda de Rakuten si viene empaquetada con afiliados
  try {
    if (cleanUrl.includes('hb.afl.rakuten.co.jp')) {
      const parsed = new URL(cleanUrl);
      const pc = parsed.searchParams.get('pc');
      if (pc) cleanUrl = decodeURIComponent(pc);
    }
  } catch (e) {}

  // 2. El endpoint oficial de ZenMarket para capturar e importar URLs externas con stock y cotización viva es othershopproduct.aspx?u=
  return \`https://zenmarket.jp/es/othershopproduct.aspx?u=\${encodeURIComponent(cleanUrl)}\`;
};`);

if (!file.includes(oldHelper)) {
  console.error('oldHelper not found');
  process.exit(1);
}

file = file.replace(oldHelper, newHelper);
fs.writeFileSync(filePath, file, 'utf8');
console.log('Successfully updated getZenMarketUrl to othershopproduct.aspx format!');
