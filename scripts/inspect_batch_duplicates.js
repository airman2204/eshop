const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const env = fs.readFileSync('.env.local', 'utf8');
const url = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/)[1].trim();
const key = env.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/)[1].trim();
const supabase = createClient(url, key);

async function inspectDuplicates() {
  const { data: batches } = await supabase.from('import_batches').select('*');
  console.log('=== LOTES ===');
  batches.forEach(b => console.log(b.id, b.batch_name || b.name, b.created_at));

  const { data: prods } = await supabase.from('products').select('id, title, sku, stock, created_at').order('created_at');
  console.log('\nTotal productos:', prods.length);

  // Agrupar por SKU
  const skuMap = {};
  prods.forEach(p => {
    if (p.sku) {
      const s = p.sku.trim();
      if (!skuMap[s]) skuMap[s] = [];
      skuMap[s].push(p);
    }
  });

  console.log('\n=== DUPLICADOS POR SKU ===');
  let skuDups = 0;
  for (const [sku, list] of Object.entries(skuMap)) {
    if (list.length > 1) {
      skuDups++;
      console.log(`\nSKU: ${sku} (${list.length} registros)`);
      list.forEach(item => console.log(`  - [${item.id}] ${item.title} (Stock: ${item.stock}, Creado: ${item.created_at})`));
    }
  }
  if (skuDups === 0) console.log('Ninguno duplicado actualmente por SKU (las claves son únicas).');

  // Agrupar por coincidencia de título o fragancia
  const titleMap = {};
  prods.forEach(p => {
    const t = p.title.trim().toLowerCase();
    if (!titleMap[t]) titleMap[t] = [];
    titleMap[t].push(p);
  });

  console.log('\n=== DUPLICADOS POR TITULO EXACTO ===');
  let titleDups = 0;
  for (const [title, list] of Object.entries(titleMap)) {
    if (list.length > 1) {
      titleDups++;
      console.log(`\n[${titleDups}] "${title}" (${list.length} registros)`);
      list.forEach(item => console.log(`  - ID: ${item.id} | SKU: ${item.sku} | Stock: ${item.stock} | Fecha: ${item.created_at}`));
    }
  }

  // Buscar específicamente "Cherry Blossom" o "Vela"
  console.log('\n=== ARTICULOS DE JAPANESE CHERRY BLOSSOM O VELAS SIMILARES ===');
  const targetProds = prods.filter(p => p.title.toLowerCase().includes('cherry blossom') || p.title.toLowerCase().includes('vela'));
  targetProds.forEach(p => console.log(`- [${p.id}] SKU: ${p.sku} | Stock: ${p.stock} | Titulo: ${p.title} (${p.created_at})`));
}

inspectDuplicates();
