const accessKey = 'pk_uY1yOYNOOvMm9eYnXJRBre7sYo7RegTGPSVLAVx5vZ0';
const appId = '02f0acd7-36ba-4ef7-9538-fd9d6e1eaa9e';
const affiliateId = '58fa10e4.8474c111.58fa10e5.6ecfef07';

async function testRakuten() {
  const url = `https://openapi.rakuten.co.jp/ichibams/api/IchibaItem/Search/20220601?applicationId=${appId}&accessKey=${accessKey}&affiliateId=${affiliateId}&keyword=pokemon&hits=3&format=json`;
  
  const variations = [
    { 'Origin': 'https://foxdrop.mx' },
    { 'Referer': 'https://foxdrop.mx' },
    { 'Referer': 'https://foxdrop.mx/' },
    { 'Origin': 'https://foxdrop.mx', 'Referer': 'https://foxdrop.mx' },
    { 'Origin': 'https://foxdrop.mx', 'Referer': 'https://foxdrop.mx/' }
  ];

  for (let i = 0; i < variations.length; i++) {
    const headers = variations[i];
    const res = await fetch(url, { headers });
    console.log(`Variation ${i + 1}:`, JSON.stringify(headers), '=> Status:', res.status);
    const body = await res.json();
    if (res.status === 200) {
      console.log('SUCCESS! Found items:', body.count);
      if (body.Items && body.Items.length > 0) {
        console.log('Sample item:', body.Items[0].Item.itemName, '¥' + body.Items[0].Item.itemPrice);
      }
      return;
    } else {
      console.log('Error:', body.errors || body.error || body);
    }
  }
}

testRakuten();
