const fs = require('fs');
const filePath = 'd:/Foxdrop/eshop/src/app/admin/page.tsx';
let code = fs.readFileSync(filePath, 'utf8');

// 1. Importar AdminJapanTab
if (!code.includes('AdminJapanTab')) {
  code = code.replace(
    "import AdminCjTab from '@/components/AdminCjTab';",
    "import AdminCjTab from '@/components/AdminCjTab';\nimport AdminJapanTab from '@/components/AdminJapanTab';"
  );
  console.log('Added AdminJapanTab import');
}

// 2. Modificar tipo de crmSubTab y validTabs
code = code.replace(
  "'cj_dropship' | 'campaigns' | 'analytics'>('inventory')",
  "'cj_dropship' | 'japan' | 'campaigns' | 'analytics'>('inventory')"
);

code = code.replace(
  "'agent', 'whatsapp', 'cj_dropship', 'campaigns', 'analytics']",
  "'agent', 'whatsapp', 'cj_dropship', 'japan', 'campaigns', 'analytics']"
);

// 3. Modificar inventoryScope para soportar 'japan_international'
code = code.replace(
  "useState<'physical' | 'cj_international'>",
  "useState<'physical' | 'cj_international' | 'japan_international'>"
);

// 4. Agregar botón lateral Catálogo Japón debajo de Catálogo CJ
const cjSidebarTarget = `              {/* CJ DROPSHIPPING IMPORTADOR */}
              <button
                onClick={() => { setCrmSubTab('cj_dropship'); setMobileSidebarOpen(false); }}
                className={\`w-full px-3 py-2 rounded-xl font-medium transition flex items-center justify-between \${
                  crmSubTab === 'cj_dropship'
                    ? 'bg-indigo-900/60 text-white font-bold border border-indigo-500/40 shadow-xs' 
                    : 'text-slate-400 hover:bg-slate-800/40 hover:text-slate-200'
                }\`}
              >
                <span className="flex items-center gap-2.5">
                  <Globe className={\`w-4 h-4 \${crmSubTab === 'cj_dropship' ? 'text-indigo-400' : 'text-slate-400'}\`} /> Catálogo CJ (Dropship)
                </span>
                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-indigo-500/20 text-indigo-300 border border-indigo-400/30">
                  Global
                </span>
              </button>`;

const japanSidebarBtn = `              {/* CJ DROPSHIPPING IMPORTADOR */}
              <button
                onClick={() => { setCrmSubTab('cj_dropship'); setMobileSidebarOpen(false); }}
                className={\`w-full px-3 py-2 rounded-xl font-medium transition flex items-center justify-between \${
                  crmSubTab === 'cj_dropship'
                    ? 'bg-indigo-900/60 text-white font-bold border border-indigo-500/40 shadow-xs' 
                    : 'text-slate-400 hover:bg-slate-800/40 hover:text-slate-200'
                }\`}
              >
                <span className="flex items-center gap-2.5">
                  <Globe className={\`w-4 h-4 \${crmSubTab === 'cj_dropship' ? 'text-indigo-400' : 'text-slate-400'}\`} /> Catálogo CJ (Dropship)
                </span>
                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-indigo-500/20 text-indigo-300 border border-indigo-400/30">
                  Global
                </span>
              </button>

              {/* RAKUTEN JAPÓN IMPORTADOR */}
              <button
                onClick={() => { setCrmSubTab('japan'); setMobileSidebarOpen(false); }}
                className={\`w-full px-3 py-2 rounded-xl font-medium transition flex items-center justify-between \${
                  crmSubTab === 'japan'
                    ? 'bg-red-950 text-white font-bold border border-red-500/40 shadow-xs' 
                    : 'text-slate-400 hover:bg-slate-800/40 hover:text-slate-200'
                }\`}
              >
                <span className="flex items-center gap-2.5">
                  <span className="text-base leading-none">🎌</span> Catálogo Japón (Rakuten)
                </span>
                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-red-500/20 text-red-300 border border-red-400/30">
                  Tokio
                </span>
              </button>`;

if (code.includes(cjSidebarTarget)) {
  code = code.replace(cjSidebarTarget, japanSidebarBtn);
  console.log('Added Japan tab to sidebar');
}

// 5. Títulos en header
code = code.replace(
  "{crmSubTab === 'cj_dropship' && 'Catálogo Global & Importador CJ Dropshipping'}",
  "{crmSubTab === 'cj_dropship' && 'Catálogo Global & Importador CJ Dropshipping'}\n                    {crmSubTab === 'japan' && 'Catálogo Oficial Japón — Rakuten Ichiba 🎌'}"
);

code = code.replace(
  "{crmSubTab === 'cj_dropship' && 'Busca productos virales de bajo costo en China y publícalos con 1 clic en FoxDrop'}",
  "{crmSubTab === 'cj_dropship' && 'Busca productos virales de bajo costo en China y publícalos con 1 clic en FoxDrop'}\n                    {crmSubTab === 'japan' && 'Explora e importa figuras originales, cartas coleccionables, dulces y novedades directo desde Japón'}"
);

