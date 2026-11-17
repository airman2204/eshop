const fs = require('fs');
const filePath = 'd:/Foxdrop/eshop/src/app/admin/page.tsx';
let code = fs.readFileSync(filePath, 'utf8');

const oldTarget = `{crmSubTab === 'japan' && (
          <AdminJapanTab
            existingProducts={products}
            onProductImported={() => {
              loadProducts();
            }}
          />
        )}`;

const newTarget = `{crmSubTab === 'japan' && (
          <AdminJapanTab
            existingProducts={products}
            onProductImported={() => {
              getActiveProducts(true).then(dbProds => {
                if (dbProds) setProducts(dbProds);
              }).catch(() => {});
            }}
          />
        )}`;

if (code.includes(oldTarget)) {
  code = code.replace(oldTarget, newTarget);
  fs.writeFileSync(filePath, code, 'utf8');
  console.log('Fixed onProductImported in admin/page.tsx');
} else {
  console.log('oldTarget not found');
}
