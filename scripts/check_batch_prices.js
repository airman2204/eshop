const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const env = fs.readFileSync('d:/Foxdrop/eshop/.env.local', 'utf8');
const url = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/)[1].trim();
const key = env.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/)[1].trim();
const supabase = createClient(url, key);

async function inspectBatches() {
  const { data: batches } = await supabase.from('import_batches').select('*').order('created_at', { ascending: true });
  console.log('--- LOTES EN BASE DE DATOS ---');
  batches.forEach(b => console.log('Lote:', b.id, b.name, 'Shipping:', b.shipping_cost_mxn, 'Items:', b.total_items));

  const { data: prods } = await supabase.from('products').select('id, title, batch_id, base_cost_mxn, shipping_cost_allocated, public_price').order('created_at', { ascending: true });
  
  batches.forEach(b => {
    const bProds = prods.filter(p => p.batch_id === b.id);
    console.log(`\n=== ${b.name} (${bProds.length} productos) ===`);
    bProds.slice(0, 5).forEach(p => {
      console.log(`- ${p.title.slice(0, 35)} | Costo Base: $${p.base_cost_mxn} | Flete: $${p.shipping_cost_allocated} | Precio Venta: $${p.public_price}`);
    });
  });
}
inspectBatches();
