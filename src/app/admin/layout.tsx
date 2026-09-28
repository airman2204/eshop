import type { Metadata, Viewport } from 'next';

export const viewport: Viewport = {
  themeColor: '#2D4A58',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
};

export const metadata: Metadata = {
  title: 'FoxDrop CRM — Control & Admin',
  description: 'Panel de administración, inventario, fletes y pedidos de FoxDrop Puebla.',
  manifest: '/manifest-admin.webmanifest',
  icons: {
    icon: [
      { url: '/favicon.ico' },
      { url: '/foxdrop-icon.png', type: 'image/png' },
      { url: '/foxdrop-logo.png', sizes: '192x192', type: 'image/png' },
    ],
    apple: [
      { url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'FoxDrop Admin',
  },
  applicationName: 'FoxDrop Admin',
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
