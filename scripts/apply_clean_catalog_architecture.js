const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../src/app/tienda/page.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// 1. Establecer selectedBrand por defecto en 'Bath & Body Works'
const oldBrandState = "const [selectedBrand, setSelectedBrand] = useState('Todas');";
const newBrandState = "const [selectedBrand, setSelectedBrand] = useState('Bath & Body Works');";

if (!content.includes(oldBrandState)) {
  console.error('oldBrandState not found');
  process.exit(1);
}
content = content.replace(oldBrandState, newBrandState);

// 2. Aislar productos internacionales de selectedBrand === 'Todas' para que solo salgan en selectedCategory === 'Internacional'
const oldBaseFilter = `    // Filtro especial para categoría 'Internacional'
    if (selectedCategory === 'Internacional') {
      const isImport = (p.sku && p.sku.startsWith('CJ')) || (p.brand && p.brand.toLowerCase().includes('cj dropshipping'));
      if (!isImport) return false;
    }`;

const newBaseFilter = `    // Aislamiento de productos internacionales: solo visibles si se entra a la sección 'Internacional'
    const isImport = (p.sku && p.sku.startsWith('CJ')) || (p.brand && p.brand.toLowerCase().includes('cj dropshipping'));
    if (selectedCategory === 'Internacional') {
      if (!isImport) return false;
    } else {
      if (isImport) return false;
    }`;

if (!content.includes(oldBaseFilter)) {
  console.error('oldBaseFilter not found');
  process.exit(1);
}
content = content.replace(oldBaseFilter, newBaseFilter);

// 3. Barra de navegación superior: dejar botones limpios y directos
const oldNavSectionStart = `{/* CATÁLOGO COMPLETO */}`;
const oldNavSectionEnd = `{/* SECCIÓN TRENDING / MÁS VENDIDO */}`;

const sIdx = content.indexOf(oldNavSectionStart);
const eIdx = content.indexOf(oldNavSectionEnd);

if (sIdx === -1 || eIdx === -1) {
  console.error('Nav section not found');
  process.exit(1);
}

const newNavSection = `{/* BOTÓN DESTACADO BATH & BODY WORKS (BODEGA DISPONIBLE) */}
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
              className={\`transition shrink-0 cursor-pointer flex items-center gap-1.5 px-3.5 py-1.5 rounded-full font-black text-xs sm:text-[13px] \${
                selectedBrand === 'Bath & Body Works' && bbwCollection === 'all'
                  ? 'bg-gradient-to-r from-amber-400 to-amber-500 text-[#0F3E36] shadow-md ring-2 ring-amber-300'
                  : 'bg-white/10 text-amber-200 hover:bg-white/20 hover:text-white border border-amber-300/30'
              }\`}
            >
              <span>🌸</span>
              <span>Bath & Body Works</span>
            </button>

            {/* ESPECIAL NAVIDEÑO */}
            <button
              type="button"
              onClick={() => {
                setSelectedBrand('Bath & Body Works');
                setSelectedCategory('Todas');
                setBbwCollection('holiday');
                setActiveTab('all');
                if (currentView === 'account') setCurrentView('store');
                const el = document.getElementById('catalog-section');
                el?.scrollIntoView({ behavior: 'smooth' });
              }}
              className={\`transition shrink-0 cursor-pointer flex items-center gap-1 px-3.5 py-1.5 rounded-full font-black text-xs sm:text-[13px] \${
                selectedBrand === 'Bath & Body Works' && bbwCollection === 'holiday'
                  ? 'bg-gradient-to-r from-red-600 via-emerald-700 to-red-600 text-white shadow-md ring-2 ring-amber-300'
                  : 'bg-white/10 text-amber-200 hover:bg-white/20 hover:text-white border border-amber-300/30'
              }\`}
            >
              <span>🎄</span>
              <span>Especial Navideño</span>
            </button>

            {/* CATÁLOGO INTERNACIONAL */}
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
              className={\`transition shrink-0 cursor-pointer flex items-center gap-1.5 px-3.5 py-1.5 rounded-full font-black text-xs sm:text-[13px] \${
                selectedCategory === 'Internacional' && selectedBrand === 'Todas'
                  ? 'bg-gradient-to-r from-indigo-500 to-blue-600 text-white shadow-md ring-2 ring-indigo-300'
                  : 'bg-white/10 text-indigo-200 hover:bg-white/20 hover:text-white border border-indigo-300/30'
              }\`}
            >
              <span>✈️</span>
              <span>FoxDrop Internacional</span>
            </button>

            `;

