const fs = require('fs');
const filePath = 'd:/Foxdrop/eshop/src/app/admin/page.tsx';
let code = fs.readFileSync(filePath, 'utf8');

// 1. Ampliar el ancho mínimo de la columna "Artículo" en el <th>
code = code.replace(
  '<th className="py-3 px-4 min-w-[220px]">Artículo</th>',
  '<th className="py-3 px-4 min-w-[320px]">Artículo</th>'
);

// 2. Permitir que el nombre se muestre completo o en 2 líneas legibles en vez de cortarse con truncate max-w-[200px]
const oldSpan = '<span className="font-bold text-slate-900 truncate max-w-[200px]">{p.title}</span>';
const newSpan = '<span className="font-bold text-slate-900 leading-snug break-words max-w-[340px]" title={p.title}>{p.title}</span>';

if (code.includes(oldSpan)) {
  code = code.replace(oldSpan, newSpan);
  console.log('Replaced title span successfully!');
} else {
  console.log('oldSpan not found');
}

fs.writeFileSync(filePath, code, 'utf8');
console.log('Updated admin/page.tsx');
