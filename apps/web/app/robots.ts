import type { MetadataRoute } from 'next';
import { siteUrl } from '@/lib/metadata';

/**
 * Robots.txt generator — accessible at GET /robots.txt.
 *
 * Allows all crawlers on public content and disallows API, auth, and
 * admin routes. Includes a Sitemap pointer using NEXT_PUBLIC_APP_URL.
 */
export default function robots(): MetadataRoute.Robots {
  const base = siteUrl();

  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/api/', '/auth/'],
    },
    sitemap: `${base}/sitemap.xml`,
  };
}
