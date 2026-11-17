const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../src/app/admin/page.tsx');
let file = fs.readFileSync(filePath, 'utf8');

const normalize = s => s.replace(/\r\n/g, '\n');
file = normalize(file);

// 1. Mejorar el escáner al escanear en sku_input: si ya existe el producto, avisar de inmediato con opciones
const targetScan = normalize(`    if (scannerContext === 'sku_input') {
      setNewSku(code);
      // Si el código ya coincide con algún producto existente, sugerir autocompletar título
      const matched = products.find(p => p.sku === code || p.id === code);
      if (matched && !newTitle) {
        setNewTitle(matched.title);
      }
    }`);

const repScan = normalize(`    if (scannerContext === 'sku_input') {
      setNewSku(code);
      // Si el código ya coincide con algún producto existente en la tienda
      const matched = products.find(p => (p.sku && p.sku.trim().toLowerCase() === code.toLowerCase()) || p.id === code);
      if (matched) {
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
      }
    }`);

// 2. Validación preventiva antes de guardar (handleSaveProduct): evitar el error SQL duplicate key
const targetSave = normalize(`  // Guardar Alta o Edición de Producto
  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    try {`);

const repSave = normalize(`  // Guardar Alta o Edición de Producto
  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();

    // VALIDACIÓN PREVENTIVA DE SKU DUPLICADO:
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
    }

    setIsSaving(true);

    try {`);

// 3. Manejo amigable del mensaje de error en el bloque catch por si la BD devuelve duplicate key
const targetCatch = normalize(`    } catch (err: any) {
      console.error("Fallo al guardar en base de datos:", err);
      alert(\`Error al guardar en la base de datos: \${err.message || 'Intenta de nuevo'}\`);
      return;
    }`);

const repCatch = normalize(`    } catch (err: any) {
      console.error("Fallo al guardar en base de datos:", err);
      if (err.message && (err.message.includes('products_sku_key') || err.message.includes('duplicate key value'))) {
        alert(
          \`⚠️ No se pudo guardar porque el código de barras (SKU) ya está en uso por otro producto.\\n\\nPor favor escribe un SKU diferente (o presiona el botón "Generar" junto al campo SKU) para guardar este producto.\`
        );
      } else {
        alert(\`Error al guardar en la base de datos: \${err.message || 'Intenta de nuevo'}\`);
      }
      return;
    }`);

if (!file.includes(targetScan)) {
  console.error('targetScan not found');
  process.exit(1);
}
if (!file.includes(targetSave)) {
  console.error('targetSave not found');
  process.exit(1);
}
if (!file.includes(targetCatch)) {
  console.error('targetCatch not found');
  process.exit(1);
}

file = file.replace(targetScan, repScan);
file = file.replace(targetSave, repSave);
file = file.replace(targetCatch, repCatch);

fs.writeFileSync(filePath, file, 'utf8');
console.log('Successfully applied smart duplicate SKU detection and friendly messages in admin/page.tsx!');
