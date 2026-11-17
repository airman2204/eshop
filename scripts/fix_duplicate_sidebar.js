const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../src/app/admin/page.tsx');
let file = fs.readFileSync(filePath, 'utf8');

const normalize = s => s.replace(/\r\n/g, '\n');
file = normalize(file);

const doubleBtn = normalize(`              {/* RAKUTEN JAPÓN IMPORTADOR */}
              <button
                onClick={() => { setCrmSubTab('japan'); setMobileSidebarOpen(false); }}
                className={\`w-full px-3 py-2 rounded-xl font-medium transition flex items-center justify-between \${
                  crmSubTab === 'japan'
                    ? 'bg-red-950 text-white font-bold border border-red-500/40 shadow-xs' 
                    : 'text-slate-400 hover:bg-slate-800/40 hover:text-slate-200'
                }\`}
              >
                <span className="flex items-center gap-2.5">
                  <span className="text-base leading-none">🎌</span> Catálogo Japón (Rakuten)
                </span>
                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-red-500/20 text-red-300 border border-red-400/30">
                  Tokio
                </span>
              </button>

              {/* RAKUTEN JAPÓN IMPORTADOR */}
              <button
                onClick={() => { setCrmSubTab('japan'); setMobileSidebarOpen(false); }}
                className={\`w-full px-3 py-2 rounded-xl font-medium transition flex items-center justify-between \${
                  crmSubTab === 'japan'
                    ? 'bg-red-950 text-white font-bold border border-red-500/40 shadow-xs' 
                    : 'text-slate-400 hover:bg-slate-800/40 hover:text-slate-200'
                }\`}
              >
                <span className="flex items-center gap-2.5">
                  <span className="text-base leading-none">🎌</span> Catálogo Japón (Rakuten)
                </span>
                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-red-500/20 text-red-300 border border-red-400/30">
                  Tokio
                </span>
              </button>`);

const singleBtn = normalize(`              {/* RAKUTEN JAPÓN IMPORTADOR */}
              <button
                onClick={() => { setCrmSubTab('japan'); setMobileSidebarOpen(false); }}
                className={\`w-full px-3 py-2 rounded-xl font-medium transition flex items-center justify-between \${
                  crmSubTab === 'japan'
                    ? 'bg-red-950 text-white font-bold border border-red-500/40 shadow-xs' 
                    : 'text-slate-400 hover:bg-slate-800/40 hover:text-slate-200'
                }\`}
              >
                <span className="flex items-center gap-2.5">
                  <span className="text-base leading-none">🎌</span> Catálogo Japón (Rakuten)
                </span>
                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-red-500/20 text-red-300 border border-red-400/30">
                  Tokio
                </span>
              </button>`);

if (!file.includes(doubleBtn)) {
  console.error('doubleBtn not found');
  process.exit(1);
}

file = file.replace(doubleBtn, singleBtn);
fs.writeFileSync(filePath, file, 'utf8');
console.log('Successfully eliminated duplicate sidebar item!');
