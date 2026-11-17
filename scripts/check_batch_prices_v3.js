const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const env = fs.readFileSync('d:/Foxdrop/eshop/.env.local', 'utf8');
const url = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/)[1].trim();
const key = env.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/)[1].trim();
const supabase = createClient(url, key);

async function inspectBatches() {
  const { data: batches } = await supabase.from('import_batches').select('*');
  console.log('Batches:', batches.map(b => ({ id: b.id, name: b.name, totalItems: b.total_items, shippingCost: b.shipping_cost_mxn })));

  const { data: prods, error } = await supabase.from('products').select('*');
  if (error) {
    console.log('Error fetching products:', error);
    return;
  }
  console.log('Total products in database:', prods.length);

  batches.forEach(b => {
    const list = prods.filter(p => p.batch_id === b.id);
    console.log(`\n=== LOTE: ${b.name} (ID: ${b.id}) - ${list.length} PRODUCTOS ===`);
    list.slice(0, 6).forEach(p => {
      console.log(`- ${p.title.slice(0, 40)} | Base MXN: $${p.base_cost_mxn} | Flete: $${p.shipping_cost_allocated} | Precio Venta: $${p.public_price}`);
    });
  });

  const sinLote = prods.filter(p => !p.batch_id);
  console.log(`\n=== PRODUCTOS SIN LOTE ASIGNADO: ${sinLote.length} ===`);
  sinLote.slice(0, 5).forEach(p => {
    console.log(`- ${p.title.slice(0, 40)} | Base: $${p.base_cost_mxn} | Flete: $${p.shipping_cost_allocated} | Precio: $${p.public_price}`);
  });
}
inspectBatches();
