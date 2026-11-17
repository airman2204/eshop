const fs = require('fs');

let content = fs.readFileSync('src/app/admin/page.tsx', 'utf8');

// 1. Apilar los botones en la columna de Acciones verticalmente (flex flex-col) para compactar el ancho
// O mejor: Integrar el botón de 'En Tienda' (Apagado / Encendido) y 'Ya Vendido' en una columna de estado y acciones muy limpia

const targetRow = `                          {/* TOGGLE VISIBILIDAD EN TIENDA */}
                          <td className="py-3.5 px-3 text-center w-[140px] min-w-[140px]">
                            <button
                              onClick={() => handleToggleProductActive(p)}
                              disabled={togglingActiveId === p.id}
                              title={p.isActive !== false ? "Artículo encendido en tienda (clic para apagar)" : "Artículo apagado en tienda (clic para encender)"}
                              className={\`w-[96px] py-1 px-2 rounded-lg text-[11px] font-bold transition inline-flex items-center justify-center gap-1 whitespace-nowrap shrink-0 shadow-2xs \${
                                p.isActive !== false
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-300 hover:bg-emerald-100 active:scale-95'
                                  : 'bg-rose-50 text-rose-700 border border-rose-300 hover:bg-rose-100 active:scale-95'
                              }\`}
                            >
                              <Power className={\`w-3.5 h-3.5 \${p.isActive !== false ? 'text-emerald-600' : 'text-rose-600'}\`} />
                              <span>{p.isActive !== false ? 'Encendido' : 'Apagado'}</span>
                            </button>
                          </td>

                          {/* ACCIONES */}
                          <td className="py-3.5 px-4 text-right sticky right-0 bg-white group-hover:bg-slate-50 border-l border-slate-200/80 z-10">
                            <div className="flex items-center justify-end gap-1">
                              {inventoryScope === 'physical' && (
                                <>
                                  <button
                                    onClick={() => handleOpenSoldModal(p)}
                                    title="Marcar piezas como ya vendidas en mostrador o fuera de la web"
                                    className="px-2 py-1 text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition font-bold text-[10px] flex items-center gap-1 shadow-2xs"
                                  >
                                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                    <span className="hidden lg:inline">Ya Vendido</span>
                                  </button>
                                  <button
                                    onClick={() => handleOpenBarcodePrintModal([p])}
                                    title="Imprimir etiqueta con código de barras y precio"
                                    className="p-1.5 text-slate-500 hover:text-cyan-600 hover:bg-cyan-50 rounded-lg transition"
                                  >
                                    <Printer className="w-4 h-4" />
                                  </button>
                                </>
                              )}
                              <button
                                onClick={() => handleOpenKardex(p)}
                                title="Ver Kardex / Historial de movimientos"
                                className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition"
                              >
                                <History className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDuplicateProduct(p)}
                                title="Duplicar como nuevo artículo"
                                className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                              >
                                <Copy className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleOpenEditProduct(p)}
                                title="Editar características, precio o imágenes"
                                className="p-1.5 text-slate-500 hover:text-[#E65F2B] hover:bg-orange-50 rounded-lg transition"
                              >
                                <Pencil className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDeleteProduct(p.id)}
                                title="Eliminar artículo del catálogo"
                                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>`;

// Fusión en una columna de "Acciones y Estado" donde los botones están apilados verticalmente (uno arriba del otro) para que NUNCA se corten
const replacementRow = `                          {/* ACCIONES Y ESTADO EN TIENDA */}
                          <td className="py-3 px-3 text-right sticky right-0 bg-white group-hover:bg-slate-50 border-l border-slate-200/90 shadow-md z-10 min-w-[190px]">
                            <div className="flex items-center justify-end gap-2">
                              {/* Botones de acción principales uno arriba del otro */}
                              <div className="flex flex-col items-end gap-1">
                                <button
                                  onClick={() => handleToggleProductActive(p)}
                                  disabled={togglingActiveId === p.id}
                                  title={p.isActive !== false ? "Artículo encendido en tienda (clic para apagar)" : "Artículo apagado en tienda (clic para encender)"}
                                  className={\`w-[92px] py-1 px-2 rounded-lg text-[10px] font-bold transition inline-flex items-center justify-center gap-1 whitespace-nowrap shadow-2xs \${
                                    p.isActive !== false
                                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-300 hover:bg-emerald-100 active:scale-95'
                                      : 'bg-rose-50 text-rose-700 border border-rose-300 hover:bg-rose-100 active:scale-95'
                                  }\`}
                                >
                                  <Power className={\`w-3 h-3 \${p.isActive !== false ? 'text-emerald-600' : 'text-rose-600'}\`} />
                                  <span>{p.isActive !== false ? 'Encendido' : 'Apagado'}</span>
                                </button>

                                {inventoryScope === 'physical' && (
                                  <button
                                    onClick={() => handleOpenSoldModal(p)}
                                    title="Marcar piezas como ya vendidas en mostrador o fuera de la web"
                                    className="w-[92px] py-1 px-2 text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition font-bold text-[10px] inline-flex items-center justify-center gap-1 shadow-2xs"
                                  >
                                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                    <span>Ya Vendido</span>
                                  </button>
                                )}
                              </div>

                              {/* Iconos de gestión (imprimir, historial, editar, borrar) en cuadrícula compacta */}
                              <div className="grid grid-cols-2 gap-0.5 border-l border-slate-100 pl-1.5">
                                <button
                                  onClick={() => handleOpenBarcodePrintModal([p])}
                                  title="Imprimir etiqueta con código de barras y precio"
                                  className="p-1.5 text-slate-500 hover:text-cyan-600 hover:bg-cyan-50 rounded-lg transition"
                                >
                                  <Printer className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => handleOpenKardex(p)}
                                  title="Ver Kardex / Historial de movimientos"
                                  className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition"
                                >
                                  <History className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => handleOpenEditProduct(p)}
                                  title="Editar características, precio o imágenes"
                                  className="p-1.5 text-slate-500 hover:text-[#E65F2B] hover:bg-orange-50 rounded-lg transition"
                                >
                                  <Pencil className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => handleDeleteProduct(p.id)}
                                  title="Eliminar artículo del catálogo"
                                  className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          </td>`;

// Y en el encabezado thead, quitar "En Tienda" para que sea una sola columna "Estado / Acciones" limpia
const oldThead = `                      <th className="py-3 px-4 text-center w-[140px] min-w-[140px]">En Tienda</th>
                      <th className="py-3 px-4 text-right sticky right-0 bg-slate-50 border-l border-slate-200/80 min-w-[190px] z-10">Acciones</th>`;

const newThead = `                      <th className="py-3 px-4 text-right sticky right-0 bg-slate-50 border-l border-slate-200/80 min-w-[190px] z-10">Estado / Acciones</th>`;

const normContent = content.replace(/\r\n/g, '\n');
const normTargetRow = targetRow.replace(/\r\n/g, '\n');
const normReplacementRow = replacementRow.replace(/\r\n/g, '\n');
const normOldThead = oldThead.replace(/\r\n/g, '\n');
const normNewThead = newThead.replace(/\r\n/g, '\n');

if (normContent.includes(normTargetRow) && normContent.includes(normOldThead)) {
  let updated = normContent.replace(normTargetRow, normReplacementRow);
  updated = updated.replace(normOldThead, normNewThead);
  fs.writeFileSync('src/app/admin/page.tsx', updated, 'utf8');
  console.log('SUCCESS: Columnas unificadas con botones apilados verticalmente (uno arriba del otro).');
} else {
  console.error('Target blocks not found in page.tsx');
}
