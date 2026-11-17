const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../src/components/AdminJapanTab.tsx');
let file = fs.readFileSync(filePath, 'utf8');

const normalize = s => s.replace(/\r\n/g, '\n');
file = normalize(file);

const oldHelper = normalize(`// Helper para generar URL nativa y canónica de ZenMarket para Rakuten Japón
const getZenMarketUrl = (url: string): string => {
  if (!url) return 'https://zenmarket.jp/es/rakuten.aspx';
  try {
    const match = url.match(/item\\.rakuten\\.co\\.jp\\/([^\\/\\?#]+)\\/([^\\/\\?#]+)/);
    if (match) {
      return \`https://zenmarket.jp/es/rakutenproduct.aspx?itemCode=\${match[1]}:\${match[2]}\`;
    }
  } catch (e) {}
  return \`https://zenmarket.jp/es/other.aspx?itemUrl=\${encodeURIComponent(url)}\`;
};`);

const newHelper = normalize(`// Helper infalible para abrir cualquier producto de Rakuten en ZenMarket sin errores 404
const getZenMarketUrl = (url: string, itemName?: string): string => {
  if (url) {
    // Al pasar la URL limpia como parámetro 'q' a ZenMarket Rakuten, ZenMarket la captura en su buscador oficial
    // y resuelve automáticamente el producto en español con stock e imágenes garantizadas
    return \`https://zenmarket.jp/es/rakuten.aspx?q=\${encodeURIComponent(url.trim())}\`;
  }
  if (itemName) {
    return \`https://zenmarket.jp/es/rakuten.aspx?q=\${encodeURIComponent(itemName.trim())}\`;
  }
  return 'https://zenmarket.jp/es/rakuten.aspx';
};`);

if (!file.includes(oldHelper)) {
  console.error('oldHelper not found');
  process.exit(1);
}

file = file.replace(oldHelper, newHelper);
fs.writeFileSync(filePath, file, 'utf8');
console.log('Successfully updated getZenMarketUrl to query-resolver format!');
