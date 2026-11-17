const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../src/components/AdminJapanTab.tsx');
let file = fs.readFileSync(filePath, 'utf8');

const normalize = s => s.replace(/\r\n/g, '\n');
file = normalize(file);

// 1. In Wishlist card, add ZenMarket link button right above approval buttons
const target1 = normalize(`{/* BOTONES DE APROBACIÓN (DISPONIBLES PARA AMBOS O PRINCIPALMENTE MARIO) */}
                        <div className="grid grid-cols-2 gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleUpdateWishlistStatus(item.itemCode, 'approved')}
                            className={\`py-1.5 px-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1 cursor-pointer border \${
                              item.status === 'approved'
                                ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                                : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-200'
                            }\`}
                          >
                            <ThumbsUp className="w-3.5 h-3.5" />
                            <span>Aprobar</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleUpdateWishlistStatus(item.itemCode, 'rejected')}
                            className={\`py-1.5 px-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1 cursor-pointer border \${
                              item.status === 'rejected'
                                ? 'bg-rose-600 text-white border-rose-600 shadow-xs'
                                : 'bg-rose-50 hover:bg-rose-100 text-rose-700 border-rose-200'
                            }\`}
                          >
                            <ThumbsDown className="w-3.5 h-3.5" />
                            <span>Descartar</span>
                          </button>
                        </div>`);

const rep1 = normalize(`{/* ENLACES DIRECTOS COMPRA / ZENMARKET */}
                        <div className="grid grid-cols-2 gap-1.5">
                          <a
                            href={\`https://zenmarket.jp/es/other.aspx?itemUrl=\${encodeURIComponent(item.itemUrl)}\`}
                            target="_blank"
                            rel="noreferrer"
                            className="py-1.5 px-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1 cursor-pointer bg-blue-600 hover:bg-blue-700 text-white shadow-xs"
                            title="Cotizar o comprar directamente en ZenMarket"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                            <span>🛒 ZenMarket</span>
                          </a>

                          <a
                            href={item.itemUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="py-1.5 px-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1 cursor-pointer border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 hover:text-red-600"
                            title="Ver publicación original en Rakuten"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                            <span>Rakuten</span>
                          </a>
                        </div>

                        {/* BOTONES DE APROBACIÓN (DISPONIBLES PARA AMBOS O PRINCIPALMENTE MARIO) */}
                        <div className="grid grid-cols-2 gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleUpdateWishlistStatus(item.itemCode, 'approved')}
                            className={\`py-1.5 px-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1 cursor-pointer border \${
                              item.status === 'approved'
                                ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                                : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-200'
                            }\`}
                          >
                            <ThumbsUp className="w-3.5 h-3.5" />
                            <span>Aprobar</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleUpdateWishlistStatus(item.itemCode, 'rejected')}
                            className={\`py-1.5 px-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1 cursor-pointer border \${
                              item.status === 'rejected'
                                ? 'bg-rose-600 text-white border-rose-600 shadow-xs'
                                : 'bg-rose-50 hover:bg-rose-100 text-rose-700 border-rose-200'
                            }\`}
                          >
                            <ThumbsDown className="w-3.5 h-3.5" />
                            <span>Descartar</span>
                          </button>
                        </div>`);

// 2. On Catalog Card
const target2 = normalize(`{/* BOTÓN DE CORAZÓN / WISHLIST RÁPIDO */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleToggleWishlist(item);
                      }}
                      className={\`absolute top-1.5 right-1.5 p-1.5 rounded-full backdrop-blur-md transition z-20 cursor-pointer shadow-xs \${
                        isItemInWishlist(item.itemCode)
                          ? 'bg-rose-600 text-white hover:bg-rose-700'
                          : 'bg-black/50 text-white hover:bg-rose-500 hover:text-white'
                      }\`}
                      title={isItemInWishlist(item.itemCode) ? 'Quitar de mi Wishlist' : 'Guardar en mi Wishlist'}
                    >
                      <Heart className={\`w-3.5 h-3.5 \${isItemInWishlist(item.itemCode) ? 'fill-current' : ''}\`} />
                    </button>`);

const rep2 = normalize(`{/* BOTONES ACCION RAPIDA (ZENMARKET Y WISHLIST) */}
                    <div className="absolute top-1.5 right-1.5 z-20 flex items-center gap-1">
                      <a
                        href={\`https://zenmarket.jp/es/other.aspx?itemUrl=\${encodeURIComponent(item.itemUrl)}\`}
                        target="_blank"
                        rel="noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="p-1.5 rounded-full bg-blue-600 hover:bg-blue-700 text-white backdrop-blur-md transition cursor-pointer shadow-xs"
                        title="Abrir directamente en ZenMarket"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggleWishlist(item);
                        }}
                        className={\`p-1.5 rounded-full backdrop-blur-md transition cursor-pointer shadow-xs \${
                          isItemInWishlist(item.itemCode)
                            ? 'bg-rose-600 text-white hover:bg-rose-700'
                            : 'bg-black/50 text-white hover:bg-rose-500 hover:text-white'
                        }\`}
                        title={isItemInWishlist(item.itemCode) ? 'Quitar de mi Wishlist' : 'Guardar en mi Wishlist'}
                      >
                        <Heart className={\`w-3.5 h-3.5 \${isItemInWishlist(item.itemCode) ? 'fill-current' : ''}\`} />
                      </button>
                    </div>`);

if (!file.includes(target1)) {
  console.error('Target 1 in Wishlist not found');
  process.exit(1);
}
if (!file.includes(target2)) {
  console.error('Target 2 in Catalog cards not found');
  process.exit(1);
}

file = file.replace(target1, rep1);
file = file.replace(target2, rep2);

fs.writeFileSync(filePath, file, 'utf8');
console.log('Successfully added ZenMarket buttons to Wishlist cards and Catalog grid cards!');
