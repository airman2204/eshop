const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');
const env = fs.readFileSync('.env.local', 'utf8');
const url = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/)[1].trim();
const key = env.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/)[1].trim();
const supabase = createClient(url, key);

async function inspectRealWarehouse() {
  const { data: batches } = await supabase.from('import_batches').select('*');
  const { data: prods } = await supabase.from('products').select('*');

  console.log('--- LOTES REGISTRADOS ---');
  (batches || []).forEach(b => {
    console.log(`- Lote: ${b.batch_name || b.name} | ID: ${b.id}`);
  });

  // Los 10 gadgets con stock 20 (astronauta, espejo, etc.) se importaron como catálogo CJ o dropshipping
  // Filtremos los que realmente corresponden a tus compras de inventario físico en mano
  const inStock = (prods || []).filter(p => (p.stock || 0) > 0);

  // Separar los 10 productos genéricos de china (stock=20/19)
  const chinaCatalog = inStock.filter(p => [
    'Difusor Llama Volcánica USB, Humidificador Medusa, Luz Noche',
    'Lámpara de Mesa LED con proyección de ondas de agua y efecto cristal (16 Colores RGB)',
    'Mini Impresora Térmica Portátil Bluetooth para Etiquetas de Celular',
    'Cortina Mágica LED RGB Bluetooth Inteligente Navidad',
    'Espejo de Maquillaje Portátil Plegable con Luz LED USB',
    'Astronauta lámpara noche y proyector de  galaxias',
    'Termo Inteligente Acero Inoxidable Pantalla de Temperatura',
    'Gua Sha Facial Eléctrico Rejuvenecedor con Calor & LED',
    'Sellador Térmico Portátil USB para Bolsas de Alimentos y Snacks',
    'Dispensador Automático de Jabón sin Contacto Sensor IR'
  ].includes(p.title) || p.stock >= 19);

  const realPhysicalStock = inStock.filter(p => !chinaCatalog.includes(p));

  let realCost = 0;
  let realPieces = 0;
  let realVal = 0;

  realPhysicalStock.forEach(p => {
    const cost = (Number(p.total_cost_mxn) || Number(p.base_cost_mxn) || 0) * p.stock;
    const val = Number(p.public_price || 0) * p.stock;
    realCost += cost;
    realPieces += p.stock;
    realVal += val;
  });

  console.log('\n--- RESUMEN STOCK FÍSICO REAL EN TUS MANOS ---');
  console.log({
    piezas_fisicas_reales: realPieces,
    articulos_distintos: realPhysicalStock.length,
    inversion_fisica_real: Math.round(realCost),
    valor_venta_esperado: Math.round(realVal),
    ganancia_neta_esperada: Math.round(realVal - realCost)
  });

  console.log('\n--- LISTADO DE PRODUCTOS FÍSICOS REALES EN BODEGA ---');
  realPhysicalStock
    .sort((a,b) => b.stock - a.stock)
    .forEach(p => {
      console.log(`- ${p.title} | Stock: ${p.stock} | Costo Unit: $${p.total_cost_mxn || p.base_cost_mxn} | Venta: $${p.public_price} | Inversión: $${Math.round((p.total_cost_mxn || p.base_cost_mxn || 0) * p.stock)}`);
    });
}

inspectRealWarehouse();
