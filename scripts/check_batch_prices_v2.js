const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const env = fs.readFileSync('d:/Foxdrop/eshop/.env.local', 'utf8');
const url = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/)[1].trim();
const key = env.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/)[1].trim();
const supabase = createClient(url, key);

async function inspectBatches() {
  const { data: batches, error } = await supabase.from('import_batches').select('*');
  console.log('Batches error?', error ? error.message : 'No error');
  console.log('Batches count:', batches ? batches.length : 0);

  const { data: prods, error: pErr } = await supabase.from('products').select('id, title, batch_id, base_cost_mxn, shipping_cost_allocated, public_price');
  console.log('Prods count:', prods ? prods.length : 0);

  // Ver los lotes distintos en products
  const batchIdsInProds = [...new Set(prods.map(p => p.batch_id))];
  console.log('Batch IDs present in products table:', batchIdsInProds);

  batchIdsInProds.forEach(bId => {
    const list = prods.filter(p => p.batch_id === bId);
    console.log(`\nBatch [${bId}] has ${list.length} products:`);
    list.slice(0, 4).forEach(p => {
      console.log(`- ${p.title.slice(0, 35)} | Costo Base: $${p.base_cost_mxn} | Flete: $${p.shipping_cost_allocated} | Precio Venta: $${p.public_price}`);
    });
  });
}
inspectBatches();
