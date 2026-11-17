const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../src/app/admin/page.tsx');
let file = fs.readFileSync(filePath, 'utf8');

const normalize = s => s.replace(/\r\n/g, '\n');
file = normalize(file);

// 1. Agregar estado para el modal propio de SKU Duplicado / Información
const stateAnchor = `  // Modal de Confirmación Segura de Eliminación (Sin window.confirm)`;
const newState = `  // Modal de Aviso o Acción Elegante (Sin window.alert ni window.confirm del navegador)
  const [adminDialogModal, setAdminDialogModal] = useState<{
    isOpen: boolean;
    title: string;
    description: string;
    icon?: 'warning' | 'info' | 'success';
    confirmText?: string;
    cancelText?: string;
    onConfirm?: () => void;
    onCancel?: () => void;
  }>({
    isOpen: false,
    title: '',
    description: '',
  });

  // Modal de Confirmación Segura de Eliminación (Sin window.confirm)`;

if (!file.includes(normalize(stateAnchor))) {
  console.error('stateAnchor not found');
  process.exit(1);
}
file = file.replace(normalize(stateAnchor), normalize(newState));

// 2. Reemplazar el window.confirm en el escaneo
const oldScanCode = normalize(`      if (matched) {
        if (!editingProductId) {
          // Si estamos creando un producto NUEVO y escaneamos uno que YA existe:
          const wantEdit = window.confirm(
            \`⚠️ El código de barras escaneado (\${code}) ya pertenece al producto:\\n\\n"\${matched.title}"\\n(Stock actual: \${matched.stock} piezas)\\n\\n¿Deseas ABRIR este producto existente para sumarle más piezas de stock o actualizar su precio?\\n\\n• [Aceptar]: Abrir y sumar stock al producto existente\\n• [Cancelar]: Mantener código para asignarle un sufijo o crear variante\`
          );
          if (wantEdit) {
            handleOpenEditProduct(matched);
            return;
          }
        }
        if (!newTitle) {
          setNewTitle(matched.title);
        }
      }`);

const newScanCode = normalize(`      if (matched) {
        if (!editingProductId) {
          // Si estamos creando un producto NUEVO y escaneamos uno que YA existe:
          setAdminDialogModal({
            isOpen: true,
            title: 'Código de barras ya registrado',
            description: \`El código "\${code}" ya pertenece al producto "\${matched.title}" (Stock actual: \${matched.stock} pzas). ¿Deseas abrirlo para sumarle stock o actualizarlo?\`,
            icon: 'warning',
            confirmText: 'Abrir y Sumar Stock',
            cancelText: 'Continuar como Nuevo',
            onConfirm: () => {
              setAdminDialogModal(prev => ({ ...prev, isOpen: false }));
              handleOpenEditProduct(matched);
            },
            onCancel: () => {
              setAdminDialogModal(prev => ({ ...prev, isOpen: false }));
            }
          });
          return;
        }
        if (!newTitle) {
          setNewTitle(matched.title);
        }
      }`);

if (!file.includes(oldScanCode)) {
  console.error('oldScanCode not found');
  process.exit(1);
}
file = file.replace(oldScanCode, newScanCode);

// 3. Reemplazar el window.confirm y window.alert en handleSaveProduct
const oldSaveCode = normalize(`    // VALIDACIÓN PREVENTIVA DE SKU DUPLICADO:
    const trimmedSku = newSku.trim();
    if (trimmedSku && !editingProductId) {
      const duplicateProduct = products.find(p => p.sku && p.sku.trim().toLowerCase() === trimmedSku.toLowerCase());
      if (duplicateProduct) {
        const wantOpen = window.confirm(
          \`⚠️ ¡Código de barras duplicado!\\n\\nEl SKU "\${trimmedSku}" ya está registrado en tu tienda con el producto:\\n"\${duplicateProduct.title}" (Stock actual: \${duplicateProduct.stock} pzas).\\n\\n¿Deseas abrir ese producto para agregarle más stock en lugar de crear un duplicado?\\n\\n• [Aceptar]: Abrir para sumarle stock\\n• [Cancelar]: Modificar el SKU para que sea diferente\`
        );
        if (wantOpen) {
          handleOpenEditProduct(duplicateProduct);
        }
        return;
      }
    }`);

const newSaveCode = normalize(`    // VALIDACIÓN PREVENTIVA DE SKU DUPLICADO:
    const trimmedSku = newSku.trim();
    if (trimmedSku && !editingProductId) {
      const duplicateProduct = products.find(p => p.sku && p.sku.trim().toLowerCase() === trimmedSku.toLowerCase());
      if (duplicateProduct) {
        setAdminDialogModal({
          isOpen: true,
          title: 'Código de barras / SKU ya en uso',
          description: \`El SKU "\${trimmedSku}" ya está registrado con el producto "\${duplicateProduct.title}" (Stock actual: \${duplicateProduct.stock} pzas). ¿Deseas abrirlo para sumarle piezas de stock en lugar de duplicarlo?\`,
          icon: 'warning',
          confirmText: 'Abrir y Sumar Stock',
          cancelText: 'Cambiar SKU',
          onConfirm: () => {
            setAdminDialogModal(prev => ({ ...prev, isOpen: false }));
            handleOpenEditProduct(duplicateProduct);
          },
          onCancel: () => {
            setAdminDialogModal(prev => ({ ...prev, isOpen: false }));
          }
        });
        return;
      }
    }`);

