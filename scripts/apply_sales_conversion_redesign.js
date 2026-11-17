const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../src/app/tienda/page.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// 1. Cambiar valor inicial de activeTab a 'all'
const oldActiveTabState = "const [activeTab, setActiveTab] = useState<'new' | 'deals' | 'all'>('new');";
const newActiveTabState = "const [activeTab, setActiveTab] = useState<'new' | 'deals' | 'all'>('all');";

if (!content.includes(oldActiveTabState)) {
  console.error('oldActiveTabState not found');
  process.exit(1);
}
content = content.replace(oldActiveTabState, newActiveTabState);

// 2. Modificar el botón de la barra superior de departamentos: de "Lo Nuevo" a "🔥 Más Vendidos & Navidad"
const oldNavLoNuevo = `{/* NUEVOS INGRESOS */}
            <button
              type="button"
              onClick={() => {
                setActiveTab('new');
                setSelectedCategory('Todas');
                if (currentView === 'account') setCurrentView('store');
                const el = document.getElementById('catalog-section');
                el?.scrollIntoView({ behavior: 'smooth' });
              }}
              className={\`transition shrink-0 cursor-pointer \${
                activeTab === 'new' && selectedCategory === 'Todas'
                  ? 'text-white underline underline-offset-4 decoration-2 decoration-[#DF7F2D] font-black'
                  : 'text-white/80 hover:text-white'
              }\`}
            >
              Lo Nuevo
            </button>`;

const newNavLoNuevo = `{/* CATÁLOGO COMPLETO */}
            <button
              type="button"
              onClick={() => {
                setActiveTab('all');
                setSelectedCategory('Todas');
                setSelectedBrand('Todas');
                setBbwCollection('all');
                if (currentView === 'account') setCurrentView('store');
                const el = document.getElementById('catalog-section');
                el?.scrollIntoView({ behavior: 'smooth' });
              }}
              className={\`transition shrink-0 cursor-pointer font-black \${
                activeTab === 'all' && selectedCategory === 'Todas' && selectedBrand === 'Todas'
                  ? 'text-white underline underline-offset-4 decoration-2 decoration-[#DF7F2D]'
                  : 'text-white/80 hover:text-white'
              }\`}
            >
              Catálogo Completo
            </button>

            {/* MÁS VENDIDOS & NAVIDAD */}
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
              className={\`transition shrink-0 cursor-pointer flex items-center gap-1 px-3 py-1 rounded-full font-black text-xs sm:text-[13px] \${
                selectedBrand === 'Bath & Body Works' && bbwCollection === 'holiday'
                  ? 'bg-gradient-to-r from-red-600 via-emerald-700 to-red-600 text-white shadow-md ring-2 ring-amber-300'
                  : 'bg-white/10 text-amber-200 hover:bg-white/20 hover:text-white border border-amber-300/30'
              }\`}
            >
              <span>🎄</span>
              <span>Especial Navideño</span>
            </button>`;

if (!content.includes(oldNavLoNuevo)) {
  console.error('oldNavLoNuevo not found');
  process.exit(1);
}
content = content.replace(oldNavLoNuevo, newNavLoNuevo);

// 3. Modificar título y subtítulo del catálogo
const oldHeaderTitle = `{selectedBrand === 'Bath & Body Works'
                  ? 'Colecciones Bath & Body Works'
                  : selectedCategory === 'Internacional'
                  ? 'Catálogo FoxDrop Internacional (Directo a Domicilio)'
                  : activeTab === 'new' 
                  ? (selectedCategory === 'Todas' ? 'Lo Más Nuevo en FoxDrop' : \`Lo Nuevo en \${selectedCategory}\`)
                  : activeTab === 'deals'
                  ? 'Ofertas & Descuentos Activos'
                  : (selectedCategory === 'Todas' ? 'Catálogo Completo' : \`Departamento: \${selectedCategory}\`)
                }`;

