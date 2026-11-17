const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../src/app/tienda/page.tsx');
let code = fs.readFileSync(filePath, 'utf8');

// 1. Agregar estado bbwCollection
const stateTarget = "  const [selectedBrand, setSelectedBrand] = useState('Todas');";
const stateReplacement = "  const [selectedBrand, setSelectedBrand] = useState('Todas');\n  const [bbwCollection, setBbwCollection] = useState<'all' | 'holiday' | 'car' | 'candles_home' | 'bodycare' | 'pocketbac' | 'fall'>('all');";

if (!code.includes(stateTarget)) {
  console.error('stateTarget not found');
  process.exit(1);
}
code = code.replace(stateTarget, stateReplacement);

// 2. Modificar filtrado baseFilteredProducts
const filterTarget = `    // Filtro por stock: Solo mostrar productos disponibles para compra inmediata o por encargo especial
    const matchStock = p.stock > 0 || p.isSpecialOrder;`;

const filterReplacement = `    // Filtro por Sub-Colecciones de Bath & Body Works
    let matchBbwCollection = true;
    if (selectedBrand === 'Bath & Body Works' && bbwCollection !== 'all') {
      const t = (p.title || '').toLowerCase();
      if (bbwCollection === 'holiday') {
        const holidayKeys = ['winter', 'season', 'snow', 'pine', 'balsam', 'noel', 'peppermint', 'cashmere', 'cinnamon pinecone', 'frosted', 'holiday', 'navidad'];
        matchBbwCollection = holidayKeys.some(k => t.includes(k));
      } else if (bbwCollection === 'fall') {
        const fallKeys = ['pumpkin', 'apple', 'leaves', 'autumn', 'pecan', 'harvest', 'flannel', 'spiced', 'salted butterscotch'];
        matchBbwCollection = fallKeys.some(k => t.includes(k));
      } else if (bbwCollection === 'car') {
        matchBbwCollection = t.includes('para auto') || t.includes('difusor para auto') || t.includes('accesorio difusor para auto') || t.includes('aromatizante para auto');
      } else if (bbwCollection === 'candles_home') {
        matchBbwCollection = t.includes('vela ') || t.includes('fragancia para pared') || t.includes('difusor de fragancia para pared') || t.includes('wallflower');
      } else if (bbwCollection === 'pocketbac') {
        matchBbwCollection = t.includes('gel antibacterial') || t.includes('porta gel') || t.includes('pocketbac');
      } else if (bbwCollection === 'bodycare') {
        matchBbwCollection = t.includes('crema') || t.includes('bruma') || t.includes('mist') || t.includes('jabón') || t.includes('jabon') || t.includes('loción') || t.includes('locion') || t.includes('gel de ducha') || t.includes('exfoliante');
      }
    }

    // Filtro por stock: Solo mostrar productos disponibles para compra inmediata o por encargo especial
    const matchStock = p.stock > 0 || p.isSpecialOrder;`;

if (!code.includes(filterTarget)) {
  console.error('filterTarget not found');
  process.exit(1);
}
code = code.replace(filterTarget, filterReplacement);

const returnTarget = "return matchSearch && matchBrand && matchCat && matchStock && matchPrice;";
const returnReplacement = "return matchSearch && matchBrand && matchCat && matchStock && matchPrice && matchBbwCollection;";

if (!code.includes(returnTarget)) {
  console.error('returnTarget not found');
  process.exit(1);
}
code = code.replace(returnTarget, returnReplacement);

// 3. Botón de Bath & Body Works en la barra de departamentos
const navTarget = `            {/* SECCIÓN TRENDING / MÁS VENDIDO */}
            <button
              type="button"
              onClick={() => {
                setActiveTab('all');
                setSelectedCategory('Todas');
                if (currentView === 'account') setCurrentView('store');
                const el = document.getElementById('catalog-section');
                el?.scrollIntoView({ behavior: 'smooth' });
              }}
              className="text-white/80 hover:text-white transition shrink-0 cursor-pointer"
            >
              Tendencias
            </button>`;

