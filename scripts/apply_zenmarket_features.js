const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../src/components/AdminJapanTab.tsx');
let file = fs.readFileSync(filePath, 'utf8');

const normalize = s => s.replace(/\r\n/g, '\n');
file = normalize(file);

// 1. Preview button
const target1 = normalize(`<a
                  href={previewItem.itemUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition cursor-pointer border bg-white text-slate-700 border-slate-200 hover:text-red-600 hover:border-red-300"
                  title="Abrir publicación original en Rakuten Tokio"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Ver en Rakuten</span>
                </a>`);

const rep1 = normalize(`<a
                  href={\`https://zenmarket.jp/es/other.aspx?itemUrl=\${encodeURIComponent(previewItem.itemUrl)}\`}
                  target="_blank"
                  rel="noreferrer"
                  className="px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition cursor-pointer bg-blue-600 hover:bg-blue-700 text-white shadow-xs"
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
                </a>`);

// 2. Import footer
const target2 = normalize(`<a
                href={selectedItem.itemUrl}
                target="_blank"
                rel="noreferrer"
                className="text-xs text-red-500 hover:underline flex items-center gap-1 font-bold"
              >
                <span>Ver en Rakuten Japón</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>`);

const rep2 = normalize(`<div className="flex items-center gap-3">
                <a
                  href={\`https://zenmarket.jp/es/other.aspx?itemUrl=\${encodeURIComponent(selectedItem.itemUrl)}\`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs bg-blue-600 hover:bg-blue-700 text-white px-2.5 py-1 rounded-lg font-bold flex items-center gap-1 shadow-xs"
                >
                  <span>🛒 ZenMarket</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
                <a
                  href={selectedItem.itemUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs text-slate-500 hover:text-red-600 hover:underline flex items-center gap-1 font-bold"
                >
                  <span>Rakuten</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>`);

// 3. Weight quick helpers
const target3 = normalize(`<div>
                      <label className="block text-[10px] font-bold text-slate-400 mb-0.5">Flete Int. Estimado</label>
                      <input
                        type="number"
                        value={customShipping}
                        onChange={(e) => setCustomShipping(Number(e.target.value))}
                        className="w-full px-2 py-1 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 font-mono font-bold text-xs"
                      />
                    </div>`);

const rep3 = normalize(`<div>
                      <div className="flex items-center justify-between mb-0.5">
                        <label className="text-[10px] font-bold text-slate-400">Flete Int. Estimado</label>
                        <a 
                          href="https://zenmarket.jp/es/calc.aspx" 
                          target="_blank" 
                          rel="noreferrer" 
                          className="text-[9px] text-blue-500 hover:underline font-bold"
                          title="Calculadora oficial ZenMarket"
                        >
                          Calc. ZenMarket ↗
                        </a>
                      </div>
                      <input
                        type="number"
                        value={customShipping}
                        onChange={(e) => setCustomShipping(Number(e.target.value))}
                        className="w-full px-2 py-1 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 font-mono font-bold text-xs mb-1"
                      />
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => {
                            setCustomShipping(140);
                            setCustomPrice(Math.round(((selectedItem.baseCostMxn + 140) * 1.35) / 10) * 10);
                          }}
                          className="px-1.5 py-0.5 text-[9px] bg-slate-200 dark:bg-slate-700 hover:bg-blue-100 dark:hover:bg-blue-900 rounded font-semibold text-slate-700 dark:text-slate-300 cursor-pointer"
                          title="Artículos ligeros: llaveros, cartas, gashapon (~200g)"
                        >
                          200g ($140)
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setCustomShipping(260);
                            setCustomPrice(Math.round(((selectedItem.baseCostMxn + 260) * 1.35) / 10) * 10);
                          }}
                          className="px-1.5 py-0.5 text-[9px] bg-slate-200 dark:bg-slate-700 hover:bg-blue-100 dark:hover:bg-blue-900 rounded font-semibold text-slate-700 dark:text-slate-300 cursor-pointer"
                          title="Artículos medianos: figuras estándar, peluches (~800g)"
                        >
                          800g ($260)
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setCustomShipping(480);
                            setCustomPrice(Math.round(((selectedItem.baseCostMxn + 480) * 1.35) / 10) * 10);
                          }}
                          className="px-1.5 py-0.5 text-[9px] bg-slate-200 dark:bg-slate-700 hover:bg-blue-100 dark:hover:bg-blue-900 rounded font-semibold text-slate-700 dark:text-slate-300 cursor-pointer"
                          title="Artículos pesados/voluminosos (+1.5kg)"
                        >
                          +1.5kg ($480)
                        </button>
                      </div>
                    </div>`);

if (!file.includes(target1)) {
  console.error('Target 1 not found');
  process.exit(1);
}
if (!file.includes(target2)) {
  console.error('Target 2 not found');
  process.exit(1);
}
if (!file.includes(target3)) {
  console.error('Target 3 not found');
  process.exit(1);
}

file = file.replace(target1, rep1);
file = file.replace(target2, rep2);
file = file.replace(target3, rep3);

fs.writeFileSync(filePath, file, 'utf8');
console.log('Successfully updated AdminJapanTab.tsx with ZenMarket links and shipping helpers!');
