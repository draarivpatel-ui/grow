import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { checkPlaceLinks, cleanLink, cleanPlaces, splitPlace, tieFinds } from '../src/links.js';
import { cleanPlan, mainText, siteFacts } from '../src/plan.js';

// A plan the live site made for https://flisk.sh on 2026-11-24, before this fix: glued subreddits, a bare
// /comments/ link, and an r/SideProject "find them" on an email to a DevOps engineer.
const FLISK = JSON.parse(readFileSync(new URL('./fixtures/flisk-sh-plan.json', import.meta.url), 'utf8'));

// A link a page may show: one subreddit, no spaces, no list path with nothing after it.
const bad = (u) => /%20|\s/.test(u) || /\/comments\/?$/.test(u) || (/reddit[.]com/.test(u) && !/^https:\/\/www[.]reddit[.]com\/(r\/[A-Za-z0-9_]{2,21}\/(comments\/[a-z0-9]+\/)?)?$/i.test(u));
const MAKER = /r\/SideProject|Show HN|r\/startups|Indie ?Hackers|under 50 stars/i;

describe('place links', () => {
  test('one subreddit per link, no encoded spaces, no bare /comments/', () => {
    expect(cleanLink('https://www.reddit.com/r/devops/comments/')).toBe('https://www.reddit.com/r/devops/');
    expect(cleanLink('https://reddit.com/r/devops/comments/1abcde/some_title')).toBe('https://www.reddit.com/r/devops/comments/1abcde/');
    expect(cleanLink('https://old.reddit.com/r/docker/top/')).toBe('https://www.reddit.com/r/docker/');
    expect(cleanLink('https://www.reddit.com/r/docker%20and%20r/k8s')).toBe('');
    expect(cleanLink('https://www.reddit.com/r/docker/%20and%20https://www.reddit.com/r/k8s/')).toBe('');
    expect(cleanLink('https://example.com/forum%20page')).toBe('');
    expect(cleanLink('javascript:alert(1)')).toBe('');
    expect(cleanLink('https://forum.example.com/t/')).toBe('https://forum.example.com/');
    expect(cleanLink('https://stackoverflow.com/questions/tagged/devops')).toBe('https://stackoverflow.com/questions/tagged/devops');
  });

  test('glued subreddits are split into one place each', () => {
    const why = 'Containers';
    for (const url of ['https://www.reddit.com/r/docker%20and%20r/k8s', 'https://www.reddit.com/r/docker/%20and%20https://www.reddit.com/r/k8s/', '']) {
      const out = splitPlace({ name: 'Containerization subreddits r/docker and r/k8s', why, url });
      expect(out.map((p) => p.url)).toEqual(['https://www.reddit.com/r/docker/', 'https://www.reddit.com/r/k8s/']);
      expect(out.map((p) => p.name)).toEqual(['r/docker', 'r/k8s']);
    }
    // A subreddit named only in the name gets its link.
    expect(splitPlace({ name: 'r/selfhosted', why, url: '' })[0].url).toBe('https://www.reddit.com/r/selfhosted/');
  });

  test('the same link is not listed twice', () => {
    const out = cleanPlaces([{ name: 'DevOps', why: 'a', url: 'https://www.reddit.com/r/devops/' }, { name: 'DevOps tools', why: 'b', url: 'https://www.reddit.com/r/devops/comments/' }]);
    expect(out).toHaveLength(1);
  });

  test('a page that is gone loses its link; a site that refuses servers keeps it', async () => {
    const places = [{ name: 'a', url: 'https://gone.example/' }, { name: 'b', url: 'https://refuses.example/' }, { name: 'c', url: 'https://nohost.example/' }, { name: 'd', url: 'https://www.reddit.com/r/devops/' }];
    const calls = [];
    const f = async (u) => { calls.push(u); if (u.includes('nohost')) throw new TypeError('fetch failed'); return new Response('', { status: u.includes('gone') ? 404 : 403 }); };
    await checkPlaceLinks(places, f);
    expect(places.map((p) => p.url)).toEqual(['', 'https://refuses.example/', '', 'https://www.reddit.com/r/devops/']);
    expect(calls).not.toContain('https://www.reddit.com/r/devops/'); // Reddit blocks servers; a clean subreddit link is kept
  });
});

describe('find them fits the reader', () => {
  test('a maker community is not offered for DevOps buyers', () => {
    const places = [{ name: 'r/devops', why: 'DevOps engineers talk tooling', url: 'https://www.reddit.com/r/devops/' }, { name: 'Stack Overflow devops tag', why: 'questions', url: 'https://stackoverflow.com/questions/tagged/devops' }];
    const emails = tieFinds([{ to: 'a DevOps engineer', find: 'people asking how to get first users on r/SideProject', subject: 's', body: 'b' }], places, 'DevOps engineers who run microservices.');
    expect(emails[0].find).not.toMatch(MAKER);
    expect(emails[0].place).toBe(0);
  });

  test('for makers, maker communities stay', () => {
    const places = [{ name: 'r/SideProject', why: 'makers', url: 'https://www.reddit.com/r/SideProject/' }];
    const [e] = tieFinds([{ to: 'a solo developer', find: 'people posting on r/SideProject', subject: 's', body: 'b' }], places, 'Solo developers who just launched a side project.');
    expect(e).toMatchObject({ find: 'people posting on r/SideProject', place: 0 });
  });
});

describe('the flisk.sh fixture plan', () => {
  const plan = cleanPlan(FLISK);
  test('has no invalid links', () => {
    expect(FLISK.places.some((p) => bad(p.url))).toBe(true); // the fixture really had them
    for (const p of plan.places) if (p.url) expect(bad(p.url)).toBe(false);
    expect(plan.places.map((p) => p.url)).toContain('https://www.reddit.com/r/docker/');
    expect(plan.places.map((p) => p.url)).toContain('https://www.reddit.com/r/k8s/');
    expect(new Set(plan.places.map((p) => p.url).filter(Boolean)).size).toBe(plan.places.filter((p) => p.url).length);
  });

  test('has no audience mismatch', () => {
    expect(plan.buyers).toMatch(/DevOps/);
    for (const e of plan.emails) {
      expect(`${e.to} ${e.find}`).not.toMatch(MAKER);
      expect(plan.places[e.place]?.url).toBeTruthy();
    }
    expect(plan.emails.length).toBeGreaterThanOrEqual(4);
    const sec = plan.emails.find((e) => /r\/DevOps/.test(e.find));
    expect(plan.places[sec.place].url).toBe('https://www.reddit.com/r/devops/');
  });
});

describe('site facts', () => {
  const html = `<html><head><title>Flisk: run your app</title><meta property="og:site_name" content="Flisk CLI"></head><body>
    <header><nav><ul><li><a href="/x">Products menu item one</a></li></ul></nav></header>
    <main><h1>Run your whole app on your laptop with one command.</h1><ul><li>An MCP server lets Claude Code start it</li></ul><p>Free, MIT.</p></main>
    <footer>Footer words here</footer></body></html>`;
  test('the model sees the page, not its menus', () => {
    const t = mainText(html);
    expect(t).toContain('Run your whole app');
    expect(t).not.toContain('Products menu');
    expect(t).not.toContain('Footer words');
    expect(siteFacts(html, 'Flisk: run your app')).toEqual({ name: 'Flisk CLI', headings: ['Run your whole app on your laptop with one command.'], features: ['An MCP server lets Claude Code start it'] });
  });
});
