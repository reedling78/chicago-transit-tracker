// app/sitemap.ts
import type { MetadataRoute } from 'next'

export const dynamic = 'force-static'

const baseUrl = 'https://chicago-transit-tracker.com'

// STANDING RULE: Add every new page to this array when it is created.
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 1,
    },
    {
      url: `${baseUrl}/about`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/search`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.9,
    },
  ]
}
