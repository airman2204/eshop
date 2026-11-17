const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../src/app/admin/page.tsx');
let content = fs.readFileSync(filePath, 'utf8');

const sIdx = content.indexOf(`        {crmSubTab === 'japan' && (
          <AdminJapanTab
            existingProducts={products}
            onProductImported={() => {
              loadProducts();
            }}
          />
        )}`);

if (sIdx === -1) {
  console.error('duplicate block not found');
  process.exit(1);
}

const targetLength = `        {crmSubTab === 'japan' && (
          <AdminJapanTab
            existingProducts={products}
            onProductImported={() => {
              loadProducts();
            }}
          />
        )}`.length;

content = content.substring(0, sIdx) + content.substring(sIdx + targetLength).trimStart();
fs.writeFileSync(filePath, content, 'utf8');
console.log('Removed duplicate japan tab block successfully!');
