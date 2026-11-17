async function decodePage() {
  const res = await fetch('https://item.rakuten.co.jp/glomarket/30733289/', {
    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
  });
  const buf = await res.arrayBuffer();
  const decoder = new TextDecoder('euc-jp');
  const text = decoder.decode(buf);
  const titleMatch = text.match(/<title>([^<]+)<\/title>/);
  console.log('Decoded Title:', titleMatch ? titleMatch[1] : 'No title');

  // Buscar informacion de la tienda y envio
  const lines = text.split('\n');
  lines.forEach(l => {
    if (l.includes('円') && l.includes('price')) console.log('Price line:', l.trim().substring(0, 100));
    if (l.includes('アメリカ') || l.includes('国際配送') || l.includes('海外')) {
      console.log('Envio int / USA line:', l.trim().substring(0, 120));
    }
  });
}
decodePage();
