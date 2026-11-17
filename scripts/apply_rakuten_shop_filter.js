const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../src/app/api/admin/rakuten/route.ts');
let content = fs.readFileSync(filePath, 'utf8');

// 1. Filtrar tiendas no elegibles (Glomarket / revendedores estadounidenses que prohíben casilleros en Japón)
const oldMapStart = `    const items = (data.Items || []).map((wrapper: any) => {`;

const newMapStart = `    // Tiendas no elegibles en Rakuten (revendedores extranjeros de EE.UU. que prohíben casilleros como ZenMarket)
    const BLOCKED_SHOPS = ['glomarket', 'americankitchen', 'alpha-espace'];

    const eligibleItems = (data.Items || []).filter((wrapper: any) => {
      const item = wrapper.Item;
      const shopCode = (item.shopCode || '').toLowerCase();
      const shopName = (item.shopName || '').toLowerCase();
      const caption = (item.itemCaption || '').toLowerCase();

      // Bloquear tiendas conocidas de EE.UU. o publicaciones que prohíban empresas de reenvío (転送サービス)
      if (BLOCKED_SHOPS.some(b => shopCode.includes(b) || shopName.includes(b))) return false;
      if (caption.includes('転送サービス会社') || caption.includes('アメリカから直送')) return false;

      return true;
    });

    const items = eligibleItems.map((wrapper: any) => {`;

if (!content.includes(oldMapStart)) {
  console.error('oldMapStart not found');
  process.exit(1);
}
content = content.replace(oldMapStart, newMapStart);

fs.writeFileSync(filePath, content, 'utf8');
console.log('Rakuten backend filter applied successfully!');
