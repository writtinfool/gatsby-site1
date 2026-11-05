# Newtree Senior Transition Services — website

Static [Astro](https://astro.build) site deployed to **Cloudflare Pages**.

## Pages

| URL | Content file |
| --- | --- |
| `/` | `src/content/pages/index.md` (Main Landing Page) |
| `/placement` | `src/content/pages/placement.md` |
| `/real-estate` | `src/content/pages/real-estate.md` |
| `/downsizing` | `src/content/pages/downsizing.md` |
| `/for-professionals` | `src/content/pages/for-professionals.md` |

The markdown files are byte-for-byte copies of the approved source files.
**Edit copy only in those files.** All design is applied at build time by
`src/lib/render.ts` (sections, cards, diagrams redrawn as HTML from the
words inside the ASCII boxes, link fixes) and `src/styles/global.css`.
Nav, footer, and site settings live in `src/config/site.ts`.

## Zoho forms

Each page ends with a `<div id="zoho-…">` container. To turn a form on, paste
its Zoho Forms iframe URL into `zohoForms` in `src/config/site.ts`. Empty
entries are hidden, so the pages look complete without them.

## Develop

```sh
npm install
npm run dev       # http://localhost:4321
npm run build     # outputs to dist/
npm run preview
```

## Deploy on Cloudflare Pages

Connect this repository in Cloudflare → Workers & Pages → Create → Pages, then:

- **Framework preset:** Astro
- **Build command:** `npm run build`
- **Build output directory:** `dist`
- **Node version:** 22 (from `.node-version`)

Or from your machine: `npm run build && npx wrangler pages deploy dist`.

Once you have a custom domain, update `url` in `src/config/site.ts` and `site`
in `astro.config.mjs` (canonical URLs).