if (!file.includes(oldSaveCode)) {
  console.error('oldSaveCode not found');
  process.exit(1);
}
file = file.replace(oldSaveCode, newSaveCode);

// 4. Reemplazar en el catch el alert por el modal visual
const oldCatchCode = normalize(`      if (err.message && (err.message.includes('products_sku_key') || err.message.includes('duplicate key value'))) {
        alert(
          \`⚠️ No se pudo guardar porque el código de barras (SKU) ya está en uso por otro producto.\\n\\nPor favor escribe un SKU diferente (o presiona el botón "Generar" junto al campo SKU) para guardar este producto.\`
        );
      } else {
        alert(\`Error al guardar en la base de datos: \${err.message || 'Intenta de nuevo'}\`);
      }`);

const newCatchCode = normalize(`      if (err.message && (err.message.includes('products_sku_key') || err.message.includes('duplicate key value'))) {
        setAdminDialogModal({
          isOpen: true,
          title: 'Código de barras ya registrado',
          description: 'No se pudo guardar porque el SKU ya está en uso por otro producto en la tienda. Puedes asignarle un código diferente o presionar el botón "Generar" junto al campo SKU.',
          icon: 'warning',
          confirmText: 'Entendido',
          onConfirm: () => setAdminDialogModal(prev => ({ ...prev, isOpen: false })),
        });
      } else {
        setAdminDialogModal({
          isOpen: true,
          title: 'Aviso del Sistema',
          description: err.message || 'No se pudo guardar el producto en la base de datos. Por favor intenta de nuevo.',
          icon: 'warning',
          confirmText: 'Aceptar',
          onConfirm: () => setAdminDialogModal(prev => ({ ...prev, isOpen: false })),
        });
      }`);

if (!file.includes(oldCatchCode)) {
  console.error('oldCatchCode not found');
  process.exit(1);
}
file = file.replace(oldCatchCode, newCatchCode);

// 5. Renderizar el componente visual del modal antes del cierre
const modalRenderAnchor = normalize(`      {/* ======================================================== */}
      {/* 4. MODAL DIÁLOGO DE CONFIRMACIÓN SEGURA (ESTILO SHOPIFY)  */}`);

const newModalRender = normalize(`      {/* ======================================================== */}
      {/* MODAL ELEGANTE PROPIO DE FOXDROP (REEMPLAZO DE ALERT / CONFIRM) */}
      {/* ======================================================== */}
      {adminDialogModal.isOpen && (
        <div 
          onClick={() => setAdminDialogModal(prev => ({ ...prev, isOpen: false }))}
          className="fixed inset-0 bg-slate-950/75 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-in fade-in duration-150"
        >
          <div 
            onClick={e => e.stopPropagation()}
            className="bg-white dark:bg-slate-900 rounded-3xl max-w-sm w-full p-6 space-y-4 shadow-2xl border border-slate-200 dark:border-slate-800 animate-in zoom-in-95 duration-150 text-center"
          >
            <div className={\`w-12 h-12 rounded-2xl flex items-center justify-center mx-auto \${
              adminDialogModal.icon === 'warning' 
                ? 'bg-amber-50 dark:bg-amber-950/50 text-amber-600 border border-amber-200/80'
                : adminDialogModal.icon === 'success'
                ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 border border-emerald-200/80'
                : 'bg-blue-50 dark:bg-blue-950/50 text-blue-600 border border-blue-200/80'
            }\`}>
              <AlertCircle className="w-6 h-6" />
            </div>

            <div className="space-y-1.5">
              <h3 className="font-extrabold text-base text-slate-900 dark:text-white tracking-tight">
                {adminDialogModal.title}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                {adminDialogModal.description}
              </p>
            </div>

            <div className={\`pt-2 \${adminDialogModal.cancelText ? 'grid grid-cols-2 gap-2.5' : 'flex'}\`}>
              {adminDialogModal.cancelText && (
                <button
                  type="button"
                  onClick={() => {
                    if (adminDialogModal.onCancel) adminDialogModal.onCancel();
                    else setAdminDialogModal(prev => ({ ...prev, isOpen: false }));
                  }}
                  className="w-full py-2.5 px-4 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold rounded-xl text-xs transition cursor-pointer"
                >
                  {adminDialogModal.cancelText}
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  if (adminDialogModal.onConfirm) adminDialogModal.onConfirm();
                  else setAdminDialogModal(prev => ({ ...prev, isOpen: false }));
                }}
                className="w-full py-2.5 px-4 bg-[#E65F2B] hover:bg-[#d44e1d] text-white font-bold rounded-xl text-xs transition shadow-xs cursor-pointer"
              >
                {adminDialogModal.confirmText || 'Aceptar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 4. MODAL DIÁLOGO DE CONFIRMACIÓN SEGURA (ESTILO SHOPIFY)  */}`);

if (!file.includes(modalRenderAnchor)) {
  console.error('modalRenderAnchor not found');
  process.exit(1);
}
file = file.replace(modalRenderAnchor, newModalRender);

fs.writeFileSync(filePath, file, 'utf8');
console.log('Successfully integrated native FoxDrop modal dialogs!');
