const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');
const env = fs.readFileSync('.env.local', 'utf8');
const url = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/)[1].trim();
const key = env.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/)[1].trim();
const supabase = createClient(url, key);

async function check5Prods() {
  const { data: order } = await supabase
    .from('orders')
    .select('order_items(*)')
    .eq('order_number', 'FX-POS-7041')
    .single();

  const prodIds = order.order_items.map(it => it.product_id);
  const { data: prods } = await supabase
    .from('products')
    .select('id, title, sku, stock, is_active')
    .in('id', prodIds);

  console.log('PRODUCTOS DE LA VENTA:');
  prods.forEach(p => {
    console.log(`- Titulo: ${p.title}`);
    console.log(`  SKU: '${p.sku}' | Stock restante: ${p.stock}`);
  });
}

check5Prods();
