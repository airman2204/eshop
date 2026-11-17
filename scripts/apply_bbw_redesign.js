const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../src/app/tienda/page.tsx');
let content = fs.readFileSync(filePath, 'utf8');

const startTag = '{/* BARRA DE SUB-COLECCIONES BATH & BODY WORKS */}';
const endTag = '{loadingProducts ? (';

const sIdx = content.indexOf(startTag);
const eIdx = content.indexOf(endTag);

if (sIdx === -1 || eIdx === -1) {
  console.error('Tags not found');
  process.exit(1);
}

const redesignedSnippet = `{/* BARRA DE SUB-COLECCIONES BATH & BODY WORKS — REDISEÑO ELEGANTE Y LIMPIO */}
        {selectedBrand === 'Bath & Body Works' && (
          <div className="bg-white border border-gray-200/90 rounded-2xl p-4 sm:p-5 shadow-xs space-y-3.5 animate-in fade-in slide-in-from-top duration-300">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-pink-50 text-pink-600 flex items-center justify-center font-bold text-base shadow-2xs border border-pink-100">
                  🌸
                </div>
                <div>
                  <h4 className="text-sm sm:text-base font-black text-[#0F3E36] tracking-tight">
                    Colecciones Bath & Body Works
                  </h4>
                  <p className="text-xs text-gray-500 font-medium">
                    Explora por temporada o tipo de fragancia
                  </p>
                </div>
              </div>
              {bbwCollection !== 'all' && (
                <button
                  type="button"
                  onClick={() => setBbwCollection('all')}
                  className="text-xs font-bold text-[#E65F2B] hover:text-[#c44a1b] flex items-center gap-1 cursor-pointer w-fit"
                >
                  <X className="w-3.5 h-3.5" />
                  <span>Mostrar todo ({visibleProducts.filter(p => (p.brand || '').toLowerCase().includes('bath & body') || (p.title || '').toLowerCase().includes('bath & body')).length})</span>
                </button>
              )}
            </div>

            {/* Píldoras de colecciones estilo TJ Maxx / Sephora */}
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1 overscroll-x-contain touch-pan-x">
              {[
                { id: 'all', label: 'Todo el Catálogo', icon: '✨' },
                { id: 'holiday', label: 'Especial Navideño', icon: '🎄', special: true },
                { id: 'car', label: 'Auto & Difusores', icon: '🚗' },
                { id: 'candles_home', label: 'Velas & Wallflower', icon: '🕯️' },
                { id: 'bodycare', label: 'Cuidado Corporal & Jabones', icon: '🧴' },
                { id: 'pocketbac', label: 'Geles PocketBac', icon: '🧼' },
                { id: 'fall', label: 'Cosecha de Otoño', icon: '🍂' },
              ].map(col => {
                const isActive = bbwCollection === col.id;
                return (
                  <button
                    key={col.id}
                    type="button"
                    onClick={() => setBbwCollection(col.id as any)}
                    className={\`shrink-0 px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer \${
                      isActive
                        ? 'bg-[#0F3E36] text-white shadow-sm ring-2 ring-[#0F3E36]/20'
                        : col.special
                        ? 'bg-gradient-to-r from-red-50 to-emerald-50 text-emerald-950 border border-emerald-200/80 hover:border-emerald-300'
                        : 'bg-gray-50/80 hover:bg-gray-100 text-gray-700 border border-gray-200/80 hover:border-gray-300'
                    }\`}
                  >
                    <span className="text-sm">{col.icon}</span>
                    <span>{col.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        `;

content = content.substring(0, sIdx) + redesignedSnippet + content.substring(eIdx);
fs.writeFileSync(filePath, content, 'utf8');
console.log('Successfully updated BBW sub-collections design in tienda/page.tsx');
