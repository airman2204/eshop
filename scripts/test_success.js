const accessKey = 'pk_uY1yOYNOOvMm9eYnXJRBre7sYo7RegTGPSVLAVx5vZ0';
const appId = '02f0acd7-36ba-4ef7-9538-fd9d6e1eaa9e';
const affiliateId = '58fa10e4.8474c111.58fa10e5.6ecfef07';

async function testSuccess() {
  await new Promise(r => setTimeout(r, 2000));
  const url = `https://openapi.rakuten.co.jp/ichibams/api/IchibaItem/Search/20220601?applicationId=${appId}&accessKey=${accessKey}&affiliateId=${affiliateId}&keyword=pokemon&hits=2&format=json`;
  
  const res = await fetch(url, {
    headers: {
      'Origin': 'https://foxdrop.mx',
      'Referer': 'https://foxdrop.mx'
    }
  });

  console.log('Status:', res.status);
  const data = await res.json();
  console.log('Items found:', data.count);
  if (data.Items && data.Items.length > 0) {
    const item = data.Items[0].Item;
    console.log('--- PRODUCTO REAL DE JAPÓN ---');
    console.log('Título:', item.itemName);
    console.log('Precio en Yenes:', '¥' + item.itemPrice);
    console.log('Tienda en Japón:', item.shopName);
    console.log('URL Japón:', item.itemUrl);
    console.log('Imagen:', item.mediumImageUrls?.[0]?.imageUrl);
  } else {
    console.log('Data:', data);
  }
}

testSuccess();
