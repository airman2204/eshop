const sharp = require('d:/Foxdrop/eshop/node_modules/sharp');
const fs = require('fs');

async function buildOgImage() {
  const foxBuf = fs.readFileSync('d:/Foxdrop/eshop/public/fox-logo-head-3d.png');
  const resizedFox = await sharp(foxBuf).resize(360, 360, { fit: 'contain' }).toBuffer();

  const svgText = Buffer.from(`
    <svg width="1200" height="630" viewBox="0 0 1200 630" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="bg" cx="50%" cy="40%" r="70%">
          <stop offset="0%" stop-color="#16322C"/>
          <stop offset="100%" stop-color="#0A1614"/>
        </radialGradient>
        <linearGradient id="gold" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#F6C88D"/>
          <stop offset="50%" stop-color="#DF7F2D"/>
          <stop offset="100%" stop-color="#A34D0F"/>
        </linearGradient>
      </defs>
      <rect width="1200" height="630" fill="url(#bg)"/>
      <text x="540" y="290" font-family="system-ui, -apple-system, sans-serif" font-size="96" font-weight="900" letter-spacing="2" fill="url(#gold)">FOXDROP</text>
      <text x="545" y="350" font-family="system-ui, -apple-system, sans-serif" font-size="24" font-weight="800" letter-spacing="8" fill="#E5B581">TU ATAJO AL MUNDO</text>
      <rect x="545" y="385" width="430" height="38" rx="19" fill="rgba(223, 127, 45, 0.15)" stroke="rgba(223, 127, 45, 0.4)" stroke-width="1.5"/>
      <text x="760" y="410" font-family="system-ui, -apple-system, sans-serif" font-size="14" font-weight="700" fill="#F3D5B5" text-anchor="middle">✨ Importaciones de Japón, EE. UU. y Boutique Oficial</text>
      <text x="545" y="465" font-family="system-ui, -apple-system, sans-serif" font-size="16" font-weight="600" fill="#8FAAA3">foxdrop.mx • Entregas locales y envíos a todo México</text>
    </svg>
  `);

  const finalImg = await sharp(svgText)
    .composite([
      { input: resizedFox, top: 135, left: 130 }
    ])
    .png({ quality: 95 })
    .toBuffer();

  fs.writeFileSync('d:/Foxdrop/eshop/public/og-image.png', finalImg);
  fs.writeFileSync('d:/Foxdrop/eshop/public/foxdrop-logo.png', finalImg);
  console.log('og-image.png and foxdrop-logo.png successfully created!');
}

buildOgImage().catch(console.error);
