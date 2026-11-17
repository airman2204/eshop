const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const env = fs.readFileSync('.env.local', 'utf8');
const url = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/)[1].trim();
const key = env.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/)[1].trim();
const supabase = createClient(url, key);

async function mergeDuplicates() {
  console.log('--- INICIANDO UNIFICACIÓN DE PRODUCTOS DUPLICADOS ENTRE LOTES ---');

  // CASO 1: Vela aromática 1 mecha Japanese Cherry Blossom
  // Lote 1: ID 3b07532b-5b2f-4d21-b728-4995b369fa05 (SKU: 667659421503, Stock 1)
  // Lote 3: ID 0033e376-7364-4f52-9af6-9a24249e3ae5 (SKU: 28022703, Stock 1)
  console.log('\n1. Unificando Vela 1 mecha Japanese Cherry Blossom...');
  // Aumentar stock del Lote 1 a 2 piezas, asegurar que esté activa y con foto de alta resolución del Lote 3
  const { error: err1 } = await supabase
    .from('products')
    .update({
      stock: 2,
      is_active: true,
      images: [
        'https://ylflbastmupjknruqvpc.supabase.co/storage/v1/object/public/product-images/products/batch3_028022703_japanese-cherry-blossom-single.jpg'
      ]
    })
    .eq('id', '3b07532b-5b2f-4d21-b728-4995b369fa05');

  if (err1) console.error('Error actualizando Vela 1:', err1);
  else {
    // Eliminar el duplicado del Lote 3
    const { error: delErr1 } = await supabase.from('products').delete().eq('id', '0033e376-7364-4f52-9af6-9a24249e3ae5');
    if (delErr1) console.error('Error eliminando duplicado Vela Lote 3:', delErr1);
    else console.log('✓ Vela unificada: Stock = 2, SKU = 667659421503, Duplicado eliminado.');
  }

  // CASO 2: Jabón líquido Mahogany Teakwood
  // Lote 1: ID 1d90c4db-010a-4aca-bcd0-8c7205a996b3 (SKU: 1200198002278, Stock 1)
  // Lote 3: ID 6a4cced1-edce-455b-99f1-d8725189dd03 (SKU: 28003597, Stock 2)
  console.log('\n2. Unificando Jabón líquido Mahogany Teakwood...');
  const { error: err2 } = await supabase
    .from('products')
    .update({
      stock: 3, // 1 + 2 = 3 piezas
      is_active: true,
      images: [
        'https://ylflbastmupjknruqvpc.supabase.co/storage/v1/object/public/product-images/products/batch3_028003597_mahogany-teakwood-cleansing-gel.jpg'
      ]
    })
    .eq('id', '1d90c4db-010a-4aca-bcd0-8c7205a996b3');

  if (err2) console.error('Error actualizando Jabón:', err2);
  else {
    const { error: delErr2 } = await supabase.from('products').delete().eq('id', '6a4cced1-edce-455b-99f1-d8725189dd03');
    if (delErr2) console.error('Error eliminando duplicado Jabón Lote 3:', delErr2);
    else console.log('✓ Jabón unificado: Stock = 3, SKU = 1200198002278, Duplicado eliminado.');
  }

  // CASO 3: Gel antibacterial Eucalyptus Mint
  // Lote 1: ID 4f6b9df6-ca69-4b38-a710-2444c8b0b270 (SKU: FX-6131, Stock 0)
  // Lote 3: ID 89415ad2-e3f1-47a5-9ba3-5f9fbddc1a32 (SKU: 28030018, Stock 1)
  console.log('\n3. Unificando Gel antibacterial Eucalyptus Mint...');
  // Como el del Lote 1 tenía stock 0 y SKU provisional FX-6131, actualizamos el Lote 3 como el oficial o conservamos el Lote 1 con stock 1
  const { error: delErr3 } = await supabase.from('products').delete().eq('id', '4f6b9df6-ca69-4b38-a710-2444c8b0b270');
  if (delErr3) console.error('Error eliminando Gel con stock 0:', delErr3);
  else {
    await supabase.from('products').update({ is_active: true, stock: 1 }).eq('id', '89415ad2-e3f1-47a5-9ba3-5f9fbddc1a32');
    console.log('✓ Gel unificado: Stock = 1, Duplicado antiguo con stock 0 eliminado.');
  }

  console.log('\n--- PROCESO DE UNIFICACIÓN COMPLETADO CON ÉXITO ---');
}

mergeDuplicates();
