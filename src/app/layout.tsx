import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import CookieBanner from "@/components/CookieBanner";
import Analytics from "@/components/Analytics";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const viewport: Viewport = {
  themeColor: "#0F3E36",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  viewportFit: "cover",
};

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "https://foxdrop.mx"),
  title: {
    default: "FoxDrop México — Calidad Amistosa y Garantizada",
    template: "%s | FoxDrop México",
  },
  description:
    "Descubre tesoros mundiales y productos exclusivos en FoxDrop México. Entregas locales seguras en Puebla y envíos a toda la República Mexicana con garantía de satisfacción.",
  keywords: [
    "FoxDrop",
    "FoxDrop México",
    "tienda online Puebla",
    "importación directa México",
    "gadgets exclusivos",
    "electrónica original",
    "cosmética importada",
    "compras seguras México",
    "envíos express Puebla",
    "pedidos especiales",
  ],
  authors: [{ name: "FoxDrop México" }],
  creator: "FoxDrop",
  publisher: "FoxDrop",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  openGraph: {
    type: "website",
    locale: "es_MX",
    url: "https://foxdrop.mx",
    siteName: "FoxDrop México",
    title: "FoxDrop México — Calidad Amistosa y Garantizada",
    description:
      "Descubre tesoros mundiales y productos exclusivos en FoxDrop. Entregas seguras en Puebla y envíos a todo México.",
    images: [
      {
        url: "/fox-hero-desktop-banner.png",
        width: 1200,
        height: 630,
        alt: "FoxDrop México — Tu Tienda de Tesoros Mundiales",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "FoxDrop México — Calidad Amistosa y Garantizada",
    description:
      "Descubre tesoros mundiales y productos exclusivos en FoxDrop. Entregas seguras en Puebla y envíos a todo México.",
    images: ["/fox-hero-desktop-banner.png"],
  },
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: "/favicon.ico" },
      { url: "/foxdrop-icon.png", type: "image/png" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
    ],
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "FoxDrop",
  },
  applicationName: "FoxDrop",
};

// Datos estructurados JSON-LD Schema.org para Google Rich Snippets y SEO
const structuredData = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": "https://foxdrop.mx/#organization",
      "name": "FoxDrop México",
      "url": "https://foxdrop.mx",
      "logo": "https://foxdrop.mx/foxdrop-header-logo-exact.png",
      "description": "Tienda en línea de productos de importación, tecnología, hogar y cosmética con entrega segura en Puebla y envíos a todo México.",
      "contactPoint": {
        "@type": "ContactPoint",
        "contactType": "Customer Support",
        "areaServed": "MX",
        "availableLanguage": "Spanish"
      }
    },
    {
      "@type": "WebSite",
      "@id": "https://foxdrop.mx/#website",
      "url": "https://foxdrop.mx",
      "name": "FoxDrop México",
      "publisher": {
        "@id": "https://foxdrop.mx/#organization"
      },
      "potentialAction": {
        "@type": "SearchAction",
        "target": {
          "@type": "EntryPoint",
          "urlTemplate": "https://foxdrop.mx/tienda?q={search_term_string}"
        },
        "query-input": "required name=search_term_string"
      }
    }
  ]
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="es"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
        />
      </head>
      <body className="min-h-full flex flex-col">
        <Analytics />
        {children}
        <CookieBanner />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/sw.js').catch(function(err) {
                    console.log('SW registration failed: ', err);
                  });
                });
              }
            `,
          }}
        />
      </body>
    </html>
  );
}
