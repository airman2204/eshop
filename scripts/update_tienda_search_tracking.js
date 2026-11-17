const fs = require('fs');
const filePath = 'd:/Foxdrop/eshop/src/app/tienda/page.tsx';
let code = fs.readFileSync(filePath, 'utf8');

const target = "  const [searchTerm, setSearchTerm] = useState('');";
const replacement = `  const [searchTerm, setSearchTerm] = useState('');

  // Rastrear búsquedas con debounce para capturar intereses de los usuarios
  useEffect(() => {
    const clean = searchTerm.trim();
    if (clean.length >= 3) {
      const timer = setTimeout(() => {
        trackEcommerceEvent('search', {
          search_term: clean,
        });
      }, 1200);
      return () => clearTimeout(timer);
    }
  }, [searchTerm]);`;

if (code.includes(target) && !code.includes('Rastrear búsquedas con debounce')) {
  code = code.replace(target, replacement);
  fs.writeFileSync(filePath, code, 'utf8');
  console.log('Injected search debounce tracker into tienda/page.tsx');
} else {
  console.log('Target not found or already injected');
}