const navReplacement = `            {/* BOTÓN DESTACADO BATH & BODY WORKS */}
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
              <span className="text-[10px] bg-[#0F3E36]/80 text-amber-300 px-1.5 py-0.2 rounded-full font-bold">148</span>
            </button>

            {/* SECCIÓN TRENDING / MÁS VENDIDO */}
            <button
              type="button"
              onClick={() => {
                setActiveTab('all');
                setSelectedCategory('Todas');
                if (currentView === 'account') setCurrentView('store');
                const el = document.getElementById('catalog-section');
                el?.scrollIntoView({ behavior: 'smooth' });
              }}
              className="text-white/80 hover:text-white transition shrink-0 cursor-pointer"
            >
              Tendencias
            </button>`;

if (!code.includes(navTarget)) {
  console.error('navTarget not found');
  process.exit(1);
}
code = code.replace(navTarget, navReplacement);

// 4. Modificar encabezado del catálogo cuando Bath & Body Works esté activo
const titleTarget = `{activeTab === 'new' 
                  ? (selectedCategory === 'Todas' ? 'Lo Más Nuevo en FoxDrop' : \`Lo Nuevo en \${selectedCategory}\`)
                  : activeTab === 'deals'
                  ? 'Ofertas & Descuentos Activos'
                  : (selectedCategory === 'Todas' ? 'Catálogo Completo' : \`Departamento: \${selectedCategory}\`)
                }`;

