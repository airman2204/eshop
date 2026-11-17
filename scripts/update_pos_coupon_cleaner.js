const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../src/app/admin/page.tsx');
let content = fs.readFileSync(filePath, 'utf8');

const target = `  // Función para validar y aplicar cupón de campaña QR en el Punto de Venta (POS)
  const handleValidateAndApplyPosCoupon = async (rawCode: string) => {
    const cleanCode = (rawCode || '').trim();`;

const rep = `  // Extraer código de cupón si el escáner capturó la URL completa
  const extractCleanPosCode = (input: string): string => {
    if (!input) return '';
    let clean = input.trim();
    try {
      if (clean.includes('http://') || clean.includes('https://') || clean.includes('?promo=') || clean.includes('?cupon=')) {
        const url = new URL(clean.startsWith('http') ? clean : \`https://foxdrop.mx/\${clean}\`);
        const param = url.searchParams.get('promo') || url.searchParams.get('cupon') || url.searchParams.get('code');
        if (param) return param.trim();
      }
    } catch {}
    const paramMatch = clean.match(/(?:promo|cupon|code)=([A-Za-z0-9\\-_]+)/i);
    if (paramMatch) return paramMatch[1].trim();
    const prefixMatch = clean.match(/((?:HAL|FOX)-[A-Za-z0-9\\-]+)/i);
    if (prefixMatch) return prefixMatch[1].trim();
    return clean;
  };

  // Función para validar y aplicar cupón de campaña QR en el Punto de Venta (POS)
  const handleValidateAndApplyPosCoupon = async (rawCode: string) => {
    const cleanCode = extractCleanPosCode(rawCode);`;

const normalize = s => s.replace(/\r\n/g, '\n');
content = normalize(content);

if (!content.includes(normalize(target))) {
  console.error('target not found in admin/page.tsx');
  process.exit(1);
}

content = content.replace(normalize(target), normalize(rep));
fs.writeFileSync(filePath, content, 'utf8');
console.log('Successfully updated POS coupon validation to handle scanned URLs!');
