const accessKey = 'pk_uY1yOYNOOvMm9eYnXJRBre7sYo7RegTGPSVLAVx5vZ0';
const appId = '02f0acd7-36ba-4ef7-9538-fd9d6e1eaa9e';
const affiliateId = '58fa10e4.8474c111.58fa10e5.6ecfef07';

async function testRakuten() {
  console.log('Testing Rakuten API with credentials...');

  // 1. Endpoint OpenAPI nuevo (2022+)
  const url1 = `https://openapi.rakuten.co.jp/ichibagt/api/IchibaItem/Search/20220601?applicationId=${appId}&keyword=pokemon&hits=2&format=json`;
  try {
    const res1 = await fetch(url1, {
      headers: {
        'Authorization': `Bearer ${accessKey}`,
        'Origin': 'https://foxdrop.mx',
        'Referer': 'https://foxdrop.mx/'
      }
    });
    console.log('OpenAPI (with Bearer) Status:', res1.status);
    const data1 = await res1.json();
    console.log('OpenAPI Response count:', data1.count || data1.hits || data1.error || data1);
  } catch (err) {
    console.log('OpenAPI error:', err.message);
  }

  // 2. Endpoint con applicationId y accessKey como param o header
  const url2 = `https://openapi.rakuten.co.jp/ichibagt/api/IchibaItem/Search/20220601?applicationId=${appId}&accessKey=${accessKey}&keyword=pokemon&hits=2&format=json`;
  try {
    const res2 = await fetch(url2, {
      headers: {
        'Origin': 'https://foxdrop.mx',
        'Referer': 'https://foxdrop.mx/'
      }
    });
    console.log('OpenAPI (accessKey param) Status:', res2.status);
    const data2 = await res2.json();
    console.log('Response:', data2.count ? `Found ${data2.count} items in Japan!` : data2);
    if (data2.Items && data2.Items.length > 0) {
      const item = data2.Items[0].Item;
      console.log('Sample item:', {
        name: item.itemName,
        priceYen: item.itemPrice,
        url: item.itemUrl
      });
    }
  } catch (err) {
    console.log('URL2 error:', err.message);
  }

  // 3. Endpoint app.rakuten.co.jp clásico
  const url3 = `https://app.rakuten.co.jp/services/api/IchibaItem/Search/20220601?applicationId=${appId}&affiliateId=${affiliateId}&keyword=pokemon&hits=2&format=json`;
  try {
    const res3 = await fetch(url3, {
      headers: {
        'Origin': 'https://foxdrop.mx',
        'Referer': 'https://foxdrop.mx/'
      }
    });
    console.log('Classic App API Status:', res3.status);
    const data3 = await res3.json();
    console.log('Response:', data3.count ? `Found ${data3.count} items!` : data3);
  } catch (err) {
    console.log('URL3 error:', err.message);
  }
}

testRakuten();
