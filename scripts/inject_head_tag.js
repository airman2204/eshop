const fs = require('fs');
const filePath = 'd:/Foxdrop/eshop/src/app/layout.tsx';
let code = fs.readFileSync(filePath, 'utf8');

const targetHead = `      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
        />
      </head>`;

const newHead = `      <head>
        {/* Google tag (gtag.js) */}
        <script async src="https://www.googletagmanager.com/gtag/js?id=G-26KQRL7KYJ" />
        <script
          dangerouslySetInnerHTML={{
            __html: \`
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());
              gtag('config', 'G-26KQRL7KYJ');
            \`,
          }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
        />
      </head>`;

if (code.includes(targetHead)) {
  code = code.replace(targetHead, newHead);
  fs.writeFileSync(filePath, code, 'utf8');
  console.log('Injected raw Google tag into <head> of layout.tsx');
} else {
  console.log('targetHead not found');
}
