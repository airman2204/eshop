const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../src/app/api/admin/rakuten/route.ts');
let content = fs.readFileSync(filePath, 'utf8');

// Normalizar CRLF
content = content.replace(/\r\n/g, '\n');

const target = `    if (keyword && keyword.trim()) {
      url += \`&keyword=\${encodeURIComponent(keyword.trim())}\`;
    } else if (genreId) {
      url += \`&genreId=\${encodeURIComponent(genreId.trim())}\`;
    } else {
      // Si no hay keyword ni genreId, buscar tendencias generales
      url += \`&keyword=\${encodeURIComponent("ランキング 人気")}\`;
    }`;

const replacement = `    // Sanitizar keyword para la API de Rakuten Japón:
    // La API de Rakuten rechaza consultas con palabras de 1 solo dígito o letra suelta (ej. "Nintendo Switch 2" o "Playstation 5")
    // causando un error 400 "keyword is not valid".
    let cleanKeyword = (keyword || "").trim();
    if (cleanKeyword) {
      const tokens = cleanKeyword.split(/\\s+/);
      const validTokens = tokens.filter(t => t.length >= 2);
      if (validTokens.length > 0) {
        cleanKeyword = validTokens.join(" ");
      }
    }

    if (cleanKeyword) {
      url += \`&keyword=\${encodeURIComponent(cleanKeyword)}\`;
    } else if (genreId) {
      url += \`&genreId=\${encodeURIComponent(genreId.trim())}\`;
    } else {
      // Si no hay keyword ni genreId, buscar tendencias generales
      url += \`&keyword=\${encodeURIComponent("ランキング 人気")}\`;
    }`;

if (!content.includes(target)) {
  console.error('target not found in route.ts');
  process.exit(1);
}

content = content.replace(target, replacement);
fs.writeFileSync(filePath, content, 'utf8');
console.log('Rakuten route.ts keyword sanitizer applied successfully!');
