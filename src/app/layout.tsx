import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans, Outfit, Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import CookieBanner from "@/components/CookieBanner";
import Analytics from "@/components/Analytics";

// Tipografía moderna elegante para toda la tienda
const plusJakartaSans = Plus_Jakarta_Sans({
  variable: "--font-sans",
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "500", "600", "700", "800"],
});

// Tipografía para títulos y encabezados de alta gama
const outfit = Outfit({
  variable: "--font-heading",
  subsets: ["latin"],
  display: "swap",
  weight: ["500", "600", "700", "800", "900"],
});

// Tipografía original Geist exclusiva para el logo FoxDrop oficial
const geistLogo = Geist({
  variable: "--font-geist-logo",
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "700", "900"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

export const viewport: Viewport = {
  themeColor: "#0F3E36",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "https://foxdrop.mx"),
  title: {
    default: "FoxDrop México — Calidad Amistosa y Garantizada",
    template: "%s | FoxDrop México",
  },
  description:
    "Descubre tesoros mundiales y productos exclusivos en FoxDrop México. Entregas seguras y envíos a toda la República Mexicana con garantía de satisfacción.",
  keywords: [
    "FoxDrop",
    "FoxDrop México",
    "tienda online México",
    "importación directa México",
    "gadgets exclusivos",
    "electrónica original",
    "cosmética importada",
    "compras seguras México",
    "envíos express México",
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
      "Descubre tesoros mundiales y productos exclusivos en FoxDrop. Entregas seguras y envíos a todo México.",
    images: [
      {
        url: "/foxdrop-logo.png",
        width: 600,
        height: 600,
        alt: "FoxDrop México — Catálogo y Novedades",
      },
    ],
  },
  twitter: {
    card: "summary",
    title: "FoxDrop México — Calidad Amistosa y Garantizada",
    description:
      "Descubre tesoros mundiales y productos exclusivos en FoxDrop. Entregas seguras y envíos a todo México.",
    images: ["/foxdrop-logo.png"],
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
      "description": "Tienda en línea de productos de importación, tecnología, hogar y cosmética con entrega segura y envíos a todo México.",
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
      className={`${plusJakartaSans.variable} ${outfit.variable} ${geistLogo.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
        />
      </head>
      <body className="min-h-full flex flex-col font-sans">
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
