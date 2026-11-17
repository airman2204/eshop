const fs = require('fs');
const env = fs.readFileSync('d:/Foxdrop/eshop/.env.local', 'utf8');
const apiKey = env.match(/GEMINI_API_KEY=(.*)/)[1].trim();

const text = 'ワンピース Grandista SHANKS シャンクス 【即納品】 赤髪海賊団 ONE PIECE グランディスタ プライズ フィギュア バンプレスト 赤髪のシャンクス';

async function testGemini() {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{
        parts: [{
          text: `Traduce y adapta este título de producto japonés de Rakuten a español comercial mexicano para tienda online FoxDrop México:
Título original: ${text}

Responde únicamente un JSON con este formato exacto:
{
  "title": "traducción limpia comercial corta",
  "category": "Figuras & Coleccionables"
}`
        }]
      }]
    })
  });
  const data = await res.json();
  console.log('Gemini Translation Result:\n', data.candidates[0].content.parts[0].text);
}
testGemini();
