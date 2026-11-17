const fs = require('fs');
const filePath = 'd:/Foxdrop/eshop/src/components/Analytics.tsx';
let code = fs.readFileSync(filePath, 'utf8');

const target = "const GA_ID = dynamicSettings?.gaMeasurementId || process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;";
const replacement = "const GA_ID = dynamicSettings?.gaMeasurementId || process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID || 'G-26KQRL7KYJ';";

if (code.includes(target)) {
  code = code.replace(target, replacement);
  fs.writeFileSync(filePath, code, 'utf8');
  console.log('Successfully set fallback GA_ID to G-26KQRL7KYJ');
} else {
  console.log('Target not found in Analytics.tsx');
}
