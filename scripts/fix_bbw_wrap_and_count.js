const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../src/app/tienda/page.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// 1. Quitar cantidad de artículos "(133)" en "Mostrar todo"
const oldBtn = '<span>Mostrar todo ({visibleProducts.filter(p => (p.brand || \'\').toLowerCase().includes(\'bath & body\') || (p.title || \'\').toLowerCase().includes(\'bath & body\')).length})</span>';
const newBtn = '<span>Mostrar todo</span>';

if (!content.includes(oldBtn)) {
  console.error('oldBtn not found');
  process.exit(1);
}
content = content.replace(oldBtn, newBtn);

// 2. Hacer que las píldoras se ajusten limpiamente en múltiples líneas (flex-wrap) en lugar de cortarse a la derecha (mocho)
const oldContainer = '<div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1 overscroll-x-contain touch-pan-x">';
const newContainer = '<div className="flex flex-wrap items-center gap-2 pt-1">';

if (!content.includes(oldContainer)) {
  console.error('oldContainer not found');
  process.exit(1);
}
content = content.replace(oldContainer, newContainer);

fs.writeFileSync(filePath, content, 'utf8');
console.log('Fixed truncation (mocho) and removed product counts successfully!');
