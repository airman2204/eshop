const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
const rawCsv = require('./products_catalog_source.js');

// 1. Parse .env.local
const envPath = path.join(__dirname, '..', '.env.local');
const envText = fs.readFileSync(envPath, 'utf8');
const env = {};
for (const line of envText.split(/\r?\n/)) {
  const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
  if (match) {
    let value = match[2] || '';
    if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
    else if (value.startsWith("'") && value.endsWith("'")) value = value.slice(1, -1);
    env[match[1]] = value.trim();
  }
}

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = env.SUPABASE_SERVICE_ROLE_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// 2. Parse CSV
function parseCsvLine(line) {
  const values = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      if (inQuotes && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (c === ',' && !inQuotes) {
      values.push(cur);
      cur = '';
    } else {
      cur += c;
    }
  }
  values.push(cur);
  return values;
}

const lines = rawCsv.split(/\r?\n/).filter(l => l.trim().length > 0);
const header = parseCsvLine(lines[0]);
console.log('CSV Header:', header);

const records = [];
for (let i = 1; i < lines.length; i++) {
  const parts = parseCsvLine(lines[i]);
  if (parts.length >= 6) {
    records.push({
      sku: parts[0].trim(),
      originalTitle: parts[1].trim(),
      category: parts[2].trim(),
      stock: parseInt(parts[3].trim()) || 0,
      description: parts[4].trim(),
      nombreFoxDrop: parts[5].trim(),
    });
  }
}

console.log(`Parsed ${records.length} records from provided data.`);

async function execute() {
  const { data: dbProducts, error } = await supabase
    .from('products')
    .select('id, title, sku, description, category_id');

  if (error) {
    console.error('Supabase fetch error:', error);
    return;
  }

  console.log(`Database has ${dbProducts.length} products.`);

  const updates = [];
  const notFound = [];

  for (const rec of records) {
    // Buscar match en dbProducts:
    // 1. Por título exacto con originalTitle o con nombreFoxDrop
    // 2. Por SKU exacto si el SKU del CSV es numérico real
    // 3. Por similitud / inclusión de texto
    let match = dbProducts.find(p => p.title && p.title.trim().toLowerCase() === rec.originalTitle.toLowerCase());
    
    if (!match && rec.sku && !rec.sku.includes('E+') && !rec.sku.includes('FX-')) {
      match = dbProducts.find(p => p.sku && p.sku.trim() === rec.sku);
    }

    if (!match) {
      match = dbProducts.find(p => p.title && p.title.trim().toLowerCase() === rec.nombreFoxDrop.toLowerCase());
    }

    if (!match) {
      const cleanOrig = rec.originalTitle.toLowerCase().replace(/[^a-z0-9]/g, '');
      match = dbProducts.find(p => {
        const cleanDb = (p.title || '').toLowerCase().replace(/[^a-z0-9]/g, '');
        return cleanDb === cleanOrig || (cleanOrig.length > 8 && (cleanDb.includes(cleanOrig) || cleanOrig.includes(cleanDb)));
      });
    }

    if (match) {
      updates.push({
        id: match.id,
        currentTitle: match.title,
        newTitle: rec.nombreFoxDrop || rec.originalTitle,
        currentDescription: match.description,
        newDescription: rec.description,
        sku: rec.sku.includes('E+') ? match.sku : rec.sku,
        originalTitle: rec.originalTitle
      });
    } else {
      notFound.push(rec);
    }
  }

  console.log(`\nMatched: ${updates.length} / ${records.length}`);
  console.log(`Not matched: ${notFound.length}`);

  if (notFound.length > 0) {
    console.log('\n--- Unmatched Items ---');
    notFound.forEach(n => console.log(`- [SKU: ${n.sku}] "${n.originalTitle}" -> "${n.nombreFoxDrop}"`));
  }

  // Realizar las actualizaciones en Supabase
  let successCount = 0;
  let failCount = 0;

  for (const upd of updates) {
    const payload = {
      title: upd.newTitle,
      description: upd.newDescription,
      updated_at: new Date().toISOString()
    };
    if (upd.sku && !upd.sku.includes('E+') && !upd.sku.startsWith('FX-')) {
      payload.sku = upd.sku;
    }

    const { error: updErr } = await supabase
      .from('products')
      .update(payload)
      .eq('id', upd.id);

    if (updErr) {
      console.error(`Error updating product ${upd.id} (${upd.newTitle}):`, updErr);
      failCount++;
    } else {
      successCount++;
    }
  }

  console.log(`\n=== RESULTADO FINAL ===`);
  console.log(`Actualizados exitosamente: ${successCount}`);
  console.log(`Errores: ${failCount}`);
}

execute();
