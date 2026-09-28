import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const viewport: Viewport = {
  themeColor: "#E65F2B",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export const metadata: Metadata = {
  title: {
    default: "FoxDrop — Tu Atajo al Mundo",
    template: "%s | FoxDrop",
  },
  description:
    "Productos de importación internacional en Puebla, México. Electrónica, moda, cosmética y más con entrega local y puntos de encuentro en toda la ciudad.",
  keywords: [
    "importación",
    "productos americanos",
    "electrónica",
    "Puebla",
    "México",
    "Apple Watch",
    "Sony",
    "Samsung",
    "FoxDrop",
  ],
  authors: [{ name: "FoxDrop" }],
  creator: "FoxDrop",
  publisher: "FoxDrop",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
    },
  },
  openGraph: {
    type: "website",
    locale: "es_MX",
    siteName: "FoxDrop",
    title: "FoxDrop — Tu Atajo al Mundo",
    description:
      "Productos de importación internacional en Puebla, México. Entrega local y puntos de encuentro.",
  },
  twitter: {
    card: "summary_large_image",
    title: "FoxDrop — Tu Atajo al Mundo",
    description: "Productos de importación internacional en Puebla, México.",
  },
  manifest: "/manifest.webmanifest",
  icons: {
    icon: "/favicon.ico",
    apple: "/apple-touch-icon.png",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="es"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {children}
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
