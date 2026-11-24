import { expect, test } from 'bun:test';
import { findListings } from '../src/found.js';

const pages = {
  'https://hn.algolia.com/api/v1/search?query=acme.dev&tags=story&typoTolerance=false&hitsPerPage=30': JSON.stringify({ hits: [
    { objectID: '7', title: 'Acme Corp sued', url: 'https://news.example/acme' },
    { objectID: '9', title: 'Show HN: Acme – another thing', url: 'https://github.com/acme/acme' },
    { objectID: '8', title: 'Show HN: Acme – fast local stacks', url: 'https://acme.dev/' },
  ] }),
  'https://www.saashub.com/acme': '<a href="https://acme.dev">acme.dev</a>',
  'https://toolradar.com/tools/acme-cli': 'Visit acme.dev',
  'https://devhunt.org/tool/acme': 'another acme, no domain here',
};
const fakeFetch = async (u) => (pages[u] !== undefined ? new Response(pages[u]) : new Response('', { status: 404 }));

test('finds Show HN and directory pages that name the domain', async () => {
  const out = await findListings('https://acme.dev', { fetch: fakeFetch });
  expect(out).toEqual([
    { place: 'Hacker News (Show HN)', link: 'https://news.ycombinator.com/item?id=8' },
    { place: 'SaaSHub', link: 'https://www.saashub.com/acme' },
    { place: 'Toolradar', link: 'https://toolradar.com/tools/acme-cli' },
  ]);
});

test('a site that is nowhere gives nothing', async () => {
  expect(await findListings('https://nobody.dev', { fetch: fakeFetch })).toEqual([]);
});

test('directory probes ignore other domains that contain the site name', async () => {
  const directoryPages = {
    'https://www.saashub.com/acme': '<a href="https://not-acme.dev">Another Acme</a>',
    'https://www.saashub.com/acme-cli': '<a href="https://WWW.ACME.DEV/docs">Acme</a>',
    'https://toolradar.com/tools/acme': 'Visit acme.dev.example for the other product.',
    'https://devhunt.org/tool/acme': 'Visit shop.acme.dev for a separate site.',
    'https://www.uneed.best/tool/acme': 'Our website is acme.dev.',
  };
  const f = async (u) => u in directoryPages ? new Response(directoryPages[u]) : new Response('', { status: 404 });
  expect(await findListings('https://acme.dev', { fetch: f })).toEqual([
    { place: 'SaaSHub', link: 'https://www.saashub.com/acme-cli' },
    { place: 'Uneed', link: 'https://www.uneed.best/tool/acme' },
  ]);
});

test('a Show HN with the same word but another site is not yours', async () => {
  const f = async (u) => new Response(String(u).includes('hn.algolia') ? JSON.stringify({ hits: [{ objectID: '1', title: 'Show HN: Pages', url: 'https://other.example/' }] }) : '', { status: String(u).includes('hn.algolia') ? 200 : 404 });
  expect(await findListings('https://pages.flisk.si', { fetch: f })).toEqual([]);
});
