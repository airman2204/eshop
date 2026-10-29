const sharp = require('sharp');
const fs = require('fs');

async function createVampireFox() {
  // Official Fox head is 760 x 731
  // Let's create an elegant vampire transformation:
  // 1. Two cute vampire fangs coming down from upper lip
  // 2. High Dracula collar (purple/black satin cape with red interior lining) behind the head
  // 3. Subtle mysterious purple/amber eye glint or vampire contour
  
  const collarSvg = Buffer.from(`
<svg width="760" height="731" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <!-- Dracula Cape Collar: outer black/purple satin, inner dark ruby crimson -->
    <linearGradient id="capeOuter" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#1E0E2E" />
      <stop offset="50%" stop-color="#12061C" />
      <stop offset="100%" stop-color="#09020F" />
    </linearGradient>
    <linearGradient id="capeInner" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#881337" />
      <stop offset="60%" stop-color="#4C0519" />
      <stop offset="100%" stop-color="#28020D" />
    </linearGradient>
    <filter id="capeShadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="4" stdDeviation="6" flood-color="rgba(0,0,0,0.7)" />
    </filter>
  </defs>

  <!-- Left high vampire cape collar wing (behind left cheek) -->
  <path d="M 190 490 Q 90 320 130 210 Q 170 310 240 460 Z" fill="url(#capeOuter)" stroke="#4C0519" stroke-width="3" filter="url(#capeShadow)" />
  <path d="M 190 480 Q 120 330 145 235 Q 175 325 235 450 Z" fill="url(#capeInner)" opacity="0.95" />

  <!-- Right high vampire cape collar wing (behind right cheek) -->
  <path d="M 570 490 Q 670 320 630 210 Q 590 310 520 460 Z" fill="url(#capeOuter)" stroke="#4C0519" stroke-width="3" filter="url(#capeShadow)" />
  <path d="M 570 480 Q 640 330 615 235 Q 585 325 525 450 Z" fill="url(#capeInner)" opacity="0.95" />
</svg>
  `);

  const fangsSvg = Buffer.from(`
<svg width="760" height="731" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="fangGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#FFFFFF" />
      <stop offset="70%" stop-color="#FFF5F5" />
      <stop offset="100%" stop-color="#FED7D7" />
    </linearGradient>
    <filter id="fangShadow" x="-30%" y="-30%" width="160%" height="160%">
      <feDropShadow dx="0" dy="3" stdDeviation="2" flood-color="rgba(0,0,0,0.6)" />
    </filter>
  </defs>

  <!-- Left Fang (from viewer perspective: upper left smile curve) -->
  <path d="M 326 498 Q 336 498 344 502 L 336 536 Q 328 518 326 498 Z" fill="url(#fangGrad)" filter="url(#fangShadow)" stroke="#E2E8F0" stroke-width="1.2" />

  <!-- Right Fang (from viewer perspective: upper right smile curve) -->
  <path d="M 434 498 Q 424 498 416 502 L 424 536 Q 432 518 434 498 Z" fill="url(#fangGrad)" filter="url(#fangShadow)" stroke="#E2E8F0" stroke-width="1.2" />

  <!-- Subtle Dracula medallion / bat brooch at the bottom collar junction -->
  <g transform="translate(380, 680) scale(0.95)" filter="url(#fangShadow)">
    <polygon points="0,-16 12,0 0,16 -12,0" fill="#E11D48" stroke="#F59E0B" stroke-width="2" />
    <circle cx="0" cy="0" r="3" fill="#FDE047" />
  </g>
</svg>
  `);

  // Composite: collar (behind) + fox head (middle) + fangs (front)
  const collarBuf = await sharp(collarSvg).png().toBuffer();
  const fangsBuf = await sharp(fangsSvg).png().toBuffer();

  await sharp(collarBuf)
    .composite([
      { input: 'public/fox-logo-head-3d.png', left: 0, top: 0 },
      { input: fangsBuf, left: 0, top: 0 }
    ])
    .png({ quality: 95 })
    .toFile('public/fox-logo-head-vampire.png');

  console.log('fox-logo-head-vampire.png successfully created!');
}

createVampireFox().catch(console.error);
