const fs = require('fs');

const filePath = 'd:/Foxdrop/eshop/src/types/index.ts';
let code = fs.readFileSync(filePath, 'utf8');
code = code.replace(
  "fulfillmentType?: 'stock_local' | 'cj_dropship';",
  "fulfillmentType?: 'stock_local' | 'cj_dropship' | 'japan_rakuten';"
);
fs.writeFileSync(filePath, code, 'utf8');
console.log('Updated fulfillmentType in src/types/index.ts');

const adminFilePath = 'd:/Foxdrop/eshop/src/lib/admin.ts';
let adminCode = fs.readFileSync(adminFilePath, 'utf8');
adminCode = adminCode.replace(
  "fulfillmentType?: 'stock_local' | 'cj_dropship';",
  "fulfillmentType?: 'stock_local' | 'cj_dropship' | 'japan_rakuten';"
);
fs.writeFileSync(adminFilePath, adminCode, 'utf8');
console.log('Updated fulfillmentType in src/lib/admin.ts');
