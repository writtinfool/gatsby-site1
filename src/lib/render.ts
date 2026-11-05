/**
 * Markdown → designed HTML.
 *
 * The source markdown files are kept byte-for-byte as delivered. Everything
 * here is presentation only: it wraps existing nodes in layout containers,
 * adds CSS classes, and re-draws the ASCII box diagrams as HTML cards using
 * exactly the words inside the boxes. No copy is added, removed, or reworded.
 */
import fs from 'node:fs';
import path from 'node:path';
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';
import remarkRehype from 'remark-rehype';
import rehypeRaw from 'rehype-raw';
import rehypeStringify from 'rehype-stringify';
import { visit, SKIP } from 'unist-util-visit';
import { toString } from 'hast-util-to-string';
import { h } from 'hastscript';
import YAML from 'yaml';
import { zohoForms, site } from '../config/site';

type Node = any;

const CONTENT_DIR = path.join(process.cwd(), 'src', 'content', 'pages');

export interface RenderedPage {
  slug: string;
  title: string;
  description: string;
  html: string;
}

/* ------------------------------------------------------------------ */
/* Front matter                                                        */
/* ------------------------------------------------------------------ */

const unescapeMd = (s: string) => s.replace(/\\(.)/g, '$1');

function splitFrontMatter(raw: string): { data: Record<string, string>; body: string } {
  // Standard YAML front matter: ---\n...\n---\n
  const std = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n/);
  if (std) {
    try {
      const data = YAML.parse(std[1]);
      if (data && typeof data === 'object' && typeof data.title === 'string') {
        return { data, body: raw.slice(std[0].length) };
      }
    } catch {
      /* fall through to the tolerant parser */
    }
  }
  // Tolerant form (as exported in the landing-page file): an opening ---
  // followed by a single line `## title: "..." description: "..."`.
  const loose = raw.match(
    /^---\r?\n\s*(?:#+\s*)?title:\s*"((?:[^"\\]|\\.)*)"\s*description:\s*"((?:[^"\\]|\\.)*)"[ \t]*\r?\n/,
  );
  if (loose) {
    return {
      data: { title: unescapeMd(loose[1]), description: unescapeMd(loose[2]) },
      body: raw.slice(loose[0].length),
    };
  }
  return { data: {}, body: raw };
}

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

const isEl = (n: Node, tag?: string | string[]) =>
  n && n.type === 'element' && (!tag || (Array.isArray(tag) ? tag.includes(n.tagName) : n.tagName === tag));

const isBlank = (n: Node) => n.type === 'text' && !n.value.trim();

const addClass = (n: Node, ...cls: string[]) => {
  n.properties ||= {};
  const cur = n.properties.className || [];
  n.properties.className = [...(Array.isArray(cur) ? cur : [cur]), ...cls];
};

const hasDescendant = (n: Node, test: (d: Node) => boolean): boolean => {
  let found = false;
  visit(n, (d: Node) => {
    if (found) return SKIP;
    if (d !== n && test(d)) found = true;
  });
  return found;
};

const EMOJI_LEAD = /^\s*((?:\p{Extended_Pictographic}|\p{Emoji_Presentation})(?:️|‍(?:\p{Extended_Pictographic}))*)\s*/u;

/* ------------------------------------------------------------------ */
/* ASCII box diagrams → HTML cards (same words, no additions)          */
/* ------------------------------------------------------------------ */

interface Col { header: string[]; body: string[] }

function parseBoxDiagram(text: string): Col[][] | null {
  if (!/[┌└│]/.test(text)) return null;
  const groups: Col[][] = [];
  let cur: Col[] | null = null;
  let phase: 'header' | 'body' = 'header';
  for (const line of text.split('\n')) {
    if (line.includes('┌')) {
      cur = [];
      phase = 'header';
      continue;
    }
    if (!cur) continue;
    if (line.includes('├')) {
      phase = 'body';
      continue;
    }
    if (line.includes('└')) {
      groups.push(cur);
      cur = null;
      continue;
    }
    if (!line.includes('│')) continue;
    const parts = line.split('│');
    for (let i = 1, c = 0; i < parts.length; i += 2, c++) {
      const cell = parts[i].trim();
      cur[c] ||= { header: [], body: [] };
      if (cell) cur[c][phase].push(cell);
    }
  }
  return groups.length ? groups : null;
}

function renderCol(col: Col, idx: number): Node {
  const title = col.header.join(' ');
  const bullets = col.body.filter((l) => l.startsWith('•'));
  const prose = col.body.filter((l) => !l.startsWith('•'));
  const children: Node[] = [h('h4.dia-title', title)];
  if (bullets.length) {
    children.push(h('ul.dia-list', bullets.map((b) => h('li', b.replace(/^•\s*/, '')))));
  }
  if (prose.length) children.push(h('p.dia-text', prose.join(' ')));
  return h('div.dia-card', { dataIndex: String(idx) }, children);
}