const newHeaderTitle = `{selectedBrand === 'Bath & Body Works'
                  ? (bbwCollection === 'holiday' ? '🎄 Especial Navideño Bath & Body Works' : 'Colecciones Bath & Body Works')
                  : selectedCategory === 'Internacional'
                  ? '✈️ Catálogo FoxDrop Internacional (Directo a Domicilio)'
                  : activeTab === 'deals'
                  ? 'Ofertas & Descuentos Activos 🔥'
                  : '🔥 Favoritos de Temporada & Piezas Únicas en Bodega'
                }`;

if (!content.includes(oldHeaderTitle)) {
  console.error('oldHeaderTitle not found');
  process.exit(1);
}
content = content.replace(oldHeaderTitle, newHeaderTitle);

const oldHeaderSubtitle = `{activeTab === 'new' 
                ? 'Últimos productos dados de alta con disponibilidad inmediata' 
                : \`\${filteredProducts.length} artículos encontrados para entrega\`}
            </p>`;

const newHeaderSubtitle = `{selectedBrand === 'Bath & Body Works'
                ? 'Aromas y piezas de edición especial para entrega hoy o mañana en Puebla y envíos a todo México.'
                : 'Disponibilidad inmediata para entrega hoy o mañana en Puebla y envíos rápidos a todo México. ¡Piezas únicas limitadas!'}
            </p>`;

if (!content.includes(oldHeaderSubtitle)) {
  console.error('oldHeaderSubtitle not found');
  process.exit(1);
}
content = content.replace(oldHeaderSubtitle, newHeaderSubtitle);

// 4. Modificar píldoras en encabezado del catálogo: Reemplazar "Lo Nuevo" por "✨ Favoritos"
const oldPillLoNuevo = `<button
                type="button"
                onClick={() => {
                  setActiveTab('new');
                  setSelectedCategory('Todas');
                }}
                className={\`px-3 py-1.5 rounded-lg transition-all cursor-pointer \${
                  activeTab === 'new' ? 'bg-[#0F3E36] text-white shadow-xs' : 'hover:text-[#0F3E36]'
                }\`}
              >
                Lo Nuevo
              </button>`;

const newPillLoNuevo = `<button
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

if (!content.includes(oldPillLoNuevo)) {
  console.error('oldPillLoNuevo not found');
  process.exit(1);
}
content = content.replace(oldPillLoNuevo, newPillLoNuevo);

// 5. Quitar botón duplicado de "Todo" dentro del switch si ya pusimos "Todo el Catálogo"
const oldPillTodo = `<button
                type="button"
                onClick={() => {
                  setActiveTab('all');
                  setSelectedCategory('Todas');
                }}
                className={\`px-3 py-1.5 rounded-lg transition-all cursor-pointer \${
                  activeTab === 'all' && selectedCategory === 'Todas' ? 'bg-white text-[#0F3E36] shadow-xs' : 'hover:text-[#0F3E36]'
                }\`}
              >
                Todo
              </button>`;

const newPillTodo = ``;

if (!content.includes(oldPillTodo)) {
  console.error('oldPillTodo not found');
  process.exit(1);
}
content = content.replace(oldPillTodo, newPillTodo);

// 6. Reforzar el badge de Última Pieza en tarjetas de producto
const oldUltimoBadge = `                      {!hasDiscount && product.stock === 1 ? (
                        <span className="bg-amber-500 text-white font-extrabold text-[9px] px-2 py-0.5 rounded-full shadow-xs">
                          Último
                        </span>
                      ) : null}`;

const newUltimoBadge = `                      {product.stock === 1 ? (
                        <span className="bg-gradient-to-r from-amber-500 to-orange-500 text-white font-black text-[9px] px-2 py-0.5 rounded-full shadow-xs flex items-center gap-0.5 animate-pulse">
                          🔥 ¡Última pieza!
                        </span>
                      ) : null}`;

if (!content.includes(oldUltimoBadge)) {
  console.error('oldUltimoBadge not found');
  process.exit(1);
}
content = content.replace(oldUltimoBadge, newUltimoBadge);

fs.writeFileSync(filePath, content, 'utf8');
console.log('Commercial Conversion Enhancements Applied Successfully!');
