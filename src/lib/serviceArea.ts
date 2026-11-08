/**
 * Service area from src/data/service-area.csv (exported from the
 * "Two-hour reach from Eureka" map). Edit the CSV to change the list.
 */
import fs from 'node:fs';
import path from 'node:path';

export interface Town { town: string; county: string; time: string; minutes: number; inRange: boolean }

function parseCsvLine(line: string): string[] {
  const out: string[] = []; let cur = ''; let q = false;
  for (const ch of line) {
    if (ch === '"') q = !q;
    else if (ch === ',' && !q) { out.push(cur); cur = ''; }
    else cur += ch;
  }
  out.push(cur);
  return out.map((s) => s.trim());
}

function toMinutes(t: string): number {
  const h = /(\d+)\s*hr/.exec(t); const m = /(\d+)\s*min/.exec(t);
  return (h ? +h[1] * 60 : 0) + (m ? +m[1] : 0);
}

export function loadTowns(): Town[] {
  const raw = fs.readFileSync(path.join(process.cwd(), 'src', 'data', 'service-area.csv'), 'utf8');
  return raw.split(/\r?\n/).slice(1).filter((l) => l.trim()).map((l) => {
    const [town, county, time, within] = parseCsvLine(l);
    return { town, county: county.replace(/,\s*CA$/, ''), time, minutes: toMinutes(time), inRange: /^yes/i.test(within) };
  });
}

/** Towns within ~2 hours, grouped by county (county order as listed below). */
export function townsByCounty() {
  const order = ['Humboldt County', 'Del Norte County', 'Trinity County', 'Mendocino County'];
  const towns = loadTowns().filter((t) => t.inRange);
  const counties = [...new Set([...order, ...towns.map((t) => t.county)])].filter((c) => towns.some((t) => t.county === c));
  return counties.map((county) => ({
    county,
    towns: towns.filter((t) => t.county === county).sort((a, b) => a.minutes - b.minutes || a.town.localeCompare(b.town)),
  }));
}
