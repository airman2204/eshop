const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../src/components/AdminJapanTab.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// 1. Botón ZenMarket en el modal de Preview (donde revisan Vero y tú)
const oldPreviewBtn = `<a
                  href={previewItem.itemUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition cursor-pointer border bg-white text-slate-700 border-slate-200 hover:text-red-600 hover:border-red-300"
                  title="Abrir publicación original en Rakuten Tokio"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Ver en Rakuten</span>
                </a>`;

const newPreviewBtn = `<a
                  href={\`https://zenmarket.jp/es/other.aspx?itemUrl=\${encodeURIComponent(previewItem.itemUrl)}\`}
                  target="_blank"
                  rel="noreferrer"
                  className="px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition cursor-pointer border bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-xs hover:from-blue-700 hover:to-indigo-700"
                  title="Abrir directamente en ZenMarket para cotizar y comprar"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>🛒 Ver en ZenMarket</span>
                </a>
                <a
                  href={previewItem.itemUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition cursor-pointer border bg-white text-slate-700 border-slate-200 hover:text-red-600 hover:border-red-300"
                  title="Abrir publicación original en Rakuten Tokio"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Rakuten</span>
                </a>`;

if (!content.includes(oldPreviewBtn)) {
  console.error('oldPreviewBtn not found');
  process.exit(1);
}
content = content.replace(oldPreviewBtn, newPreviewBtn);

// 2. Botón ZenMarket en el modal de Importación (Footer)
const oldModalBtn = `<a
                href={selectedItem.itemUrl}
                target="_blank"
                rel="noreferrer"
                className="text-xs text-red-500 hover:underline flex items-center gap-1 font-bold"
              >
                <span>Ver en Rakuten Japón</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>`;

const newModalBtn = `<div className="flex items-center gap-3">
                <a
                  href={\`https://zenmarket.jp/es/other.aspx?itemUrl=\${encodeURIComponent(selectedItem.itemUrl)}\`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs text-blue-600 hover:underline flex items-center gap-1 font-black"
                  title="Ver en ZenMarket con cotizador de envío a México"
                >
                  <span>🛒 Cotizar en ZenMarket</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
                <span className="text-slate-300 dark:text-slate-700">|</span>
                <a
                  href={selectedItem.itemUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs text-slate-500 hover:text-red-500 hover:underline flex items-center gap-1 font-bold"
                >
                  <span>Ver en Rakuten</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>`;

if (!content.includes(oldModalBtn)) {
  console.error('oldModalBtn not found');
  process.exit(1);
}
content = content.replace(oldModalBtn, newModalBtn);

// 3. Botones rápidos de estimación de peso en el modal de importación
const oldShippingInput = `<div>
                      <label className="block text-[10px] font-bold text-slate-400 mb-0.5">Flete Int. Estimado</label>
                      <input
                        type="number"
                        value={customShipping}
                        onChange={(e) => setCustomShipping(Number(e.target.value))}
                        className="w-full px-2 py-1 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 font-mono font-bold text-xs"
                      />
                    </div>`;

const newShippingInput = `<div>
                      <div className="flex items-center justify-between mb-0.5">
                        <label className="block text-[10px] font-bold text-slate-400">Flete Int. ($ MXN)</label>
                        <a
                          href="https://zenmarket.jp/es/calc.aspx"
                          target="_blank"
                          rel="noreferrer"
                          className="text-[9px] text-blue-600 hover:underline font-bold flex items-center gap-0.5"
                        >
                          🧮 Calculadora
                        </a>
                      </div>
                      <input
                        type="number"
                        value={customShipping}
                        onChange={(e) => setCustomShipping(Number(e.target.value))}
                        className="w-full px-2 py-1 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 font-mono font-bold text-xs"
                      />
                      <div className="flex gap-1 mt-1">
                        <button
                          type="button"
                          onClick={() => setCustomShipping(140)}
                          className={\`px-1.5 py-0.5 text-[9px] rounded font-bold \${customShipping === 140 ? 'bg-blue-600 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'}\`}
                          title="Sobre / Llavero / Tarjetas (~200g)"
                        >
                          200g ($140)
                        </button>
                        <button
                          type="button"
                          onClick={() => setCustomShipping(260)}
                          className={\`px-1.5 py-0.5 text-[9px] rounded font-bold \${customShipping === 260 ? 'bg-blue-600 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'}\`}
                          title="Caja mediana / Figura / Dulces (~800g)"
                        >
                          800g ($260)
                        </button>
                        <button
                          type="button"
                          onClick={() => setCustomShipping(480)}
                          className={\`px-1.5 py-0.5 text-[9px] rounded font-bold \${customShipping === 480 ? 'bg-blue-600 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'}\`}
                          title="Caja grande / Pesado (>1.5kg)"
                        >
                          +1.5kg ($480)
                        </button>
                      </div>
                    </div>`;

if (!content.includes(oldShippingInput)) {
  console.error('oldShippingInput not found');
  process.exit(1);
}
content = content.replace(oldShippingInput, newShippingInput);

fs.writeFileSync(filePath, content, 'utf8');
console.log('ZenMarket direct links and weight calculator buttons integrated successfully!');
