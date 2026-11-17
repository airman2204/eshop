const accessKey = 'pk_uY1yOYNOOvMm9eYnXJRBre7sYo7RegTGPSVLAVx5vZ0';
const appId = '02f0acd7-36ba-4ef7-9538-fd9d6e1eaa9e';
const affiliateId = '58fa10e4.8474c111.58fa10e5.6ecfef07';

async function testRakutenDetails() {
  const url = `https://openapi.rakuten.co.jp/ichibams/api/IchibaItem/Search/20260701?applicationId=${appId}&accessKey=${accessKey}&affiliateId=${affiliateId}&keyword=one+piece+figure&hits=1&format=json`;
  const res = await fetch(url, { headers: { 'Origin': 'https://foxdrop.mx', 'Referer': 'https://foxdrop.mx' } });
  const data = await res.json();
  if (data.Items && data.Items[0]) {
    console.log('Sample detail:', JSON.stringify(data.Items[0].Item, null, 2));
  } else {
    console.log('Response:', data);
  }
}
testRakutenDetails();
