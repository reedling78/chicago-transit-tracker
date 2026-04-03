# Articles Section + Article-Writer Skill

## Context

The site has CTA and Metra transit pages but no editorial content layer. The user wants to add an articles/blog section where transit guides and stories can be published as MDX files, and a local Claude Code skill to guide the article-writing workflow from research to disk write.

---

## Packages to Install

```bash
npm install next-mdx-remote gray-matter rehype-raw
npm install --save-dev @tailwindcss/typography
```

- `gray-matter` — YAML frontmatter parsing
- `next-mdx-remote` (specifically `next-mdx-remote/rsc`) — compiles MDX in RSC at build time; compatible with `output: 'export'`
- `rehype-raw` — allows raw HTML inside MDX (required for `<span data-term>` in the article skill)
- `@tailwindcss/typography` — generates `prose` classes; loaded via `@plugin` in CSS (Tailwind v4 style)

No changes to `next.config.ts` — `next-mdx-remote` is a library, not a build plugin.

---

## Implementation Sequence

### Phase 1 — Foundation

1. **Install packages** (above)

2. **Create directories with `.gitkeep`:**
   - `content/articles/.gitkeep`
   - `public/images/articles/.gitkeep`

3. **Create `app/lib/articles.ts`** — server-only data access layer
   - `getAllArticles()` — reads `content/articles/`, parses frontmatter with `gray-matter`, filters `draft: true` and `publishAt` in the future, returns sorted `ArticleListItem[]`
   - `getArticle(slug)` — reads single MDX file, returns `Article` with raw `content` string
   - `BUILD_TIME = new Date()` at module scope (consistent timestamp across one build)

   Types:

   ```ts
   interface ArticleFrontmatter {
     title
     description
     date
     author
     authorImage
     image
     ogImage
     twitterImage
     slug
     category
     tags: string[]
     featuredPost: boolean
     draft: boolean
     publishAt: string
     imageVersion: number
     references: { label; url }[]
   }
   type ArticleListItem = Omit<ArticleFrontmatter & { content?: never }, 'content'>
   interface Article extends ArticleFrontmatter {
     content: string
   }
   ```

4. **Add typography plugin to `app/globals.css`:**
   ```css
   @import 'tailwindcss';
   @plugin '@tailwindcss/typography';
   ```
   (Insert after the `@import` line, before the `@custom-variant` rule)

### Phase 2 — Pages

5. **Create `app/articles/page.tsx`** — article list
   - Static `export const metadata` with title, description, openGraph, twitter (follows SEO rules)
   - Featured article card at top (uses `article.ogImage`, title, description, date, category)
   - Remaining articles as `LinkCard` instances with date + category in meta slot
   - Falls back gracefully if no `featuredPost: true` exists

6. **Create `app/articles/[slug]/page.tsx`** — individual article
   - `generateStaticParams` → `getAllArticles().map(a => ({ slug: a.slug }))`
   - `generateMetadata` → article-specific `title`, `description`, `ogImage`, `twitterImage`, `type: 'article'`
   - Renders: `Breadcrumb` → `PageHeader` → hero img with `?v={imageVersion}` → MDX body
   - MDX body:

     ```tsx
     import { compileMDX } from 'next-mdx-remote/rsc'
     import rehypeRaw from 'rehype-raw'

     const { content } = await compileMDX({
       source: article.content,
       options: { parseFrontmatter: false, mdxOptions: { rehypePlugins: [rehypeRaw] } },
     })
     // Wrap in: <div className="prose dark:prose-invert max-w-none mt-8">{content}</div>
     ```

### Phase 3 — Integration

7. **Update `app/components/Navbar.tsx`** — add to `navLinks`:

   ```ts
   { href: '/articles', label: 'Articles' }
   ```

8. **Update `app/sitemap.ts`** — per the STANDING RULE, add:
   ```ts
   import { getAllArticles } from './lib/articles'
   // in sitemap():
   { url: `${baseUrl}/articles`, changeFrequency: 'weekly', priority: 0.8 },
   ...getAllArticles().map(a => ({
     url: `${baseUrl}/articles/${a.slug}`,
     lastModified: new Date(a.date),
     changeFrequency: 'monthly' as const,
     priority: 0.7,
   }))
   ```

### Phase 4 — Skill File

9. **Create `.claude/skills/article-writer/SKILL.md`** — project-local Claude Code skill
   - Frontmatter: `name: article-writer`, `description: Use when writing a new article for the /articles section…`
   - Body: the full 6-step article-writer workflow (as provided by the user, adapted for this project)
   - Step 1: collect subject, angle, source URLs (fetch each)
   - Step 2: metadata (title/description/slug/category/tags together; then author/authorImage/date/publishAt/featuredPost one at a time)
   - Step 3: article plan (angle, sections, tone, 700–1000 words) — wait for approval
   - Step 4: write article body (prose-first, no emoji, `<span data-term class="underline decoration-dotted">`) — present for review, no files yet
   - Step 5: process images (check ImageMagick, run cp + 2 magick commands for 1200×630 og and 1200×675 twitter)
   - Step 6: write to disk (generate imageVersion as `Date.now()`, show full MDX, handle featuredPost conflicts, write `content/articles/{slug}/{slug}.mdx`)

---

## Critical Files

| File                                     | Status | Note                                            |
| ---------------------------------------- | ------ | ----------------------------------------------- |
| `app/lib/articles.ts`                    | New    | Central data layer — everything depends on this |
| `app/articles/page.tsx`                  | New    | List page                                       |
| `app/articles/[slug]/page.tsx`           | New    | Detail page with generateStaticParams           |
| `app/globals.css`                        | Modify | Add `@plugin "@tailwindcss/typography"`         |
| `app/components/Navbar.tsx`              | Modify | Add Articles nav link                           |
| `app/sitemap.ts`                         | Modify | Add /articles routes (STANDING RULE)            |
| `.claude/skills/article-writer/SKILL.md` | New    | Local skill file                                |

---

## Verification

1. `npm run build` — should succeed with zero TypeScript errors
2. Write a test article at `content/articles/test/test.mdx` with `draft: true` → build should not expose it at `/articles/test`
3. Set `draft: false` → rebuild, confirm it appears at `/articles/test` and in sitemap output
4. Check `/articles` list page renders the article card
5. Check dark mode: article prose inverts correctly
6. Confirm `<span data-term>` in MDX body renders with dotted underline (validates `rehype-raw`)
7. Run `npm run lint` — no lint errors
