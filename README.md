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

## Deploy on Cloudflare

The project is connected as a **Worker with static assets** (Workers & Pages →
Connect to Git). Settings → Build:

- **Root directory:** `/`
- **Build command:** `npm run build`
- **Deploy command:** `npx wrangler deploy` (the default)
- **Production branch:** `master`

`wrangler.toml` tells Cloudflare to upload `./dist`. The `name` in
`wrangler.toml` must match the Worker's name in the dashboard. Every push or
merge to `master` builds and deploys automatically.

### Custom domain: transitions.newtreecap.com

The site is configured for `https://transitions.newtreecap.com` (`url` in
`src/config/site.ts` and `site` in `astro.config.mjs`). In Cloudflare →
your Pages project → **Custom domains** → **Set up a domain**, enter
`transitions.newtreecap.com`. If newtreecap.com's DNS is on Cloudflare the
record is created for you; otherwise add a `CNAME` record named
`transitions` pointing to `<your-project>.pages.dev` at your DNS provider.
