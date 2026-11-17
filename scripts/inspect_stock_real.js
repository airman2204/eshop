const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const env = fs.readFileSync('.env.local', 'utf8');
const url = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/)[1].trim();
const key = env.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/)[1].trim();
const supabase = createClient(url, key);

async function run() {
  const { data: prods, error } = await supabase.from('products').select('*');
  if (error) {
    console.error('Error:', error);
    return;
  }
  const inStock = (prods || []).filter(p => (p.stock || 0) > 0);
  let totalCost = 0;
  let totalVal = 0;
  let totalPieces = 0;
  const cats = {};

  inStock.forEach(p => {
    const cost = (Number(p.total_cost_mxn) || Number(p.base_cost_mxn) || 0) * p.stock;
    const val = Number(p.public_price || 0) * p.stock;
    totalCost += cost;
    totalVal += val;
    totalPieces += p.stock;
    const cat = p.category || 'Otros';
    cats[cat] = (cats[cat] || 0) + p.stock;
  });

  console.log('RESUMEN_STOCK:', JSON.stringify({
    articulos_distintos: inStock.length,
    piezas_totales: totalPieces,
    inversion_en_bodega: Math.round(totalCost),
    valor_venta: Math.round(totalVal),
    ganancia_potencial: Math.round(totalVal - totalCost),
    por_categoria: cats
  }, null, 2));

  console.log('\nTOP_STOCK:');
  inStock.sort((a,b) => b.stock - a.stock).slice(0, 15).forEach(p => {
    console.log(`- ${p.title} | Stock: ${p.stock} | Costo: $${p.total_cost_mxn || p.base_cost_mxn} | Venta: $${p.public_price}`);
  });
}

run();