content = content.substring(0, sIdx) + newNavSection + content.substring(eIdx);

// 4. Limpiar título y subtítulo del catálogo: Cero menciones de Puebla, Cero "Favoritos" engañosos
const oldTitleBlock = `{selectedBrand === 'Bath & Body Works'
                  ? (bbwCollection === 'holiday' ? '🎄 Especial Navideño Bath & Body Works' : 'Colecciones Bath & Body Works')
                  : selectedCategory === 'Internacional'
                  ? '✈️ Catálogo FoxDrop Internacional (Directo a Domicilio)'
                  : activeTab === 'deals'
                  ? 'Ofertas & Descuentos Activos 🔥'
                  : '🔥 Favoritos de Temporada & Piezas Únicas en Bodega'
                }`;

const newTitleBlock = `{selectedCategory === 'Internacional'
                  ? 'FoxDrop Internacional • Envíos de Fábrica a Domicilio'
                  : bbwCollection === 'holiday'
                  ? 'Especial Navideño • Bath & Body Works'
                  : bbwCollection === 'car'
                  ? 'Auto & Difusores • Bath & Body Works'
                  : bbwCollection === 'candles_home'
                  ? 'Velas Aromáticas & Wallflowers • Bath & Body Works'
                  : bbwCollection === 'bodycare'
                  ? 'Cuidado Corporal & Jabones • Bath & Body Works'
                  : bbwCollection === 'pocketbac'
                  ? 'Geles PocketBac & Accesorios • Bath & Body Works'
                  : bbwCollection === 'fall'
                  ? 'Cosecha de Otoño • Bath & Body Works'
                  : 'Catálogo Bath & Body Works'
                }`;

if (!content.includes(oldTitleBlock)) {
  console.error('oldTitleBlock not found');
  process.exit(1);
}
content = content.replace(oldTitleBlock, newTitleBlock);

const oldSubBlock = `{selectedBrand === 'Bath & Body Works'
                ? 'Aromas y piezas de edición especial para entrega hoy o mañana en Puebla y envíos a todo México.'
                : 'Disponibilidad inmediata para entrega hoy o mañana en Puebla y envíos rápidos a todo México. ¡Piezas únicas limitadas!'}
            </p>`;

const newSubBlock = `{selectedCategory === 'Internacional'
                ? 'Artículos exclusivos de importación con envío asegurado directo a tu domicilio.'
                : 'Fragancias originales con garantía FoxDrop y envíos asegurados a toda la República Mexicana.'}
            </p>`;

if (!content.includes(oldSubBlock)) {
  console.error('oldSubBlock not found');
  process.exit(1);
}
content = content.replace(oldSubBlock, newSubBlock);

// 5. Encabezado de filtro: Quitar el botón "Todo el Catálogo" redundante
const oldPillCat = `<button
                type="button"
                onClick={() => {
                  setActiveTab('all');
                  setSelectedBrand('Todas');
                  setSelectedCategory('Todas');
                  setBbwCollection('all');
                }}
                className={\`px-3 py-1.5 rounded-lg transition-all cursor-pointer \${
                  activeTab === 'all' && selectedBrand === 'Todas' && selectedCategory === 'Todas' ? 'bg-[#0F3E36] text-white shadow-xs font-black' : 'hover:text-[#0F3E36]'
                }\`}
              >
                Todo el Catálogo
              </button>`;

const newPillCat = ``;

if (!content.includes(oldPillCat)) {
  console.error('oldPillCat not found');
  process.exit(1);
}
content = content.replace(oldPillCat, newPillCat);

// 6. En el botón de quitar filtro: dejar un botón coherente
const oldClearBrandBtn = `            {selectedBrand !== 'Todas' && (
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

const newClearBrandBtn = ``;

if (!content.includes(oldClearBrandBtn)) {
  console.error('oldClearBrandBtn not found');
  process.exit(1);
}
content = content.replace(oldClearBrandBtn, newClearBrandBtn);

fs.writeFileSync(filePath, content, 'utf8');
console.log('Clean Catalog Architecture Applied Successfully!');
