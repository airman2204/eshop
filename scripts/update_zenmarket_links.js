const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../src/components/AdminJapanTab.tsx');
let file = fs.readFileSync(filePath, 'utf8');

const normalize = s => s.replace(/\r\n/g, '\n');
file = normalize(file);

// 1. Add getZenMarketUrl helper function
const helperFn = `// Helper para generar URL nativa y canónica de ZenMarket para Rakuten Japón
const getZenMarketUrl = (url: string): string => {
  if (!url) return 'https://zenmarket.jp/es/rakuten.aspx';
  try {
    const match = url.match(/item\\.rakuten\\.co\\.jp\\/([^\\/\\?#]+)\\/([^\\/\\?#]+)/);
    if (match) {
      return \`https://zenmarket.jp/es/rakutenproduct.aspx?itemCode=\${match[1]}:\${match[2]}\`;
    }
  } catch (e) {}
  return \`https://zenmarket.jp/es/other.aspx?itemUrl=\${encodeURIComponent(url)}\`;
};
`;

// Insert helper before AdminJapanTab component
const compAnchor = 'export default function AdminJapanTab(';
if (!file.includes(compAnchor)) {
  console.error('compAnchor not found');
  process.exit(1);
}
if (!file.includes('const getZenMarketUrl =')) {
  file = file.replace(compAnchor, helperFn + '\n' + compAnchor);
}

// 2. Replace all ZenMarket link hrefs to use getZenMarketUrl
file = file.replace(/href=\{`https:\/\/zenmarket\.jp\/es\/other\.aspx\?itemUrl=\$\{encodeURIComponent\(([^)]+)\)\}`\}/g, 'href={getZenMarketUrl($1)}');

fs.writeFileSync(filePath, file, 'utf8');
console.log('Successfully updated AdminJapanTab with getZenMarketUrl!');
