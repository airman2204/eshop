const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const env = fs.readFileSync('.env.local', 'utf8');
const url = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/)[1].trim();
const key = env.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/)[1].trim();
const supabase = createClient(url, key);

async function findOverlap() {
  const { data: prods } = await supabase.from('products').select('*').order('created_at');
  const lote1 = prods.filter(p => p.created_at < '2026-10-15');
  const lote3 = prods.filter(p => p.created_at >= '2026-10-15');

  console.log('Lote 1/2 total:', lote1.length);
  console.log('Lote 3 total:', lote3.length);

  const matched = [];
  lote3.forEach(p3 => {
    // Normalizar titulo para comparar (quitar acentos, parentesis, etc.)
    const clean3 = p3.title.toLowerCase().replace(/\s+/g, ' ').trim();
    const p1 = lote1.find(p => {
      const clean1 = p.title.toLowerCase().replace(/\s+/g, ' ').trim();
      return clean1 === clean3;
    });
    if (p1) {
      matched.push({ p1, p3 });
    }
  });

  console.log('\n=== PRODUCTOS EXACTAMENTE REPETIDOS ENTRE LOTES ===');
  console.log(`Total encontrados: ${matched.length}`);
  matched.forEach(({ p1, p3 }, i) => {
    console.log(`\n${i + 1}. ${p1.title}`);
    console.log(`   LOTE ANTERIOR -> SKU: "${p1.sku}" | Stock: ${p1.stock} | Activo: ${p1.is_active} | ID: ${p1.id}`);
    console.log(`   LOTE 3        -> SKU: "${p3.sku}" | Stock: ${p3.stock} | Activo: ${p3.is_active} | ID: ${p3.id}`);
  });
}

findOverlap();
