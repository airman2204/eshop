const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');
const env = fs.readFileSync('.env.local', 'utf8');
const url = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/)[1].trim();
const key = env.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/)[1].trim();
const supabase = createClient(url, key);

async function checkOrders() {
  const { data: orders, error } = await supabase
    .from('orders')
    .select('id, order_number, client_name, client_phone, total, created_at, status')
    .order('created_at', { ascending: false })
    .limit(10);

  if (error) {
    console.error('Error fetching orders:', error);
    return;
  }

  console.log('ÚLTIMAS 10 ÓRDENES EN BASE DE DATOS:');
  orders.forEach(o => {
    console.log(`- [${o.order_number || o.id}] ${o.client_name} (${o.client_phone}) | Total: $${o.total} | Status: ${o.status} | Fecha: ${o.created_at}`);
  });
}

checkOrders();