// 6. Renderizar componente de Japón
const cjRender = `{crmSubTab === 'cj_dropship' && (
          <AdminCjTab
            usdRate={usdRate}
            existingProducts={products}
            storeCategories={dbCategories.map(c => c.name)}
            onProductImported={(newP: any) => {
              const cleanProd = mapDbProductToApp(newP);
              setProducts(prev => [cleanProd, ...prev.filter(p => p.id !== cleanProd.id)]);
              fetchAdminCategories().then(cats => {
                if (cats && cats.length > 0) setDbCategories(cats);
              }).catch(() => {});
              alert('¡Producto importado con éxito! Ya está disponible en tu catálogo de FoxDrop.');
            }}
          />
        )}`;

const japanRender = `{crmSubTab === 'cj_dropship' && (
          <AdminCjTab
            usdRate={usdRate}
            existingProducts={products}
            storeCategories={dbCategories.map(c => c.name)}
            onProductImported={(newP: any) => {
              const cleanProd = mapDbProductToApp(newP);
              setProducts(prev => [cleanProd, ...prev.filter(p => p.id !== cleanProd.id)]);
              fetchAdminCategories().then(cats => {
                if (cats && cats.length > 0) setDbCategories(cats);
              }).catch(() => {});
              alert('¡Producto importado con éxito! Ya está disponible en tu catálogo de FoxDrop.');
            }}
          />
        )}

        {crmSubTab === 'japan' && (
          <AdminJapanTab
            existingProducts={products}
            onProductImported={() => {
              loadProducts();
            }}
          />
        )}`;

if (code.includes(cjRender)) {
  code = code.replace(cjRender, japanRender);
  console.log('Added Japan Tab render block');
}

// 7. Modificar los botones de inventario para tener los 3 scopes: Bodega Física | CJ Dropshipping | Japón Rakuten
const oldInventoryScopeButtons = `                <button
                  type="button"
                  onClick={() => setInventoryScope('cj_international')}
                  className={\`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer \${
                    inventoryScope === 'cj_international'
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  }\`}
                >
                  <Globe className={\`w-3.5 h-3.5 \${inventoryScope === 'cj_international' ? 'text-indigo-200' : 'text-slate-400'}\`} />
                  <span>✈️ Catálogo Virtual (Importación CJ)</span>
                  <span className={\`px-2 py-0.5 rounded-full text-[10px] font-semibold \${
                    inventoryScope === 'cj_international' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
                  }\`}>
                    {products.filter(p => (p.sku && p.sku.startsWith('CJ')) || (p.brand && p.brand.toLowerCase().includes('cj dropshipping'))).length}
                  </span>
                </button>`;

const newInventoryScopeButtons = `                <button
                  type="button"
                  onClick={() => setInventoryScope('cj_international')}
                  className={\`px-3 sm:px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer \${
                    inventoryScope === 'cj_international'
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  }\`}
                >
                  <Globe className={\`w-3.5 h-3.5 \${inventoryScope === 'cj_international' ? 'text-indigo-200' : 'text-slate-400'}\`} />
                  <span>✈️ Importación CJ</span>
                  <span className={\`px-2 py-0.5 rounded-full text-[10px] font-semibold \${
                    inventoryScope === 'cj_international' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
                  }\`}>
                    {products.filter(p => (p.sku && p.sku.startsWith('CJ')) || (p.brand && p.brand.toLowerCase().includes('cj dropshipping'))).length}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setInventoryScope('japan_international')}
                  className={\`px-3 sm:px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer \${
                    inventoryScope === 'japan_international'
                      ? 'bg-red-700 text-white shadow-xs'
                      : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  }\`}
                >
                  <span>🎌</span>
                  <span>Importación Japón</span>
                  <span className={\`px-2 py-0.5 rounded-full text-[10px] font-semibold \${
                    inventoryScope === 'japan_international' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
                  }\`}>
                    {products.filter(p => (p.sku && p.sku.startsWith('JP-')) || (p.brand && p.brand.toLowerCase().includes('rakuten'))).length}
                  </span>
                </button>`;

if (code.includes(oldInventoryScopeButtons)) {
  code = code.replace(oldInventoryScopeButtons, newInventoryScopeButtons);
  console.log('Added 3rd scope button (Japón) to inventory filters');
}

// 8. Actualizar el filtro de productos para considerar japan_international y physical
const oldFilterPhysical = `    const isCj = Boolean((p.sku && p.sku.startsWith('CJ')) || (p.brand && p.brand.toLowerCase().includes('cj dropshipping')));
    if (inventoryScope === 'physical' && isCj) return false;
    if (inventoryScope === 'cj_international' && !isCj) return false;`;

const newFilterPhysical = `    const isCj = Boolean((p.sku && p.sku.startsWith('CJ')) || (p.brand && p.brand.toLowerCase().includes('cj dropshipping')));
    const isJapan = Boolean((p.sku && p.sku.startsWith('JP-')) || (p.brand && p.brand.toLowerCase().includes('rakuten')));
    if (inventoryScope === 'physical' && (isCj || isJapan)) return false;
    if (inventoryScope === 'cj_international' && !isCj) return false;
    if (inventoryScope === 'japan_international' && !isJapan) return false;`;

if (code.includes(oldFilterPhysical)) {
  code = code.replace(oldFilterPhysical, newFilterPhysical);
  console.log('Updated inventory scope filter for physical, cj and japan');
}

fs.writeFileSync(filePath, code, 'utf8');
console.log('Admin page updated with Japan integration!');
