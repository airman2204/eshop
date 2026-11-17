const fs = require('fs');
const filePath = 'd:/Foxdrop/eshop/src/app/tienda/page.tsx';
let code = fs.readFileSync(filePath, 'utf8');

const target = '  const handleCheckoutInit = () => {';
const replacement = `  const handleCheckoutInit = () => {
    trackEcommerceEvent('begin_checkout', {
      value: cartSubtotal,
      currency: 'MXN',
      items: cart.map(it => ({
        item_id: it.product.id,
        item_name: it.product.title,
        price: it.product.publicPrice,
        quantity: it.quantity,
      })),
    });`;

if (code.includes(target) && !code.includes("trackEcommerceEvent('begin_checkout'")) {
  code = code.replace(target, replacement);
  fs.writeFileSync(filePath, code, 'utf8');
  console.log('Injected begin_checkout tracker into handleCheckoutInit');
} else {
  console.log('Target not found or already injected');
}
