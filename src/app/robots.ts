import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://foxdrop.mx';

  return {
    rules: {
      userAgent: '*',
      allow: ['/', '/tienda', '/privacidad', '/terminos'],
      disallow: ['/admin', '/api/'],
    },
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
