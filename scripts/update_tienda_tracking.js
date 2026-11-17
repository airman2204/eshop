const fs = require('fs');
const filePath = 'd:/Foxdrop/eshop/src/app/tienda/page.tsx';
let code = fs.readFileSync(filePath, 'utf8');

const target = '  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);';
const replacement = `  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  // Rastrear vista de ficha de producto para embudo e historial de interés
  useEffect(() => {
    if (selectedProduct) {
      trackEcommerceEvent('view_item', {
        item_id: selectedProduct.id,
        item_name: selectedProduct.title,
        price: selectedProduct.publicPrice,
        currency: 'MXN',
        items: [{
          item_id: selectedProduct.id,
          item_name: selectedProduct.title,
          price: selectedProduct.publicPrice,
          item_category: selectedProduct.categoryName,
        }]
      });
    }
  }, [selectedProduct?.id]);`;

if (code.includes(target) && !code.includes('Rastrear vista de ficha de producto')) {
  code = code.replace(target, replacement);
  fs.writeFileSync(filePath, code, 'utf8');
  console.log('Successfully injected view_item tracker into tienda/page.tsx');
} else {
  console.log('Target not found or already injected');
}