function renderDiagram(groups: Col[][]): Node {
  // Tree: a single root box followed by a row of boxes.
  if (groups.length === 2 && groups[0].length === 1) {
    const root = groups[0][0];
    return h('figure.diagram.diagram-tree', [
      h('div.dia-root', [h('span', root.header.concat(root.body).join(' '))]),
      h('div.dia-branches', { ariaHidden: 'true' }, groups[1].map(() => h('span'))),
      h(`div.dia-row.cols-${groups[1].length}`, groups[1].map(renderCol)),
    ]);
  }
  const row = groups.flat();
  const kind = row.length === 2 ? 'diagram-compare' : 'diagram-row';
  return h(`figure.diagram.${kind}`, [h(`div.dia-row.cols-${row.length}`, row.map(renderCol))]);
}

/* ------------------------------------------------------------------ */
/* rehype plugin: layout                                                */
/* ------------------------------------------------------------------ */

function rehypeNewtreeLayout() {
  return (tree: Node) => {
    // 1. Fix host-less links like "http:///placement" → "/placement".
    visit(tree, 'element', (n: Node) => {
      if (n.tagName !== 'a') return;
      const href: string = n.properties?.href || '';
      const m = href.match(/^https?:\/\/\/(.*)$/);
      if (m) n.properties.href = '/' + m[1].replace(/^\/+/, '');
      const fixed: string = n.properties.href;
      if (fixed.startsWith('/')) addClass(n, 'cta-link');
      if (fixed.startsWith('tel:')) addClass(n, 'tel-link');
      if (fixed.startsWith('mailto:')) addClass(n, 'mail-link');
    });

    // 2. Diagrams.
    visit(tree, 'element', (n: Node, i: number | undefined, parent: Node) => {
      if (n.tagName !== 'pre' || !parent || i === undefined) return;
      const groups = parseBoxDiagram(toString(n));
      if (!groups) return;
      parent.children[i] = renderDiagram(groups);
      return SKIP;
    });

    // 3. Zoho form slots.
    visit(tree, 'element', (n: Node) => {
      if (n.tagName !== 'div') return;
      const id = n.properties?.id;
      if (typeof id !== 'string' || !id.startsWith('zoho-')) return;
      const cfg = zohoForms[id];
      addClass(n, 'form-slot');
      if (cfg?.src) {
        n.children.push(
          h('iframe', {
            src: cfg.src,
            title: cfg.title,
            loading: 'lazy',
            style: `width:100%;border:0;min-height:${cfg.height ?? 720}px`,
          }),
        );
      } else {
        addClass(n, 'is-empty');
      }
    });

    // 4. Element-level classes.
    visit(tree, 'element', (n: Node) => {
      if (n.tagName === 'ul') {
        const items = n.children.filter((c: Node) => isEl(c, 'li'));
        const allBold = items.length > 0 && items.every((li: Node) => {
          const first = li.children.find((c: Node) => !isBlank(c));
          const inner = isEl(first, 'p') ? first.children.find((c: Node) => !isBlank(c)) : first;
          return isEl(inner, 'strong');
        });
        const contact = items.length > 0 && items.every((li: Node) =>
          hasDescendant(li, (d) => isEl(d, 'a') && /^(tel:|mailto:)/.test(d.properties?.href || '')),
        );
        if (contact) addClass(n, 'contact-list');
        else if (allBold) addClass(n, 'feature-list', `count-${items.length}`);
      }
      if (n.tagName === 'ol') addClass(n, 'steps');
      if (n.tagName === 'table') {
        const heads = [] as string[];
        visit(n, 'element', (c: Node) => {
          if (c.tagName === 'th') heads.push(toString(c).trim());
        });
        visit(n, 'element', (row: Node) => {
          if (row.tagName !== 'tr') return;
          row.children.filter((c: Node) => isEl(c, 'td')).forEach((td: Node, k: number) => {
            td.properties.dataLabel = heads[k] || '';
          });
        });
      }
      if (n.tagName === 'p') {
        const kids = n.children.filter((c: Node) => !isBlank(c));
        // "👉 [Link →](...)" on its own line
        if (kids.length === 2 && kids[0].type === 'text' && isEl(kids[1], 'a') && EMOJI_LEAD.test(kids[0].value)) {
          addClass(n, 'cta-row');
        }
        if (toString(n).trim() === ' ') addClass(n, 'spacer');
        // signature block: **Name** / *Title* / **Company** separated by <br>
        if (isEl(kids[0], 'strong') && kids.some((k: Node) => isEl(k, 'br')) && kids.some((k: Node) => isEl(k, 'em'))) {
          addClass(n, 'signature');
        }
      }
      if (n.tagName === 'h3' || n.tagName === 'h2') {
        const first = n.children[0];
        if (first?.type === 'text') {
          const m = first.value.match(EMOJI_LEAD);
          if (m) {
            first.value = first.value.slice(m[0].length);
            n.children.unshift(h('span.h-icon', { ariaHidden: 'true' }, m[1]));
            addClass(n, 'has-icon');
          }
        }
      }
    });

    // 5. Split the document into sections at each <hr>.
    const sections: Node[][] = [[]];
    for (const c of tree.children) {
      if (isEl(c, 'hr')) sections.push([]);
      else if (!isBlank(c)) sections[sections.length - 1].push(c);
    }

    let tone = 0;
    tree.children = sections
      .filter((s) => s.length)
      .flatMap((kids, idx) => {
        const cls = ['block'];
        const has = (fn: (n: Node) => boolean) => kids.some((k) => fn(k) || hasDescendant(k, fn));

        if (idx === 0 && kids.some((k) => isEl(k, 'h1'))) {
          cls.push('hero');
          // Headline, subtitles and call button stay on the photo; the longer
          // intro paragraphs move to a section right below it, so the photo
          // (and its tree) is not covered by text.
          const onPhoto = kids.filter((k) => isEl(k, ['h1', 'h2', 'h3']));
          const intro = kids.filter((k) => !isEl(k, ['h1', 'h2', 'h3']));
          const hero = h('section', { className: cls }, [
            h('div.container.hero-inner', [
              ...onPhoto,
              h('a.btn.btn-hero', { href: site.phoneTollFree.href }, [h('svg', { viewBox: '0 0 24 24', ariaHidden: 'true' }, [h('path', { fill: 'currentColor', d: 'M6.6 10.8a15.1 15.1 0 0 0 6.6 6.6l2.2-2.2c.3-.3.7-.4 1-.2 1.1.4 2.3.6 3.6.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1A17 17 0 0 1 3 4c0-.6.4-1 1-1h3.5c.6 0 1 .4 1 1 0 1.2.2 2.4.6 3.6.1.3 0 .7-.2 1l-2.3 2.2Z' })]), site.phoneTollFree.label]),
            ]),
          ]);
          if (!intro.length) return hero;
          tone++;
          return [hero, h('section.block.intro', [h('div.container', intro)])];
        }

        // Merge consecutive blockquotes into one callout.
        if (kids.every((k) => isEl(k, 'blockquote'))) {
          cls.push('callout');
          const inner = kids.flatMap((k) => k.children.filter((c: Node) => !isBlank(c)));
          return h('section', { className: cls }, [h('div.container', [h('blockquote.callout-card', inner)])]);
        }

        const isContact = has((n) => isEl(n, 'a') && /^tel:/.test(n.properties?.href || '')) && has((n) => isEl(n, 'div') && (n.properties?.className || []).includes('form-slot'));
        if (isContact) {
          cls.push('contact');
          const formSlots = kids.filter((k) => isEl(k, 'div') && (k.properties?.className || []).includes('form-slot'));
          const main = kids.filter((k) => !formSlots.includes(k) && !(k.properties?.className || []).includes('spacer'));
          const formReady = formSlots.some((f) => !(f.properties.className || []).includes('is-empty'));
          return h('section', { className: cls, id: 'contact' }, [
            h('div.container', [
              h(`div.contact-card${formReady ? '.with-form' : ''}`, [
                h('div.contact-main', main),
                h('div.contact-form', formSlots),
              ]),
            ]),
          ]);
        }

        cls.push(tone++ % 2 ? 'tone-b' : 'tone-a');

        // Group each h3 with the content that follows it into a panel.
        const out: Node[] = [];
        let panel: Node[] | null = null;
        const flush = () => {
          if (panel) {
            const [head, ...rest] = panel;
            out.push(h('article.panel', [h('div.panel-head', [head]), h('div.panel-body', rest)]));
          }
          panel = null;
        };
        for (const k of kids) {
          if (isEl(k, 'h3')) {
            flush();
            panel = [k];
          } else if (isEl(k, 'h2')) {
            flush();
            out.push(k);
          } else if (panel) panel.push(k);
          else out.push(k);
        }
        flush();
        const panels = out.filter((k) => isEl(k, 'article'));
        const rest = out.filter((k) => !isEl(k, 'article'));
        const body = panels.length ? [...rest, h('div.panels', panels)] : rest;
        return h('section', { className: cls }, [h('div.container', body)]);
      });
  };
}

/* ------------------------------------------------------------------ */

const processor = unified()
  .use(remarkParse)
  .use(remarkGfm)
  .use(remarkRehype, { allowDangerousHtml: true })
  .use(rehypeRaw)
  .use(rehypeNewtreeLayout)
  .use(rehypeStringify);

export async function renderPage(slug: string): Promise<RenderedPage> {
  const raw = fs.readFileSync(path.join(CONTENT_DIR, `${slug}.md`), 'utf8');
  const { data, body } = splitFrontMatter(raw);
  const html = String(await processor.process(body));
  return { slug, title: data.title ?? '', description: data.description ?? '', html };
}
