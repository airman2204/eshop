const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../src/app/tienda/page.tsx');
let code = fs.readFileSync(filePath, 'utf8');

// 1. Modificar baseFilteredProducts para soportar selectedCategory === 'Internacional'
const filterTarget = `    // Filtro por Sub-Colecciones de Bath & Body Works
    let matchBbwCollection = true;
    if (selectedBrand === 'Bath & Body Works' && bbwCollection !== 'all') {`;

const filterReplacement = `    // Filtro especial para categoría 'Internacional'
    if (selectedCategory === 'Internacional') {
      const isImport = (p.sku && p.sku.startsWith('CJ')) || (p.brand && p.brand.toLowerCase().includes('cj dropshipping'));
      if (!isImport) return false;
    }

    // Filtro por Sub-Colecciones de Bath & Body Works
    let matchBbwCollection = true;
    if (selectedBrand === 'Bath & Body Works' && bbwCollection !== 'all') {`;

if (!code.includes(filterTarget)) {
  console.error('filterTarget not found');
  process.exit(1);
}
code = code.replace(filterTarget, filterReplacement);

// 2. Modificar la barra de departamentos para que sea limpia y minimalista
// Quitar el loop de popularCategories y poner los botones principales
const navSectionStart = `{/* CATEGORÍAS POPULARES DE FOXDROP */}`;
const navSectionEnd = `{/* SECCIÓN TRENDING / MÁS VENDIDO */}`;

const startIdx = code.indexOf(navSectionStart);
const endIdx = code.indexOf(navSectionEnd);

if (startIdx === -1 || endIdx === -1) {
  console.error('Nav section delimiters not found');
  process.exit(1);
}

const newNavSection = `{/* BOTÓN DESTACADO BATH & BODY WORKS */}
            <button
              type="button"
              onClick={() => {
                setSelectedBrand('Bath & Body Works');
                setSelectedCategory('Todas');
                setBbwCollection('all');
                setActiveTab('all');
                if (currentView === 'account') setCurrentView('store');
                const el = document.getElementById('catalog-section');
                el?.scrollIntoView({ behavior: 'smooth' });
              }}
              className={\`transition shrink-0 cursor-pointer flex items-center gap-1.5 px-3 py-1 rounded-full font-black text-xs sm:text-[13px] \${
                selectedBrand === 'Bath & Body Works'
                  ? 'bg-gradient-to-r from-amber-400 to-amber-500 text-[#0F3E36] shadow-md ring-2 ring-amber-300'
                  : 'bg-white/10 text-amber-200 hover:bg-white/20 hover:text-white border border-amber-300/30'
              }\`}
            >
              <span>🌸</span>
              <span>Bath & Body Works</span>
            </button>

            {/* BOTÓN CATÁLOGO INTERNACIONAL */}
            <button
              type="button"
              onClick={() => {
                setSelectedBrand('Todas');
                setSelectedCategory('Internacional');
                setBbwCollection('all');
                setActiveTab('all');
                if (currentView === 'account') setCurrentView('store');
                const el = document.getElementById('catalog-section');
                el?.scrollIntoView({ behavior: 'smooth' });
              }}
              className={\`transition shrink-0 cursor-pointer flex items-center gap-1.5 px-3 py-1 rounded-full font-black text-xs sm:text-[13px] \${
                selectedCategory === 'Internacional' && selectedBrand === 'Todas'
                  ? 'bg-gradient-to-r from-indigo-500 to-blue-600 text-white shadow-md ring-2 ring-indigo-300'
                  : 'bg-white/10 text-indigo-200 hover:bg-white/20 hover:text-white border border-indigo-300/30'
              }\`}
            >
              <span>✈️</span>
              <span>Internacional</span>
            </button>

            `;

code = code.substring(0, startIdx) + newNavSection + code.substring(endIdx);

// 3. Modificar el título de la sección de catálogo
const titleTarget = `{selectedBrand === 'Bath & Body Works'
                  ? 'Colecciones Bath & Body Works'
                  : activeTab === 'new' 
                  ? (selectedCategory === 'Todas' ? 'Lo Más Nuevo en FoxDrop' : \`Lo Nuevo en \${selectedCategory}\`)
                  : activeTab === 'deals'
                  ? 'Ofertas & Descuentos Activos'
                  : (selectedCategory === 'Todas' ? 'Catálogo Completo' : \`Departamento: \${selectedCategory}\`)
                }`;

const titleReplacement = `{selectedBrand === 'Bath & Body Works'
                  ? 'Colecciones Bath & Body Works'
                  : selectedCategory === 'Internacional'
                  ? 'Catálogo FoxDrop Internacional (Directo a Domicilio)'
                  : activeTab === 'new' 
                  ? (selectedCategory === 'Todas' ? 'Lo Más Nuevo en FoxDrop' : \`Lo Nuevo en \${selectedCategory}\`)
                  : activeTab === 'deals'
                  ? 'Ofertas & Descuentos Activos'
                  : (selectedCategory === 'Todas' ? 'Catálogo Completo' : \`Departamento: \${selectedCategory}\`)
                }`;

if (!code.includes(titleTarget)) {
  console.error('titleTarget not found');
  process.exit(1);
}
code = code.replace(titleTarget, titleReplacement);

// 4. Quitar el conteo en los botones de sub-colecciones BBW
const subColBadgeTarget = `<span className={\`text-[10px] px-1.5 py-0.2 rounded-full font-bold \${
                      isActive ? 'bg-amber-400 text-[#0F3E36]' : 'bg-gray-100 text-gray-600'
                    }\`}>
                      {col.count}
                    </span>`;

const subColBadgeReplacement = ``;

if (!code.includes(subColBadgeTarget)) {
  console.error('subColBadgeTarget not found');
  process.exit(1);
}
code = code.replace(subColBadgeTarget, subColBadgeReplacement);

// 5. Botones de limpiar filtros
const clearBtnTarget = `            {selectedBrand !== 'Todas' && (
              <button
                onClick={() => {
                  setSelectedBrand('Todas');
                  setBbwCollection('all');
                }}
                className="bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold px-3 py-1.5 rounded-lg transition border border-rose-200 flex items-center gap-1 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
                <span>Ver todas las marcas ({selectedBrand})</span>
              </button>
            )}`;

const clearBtnReplacement = `            {selectedBrand !== 'Todas' && (
              <button
                onClick={() => {
                  setSelectedBrand('Todas');
                  setBbwCollection('all');
                }}
                className="bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold px-3 py-1.5 rounded-lg transition border border-rose-200 flex items-center gap-1 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
                <span>Ver todo el catálogo</span>
              </button>
            )}`;

if (!code.includes(clearBtnTarget)) {
  console.error('clearBtnTarget not found');
  process.exit(1);
}
code = code.replace(clearBtnTarget, clearBtnReplacement);

fs.writeFileSync(filePath, code, 'utf8');
console.log('TIENDA PAGE UPDATED SUCCESSFULLY!');
