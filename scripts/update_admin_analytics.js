const fs = require('fs');
const filePath = 'd:/Foxdrop/eshop/src/app/admin/page.tsx';
let code = fs.readFileSync(filePath, 'utf8');

// 1. Agregar import
if (!code.includes('AdminAnalyticsTab')) {
  code = code.replace(
    "import AdminCampaignsTab from '@/components/AdminCampaignsTab';",
    "import AdminCampaignsTab from '@/components/AdminCampaignsTab';\nimport AdminAnalyticsTab from '@/components/AdminAnalyticsTab';"
  );
}

// 2. Agregar 'analytics' a crmSubTab type
code = code.replace(
  "'cj_dropship' | 'campaigns'>('inventory')",
  "'cj_dropship' | 'campaigns' | 'analytics'>('inventory')"
);

// 3. Agregar 'analytics' a validTabs
code = code.replace(
  "const validTabs = ['inventory', 'batches', 'orders', 'order_history', 'cancelled_orders', 'clients', 'special_orders', 'finance', 'carts', 'carousel', 'loyalty', 'shipping_payments', 'agent', 'whatsapp', 'cj_dropship', 'campaigns'];",
  "const validTabs = ['inventory', 'batches', 'orders', 'order_history', 'cancelled_orders', 'clients', 'special_orders', 'finance', 'carts', 'carousel', 'loyalty', 'shipping_payments', 'agent', 'whatsapp', 'cj_dropship', 'campaigns', 'analytics'];"
);

// 4. Agregar botón en sidebar después de finanzas
const financeButtonTarget = `              {/* 5. FINANZAS & MARGEN */}
              <button
                onClick={() => { setCrmSubTab('finance'); setMobileSidebarOpen(false); }}
                className={\`w-full px-3 py-2 rounded-xl font-medium transition flex items-center justify-between \${
                  crmSubTab === 'finance' 
                    ? 'bg-slate-800 text-white font-bold border border-slate-700/60 shadow-xs' 
                    : 'text-slate-400 hover:bg-slate-800/40 hover:text-slate-200'
                }\`}
              >
                <span className="flex items-center gap-2.5">
                  <BarChart3 className={\`w-4 h-4 \${crmSubTab === 'finance' ? 'text-[#E65F2B]' : 'text-slate-400'}\`} /> Finanzas & Margen
                </span>
              </button>`;

const analyticsButton = `              {/* 5. FINANZAS & MARGEN */}
              <button
                onClick={() => { setCrmSubTab('finance'); setMobileSidebarOpen(false); }}
                className={\`w-full px-3 py-2 rounded-xl font-medium transition flex items-center justify-between \${
                  crmSubTab === 'finance' 
                    ? 'bg-slate-800 text-white font-bold border border-slate-700/60 shadow-xs' 
                    : 'text-slate-400 hover:bg-slate-800/40 hover:text-slate-200'
                }\`}
              >
                <span className="flex items-center gap-2.5">
                  <BarChart3 className={\`w-4 h-4 \${crmSubTab === 'finance' ? 'text-[#E65F2B]' : 'text-slate-400'}\`} /> Finanzas & Margen
                </span>
              </button>

              {/* 5.1 MÉTRICAS & SEO / SEM */}
              <button
                onClick={() => { setCrmSubTab('analytics'); setMobileSidebarOpen(false); }}
                className={\`w-full px-3 py-2 rounded-xl font-medium transition flex items-center justify-between \${
                  crmSubTab === 'analytics' 
                    ? 'bg-slate-800 text-white font-bold border border-slate-700/60 shadow-xs' 
                    : 'text-slate-400 hover:bg-slate-800/40 hover:text-slate-200'
                }\`}
              >
                <span className="flex items-center gap-2.5">
                  <TrendingUp className={\`w-4 h-4 \${crmSubTab === 'analytics' ? 'text-[#E65F2B]' : 'text-slate-400'}\`} /> Métricas & SEO/SEM
                </span>
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-bold">
                  Live
                </span>
              </button>`;

if (code.includes(financeButtonTarget)) {
  code = code.replace(financeButtonTarget, analyticsButton);
  console.log('Sidebar button added');
} else {
  console.log('financeButtonTarget not found');
}

// 5. Títulos en header
code = code.replace(
  "{crmSubTab === 'finance' && 'Margen de Utilidad & Finanzas'}",
  "{crmSubTab === 'finance' && 'Margen de Utilidad & Finanzas'}\n                    {crmSubTab === 'analytics' && 'Métricas, SEO/SEM & Trazabilidad'}"
);

code = code.replace(
  "{crmSubTab === 'finance' && 'Rendimiento financiero neto, costos de importación y análisis de márgenes'}",
  "{crmSubTab === 'finance' && 'Rendimiento financiero neto, costos de importación y análisis de márgenes'}\n                    {crmSubTab === 'analytics' && 'Trazabilidad de visitas, origen de tráfico orgánico y pauta, embudo de conversión y Pixels'}"
);

// 6. Renderizar componente de analíticas
const campaignRender = `          {/* 12.2 SECCIÓN CAMPAÑAS Y CUPONES QR PHYGITAL */}
          {crmSubTab === 'campaigns' && (
            <div className="space-y-4">
              <AdminCampaignsTab />
            </div>
          )}`;

const analyticsRender = `          {/* 12.2 SECCIÓN CAMPAÑAS Y CUPONES QR PHYGITAL */}
          {crmSubTab === 'campaigns' && (
            <div className="space-y-4">
              <AdminCampaignsTab />
            </div>
          )}

          {/* 12.3 SECCIÓN ANALÍTICAS, SEO & TRAZABILIDAD */}
          {crmSubTab === 'analytics' && (
            <div className="space-y-4">
              <AdminAnalyticsTab onNotify={(msg) => alert(msg)} />
            </div>
          )}`;

if (code.includes(campaignRender)) {
  code = code.replace(campaignRender, analyticsRender);
  console.log('Analytics tab render added');
} else {
  console.log('campaignRender not found');
}

fs.writeFileSync(filePath, code, 'utf8');
console.log('Successfully written to src/app/admin/page.tsx');