const titleReplacement = `{selectedBrand === 'Bath & Body Works'
                  ? 'Colecciones Bath & Body Works'
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

// 5. Botón de quitar filtro cuando selectedBrand !== 'Todas'
const clearFilterTarget = `            {selectedCategory !== 'Todas' && (
              <button
                onClick={() => setSelectedCategory('Todas')}
                className="bg-orange-50 hover:bg-orange-100 text-[#E65F2B] text-xs font-bold px-3 py-1.5 rounded-lg transition border border-orange-200 flex items-center gap-1 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
                <span>Quitar filtro ({selectedCategory})</span>
              </button>
            )}`;

const clearFilterReplacement = `            {selectedCategory !== 'Todas' && (
              <button
                onClick={() => setSelectedCategory('Todas')}
                className="bg-orange-50 hover:bg-orange-100 text-[#E65F2B] text-xs font-bold px-3 py-1.5 rounded-lg transition border border-orange-200 flex items-center gap-1 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
                <span>Quitar filtro ({selectedCategory})</span>
              </button>
            )}

            {selectedBrand !== 'Todas' && (
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

if (!code.includes(clearFilterTarget)) {
  console.error('clearFilterTarget not found');
  process.exit(1);
}
code = code.replace(clearFilterTarget, clearFilterReplacement);

// 6. Barra de sub-colecciones de Bath & Body Works justo arriba del grid
const catalogHeaderEndTarget = `        </div>

        {loadingProducts ? (`;

const catalogHeaderEndReplacement = `        </div>

        {/* BARRA DE SUB-COLECCIONES BATH & BODY WORKS */}
        {selectedBrand === 'Bath & Body Works' && (
          <div className="bg-gradient-to-r from-amber-50/80 via-orange-50/50 to-pink-50/80 border border-amber-200/90 rounded-2xl p-3.5 shadow-2xs space-y-2.5 animate-in fade-in slide-in-from-top duration-300">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="text-base">🌸</span>
                <div>
                  <h4 className="text-xs sm:text-sm font-extrabold text-[#0F3E36]">Colecciones Bath & Body Works</h4>
                  <p className="text-[11px] text-gray-500">Selecciona una categoría o temporada para explorar los aromas</p>
                </div>
              </div>
              {bbwCollection !== 'all' && (
                <button
                  type="button"
                  onClick={() => setBbwCollection('all')}
                  className="text-[11px] font-bold text-[#E65F2B] hover:underline flex items-center gap-0.5 cursor-pointer"
                >
                  <X className="w-3 h-3" />
                  <span>Ver todas</span>
                </button>
              )}
            </div>

            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1 overscroll-x-contain touch-pan-x">
              {[
                { id: 'all', label: 'Todo el Catálogo', icon: '✨', count: visibleProducts.filter(p => (p.brand || '').toLowerCase().includes('bath & body') || (p.title || '').toLowerCase().includes('bath & body')).length },
                { id: 'holiday', label: 'Especial Navideño', icon: '🎄', count: visibleProducts.filter(p => ((p.brand || '').toLowerCase().includes('bath & body') || (p.title || '').toLowerCase().includes('bath & body')) && ['winter', 'season', 'snow', 'pine', 'balsam', 'noel', 'peppermint', 'cashmere', 'cinnamon pinecone', 'frosted', 'holiday', 'navidad'].some(k => (p.title || '').toLowerCase().includes(k))).length },
                { id: 'car', label: 'Auto & Difusores', icon: '🚗', count: visibleProducts.filter(p => ((p.brand || '').toLowerCase().includes('bath & body') || (p.title || '').toLowerCase().includes('bath & body')) && ((p.title || '').toLowerCase().includes('para auto') || (p.title || '').toLowerCase().includes('difusor para auto') || (p.title || '').toLowerCase().includes('accesorio difusor para auto') || (p.title || '').toLowerCase().includes('aromatizante para auto'))).length },
                { id: 'candles_home', label: 'Velas & Wallflower', icon: '🕯️', count: visibleProducts.filter(p => ((p.brand || '').toLowerCase().includes('bath & body') || (p.title || '').toLowerCase().includes('bath & body')) && ((p.title || '').toLowerCase().includes('vela ') || (p.title || '').toLowerCase().includes('fragancia para pared') || (p.title || '').toLowerCase().includes('difusor de fragancia para pared') || (p.title || '').toLowerCase().includes('wallflower'))).length },
                { id: 'bodycare', label: 'Cuidado Corporal & Jabones', icon: '🧴', count: visibleProducts.filter(p => ((p.brand || '').toLowerCase().includes('bath & body') || (p.title || '').toLowerCase().includes('bath & body')) && ((p.title || '').toLowerCase().includes('crema') || (p.title || '').toLowerCase().includes('bruma') || (p.title || '').toLowerCase().includes('mist') || (p.title || '').toLowerCase().includes('jabón') || (p.title || '').toLowerCase().includes('jabon') || (p.title || '').toLowerCase().includes('loción') || (p.title || '').toLowerCase().includes('locion') || (p.title || '').toLowerCase().includes('gel de ducha') || (p.title || '').toLowerCase().includes('exfoliante'))).length },
                { id: 'pocketbac', label: 'Geles PocketBac & Porta Geles', icon: '🧼', count: visibleProducts.filter(p => ((p.brand || '').toLowerCase().includes('bath & body') || (p.title || '').toLowerCase().includes('bath & body')) && ((p.title || '').toLowerCase().includes('gel antibacterial') || (p.title || '').toLowerCase().includes('porta gel') || (p.title || '').toLowerCase().includes('pocketbac'))).length },
                { id: 'fall', label: 'Cosecha de Otoño', icon: '🍂', count: visibleProducts.filter(p => ((p.brand || '').toLowerCase().includes('bath & body') || (p.title || '').toLowerCase().includes('bath & body')) && ['pumpkin', 'apple', 'leaves', 'autumn', 'pecan', 'harvest', 'flannel', 'spiced', 'salted butterscotch'].some(k => (p.title || '').toLowerCase().includes(k))).length },
              ].map(col => {
                const isActive = bbwCollection === col.id;
                return (
                  <button
                    key={col.id}
                    type="button"
                    onClick={() => setBbwCollection(col.id as any)}
                    className={\`shrink-0 px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer \${
                      isActive
                        ? 'bg-[#0F3E36] text-white shadow-xs scale-102 ring-2 ring-amber-300/70'
                        : 'bg-white hover:bg-amber-100/60 text-gray-700 border border-amber-200/70'
                    }\`}
                  >
                    <span>{col.icon}</span>
                    <span>{col.label}</span>
                    <span className={\`text-[10px] px-1.5 py-0.2 rounded-full font-bold \${
                      isActive ? 'bg-amber-400 text-[#0F3E36]' : 'bg-gray-100 text-gray-600'
                    }\`}>
                      {col.count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {loadingProducts ? (`;

if (!code.includes(catalogHeaderEndTarget)) {
  console.error('catalogHeaderEndTarget not found');
  process.exit(1);
}
code = code.replace(catalogHeaderEndTarget, catalogHeaderEndReplacement);

fs.writeFileSync(filePath, code, 'utf8');
console.log('ALL UPDATES APPLIED TO src/app/tienda/page.tsx!');
