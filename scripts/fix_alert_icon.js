const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../src/app/admin/page.tsx');
let file = fs.readFileSync(filePath, 'utf8');

file = file.replace('<AlertCircle className="w-6 h-6" />', '<AlertTriangle className="w-6 h-6" />');
fs.writeFileSync(filePath, file, 'utf8');
console.log('Replaced with AlertTriangle successfully');
