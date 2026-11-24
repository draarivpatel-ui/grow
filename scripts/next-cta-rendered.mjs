// Writes bench/next-cta-rendered.json: the rendered home page, for the GEL next-cta guard (rendered mode).
// Run `bun scripts/next-cta-rendered.mjs` after changing the hero markup; test/next-cta.test.js fails if it is stale.
import { writeFileSync } from 'node:fs';
import { page } from '../src/page.js';
export const entries = () => [{ page: '/', html: page({}) }];
if (import.meta.main) writeFileSync(new URL('../bench/next-cta-rendered.json', import.meta.url), JSON.stringify({ entries: entries() }, null, 2) + '\n');
