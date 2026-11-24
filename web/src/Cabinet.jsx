import {useCallback, useEffect, useState} from 'react';
import {HStack, VStack} from '@astryxdesign/core/Layout';
import {Card} from '@astryxdesign/core/Card';
import {Badge} from '@astryxdesign/core/Badge';
import {Button} from '@astryxdesign/core/Button';
import {Icon} from '@astryxdesign/core/Icon';
import {Text, Heading} from '@astryxdesign/core/Text';
import {Banner} from '@astryxdesign/core/Banner';
import {TextInput} from '@astryxdesign/core/TextInput';
import {SegmentedControl, SegmentedControlItem} from '@astryxdesign/core/SegmentedControl';
import {
  ArrowTopRightOnSquareIcon, ArrowRightIcon, BookmarkIcon, LinkIcon, MagnifyingGlassIcon, PlusIcon, TrashIcon, CheckIcon, BriefcaseIcon,
  ChatBubbleLeftRightIcon, ListBulletIcon, SparklesIcon,
} from '@heroicons/react/24/outline';
import {Logo} from './logos.jsx';

// The cabinet at /me in the Astryx look: your sites, the people talking about the problem each one solves, where you listed it.
const ic = (I) => <Icon icon={I} size="sm" />;
const GH_LOGIN = /^[A-Za-z0-9][A-Za-z0-9-]{0,38}$/;
const withScheme = (t) => { const v = String(t || '').trim(); return v && !/^[a-z][a-z0-9+.-]*:\/\//i.test(v) ? 'https://' + v : v; };
const ago = (t) => { const m = Math.round((Date.now() - t) / 60000); return m < 60 ? m + ' min ago' : m < 1440 ? Math.round(m / 60) + ' h ago' : Math.round(m / 1440) + ' d ago'; };
const host = (u) => {
  try {
    const x = new URL(u), h = x.host.replace(/^(www|mobile)[.]/, ''), p = x.pathname.split('/').filter(Boolean);
    if (/^(x|twitter)[.]com$/.test(h) && p[0]) return '@' + p[0] + ' on X';
    if (h === 'bsky.app' && p[0] === 'profile' && p[1]) return '@' + p[1] + ' on Bluesky';
    return x.host;
  } catch { return String(u); }
};
function toast(t) {
  const n = document.createElement('div'); n.textContent = t; n.setAttribute('role', 'status');
  Object.assign(n.style, {position: 'fixed', left: '50%', bottom: '24px', transform: 'translateX(-50%)', background: '#111', color: '#fff', padding: '9px 16px', borderRadius: '999px', fontSize: '13px', zIndex: 99});
  document.body.append(n); setTimeout(() => n.remove(), 1700);
}
async function api(path, body) {
  const r = await fetch(path, body ? {method: 'POST', headers: {'content-type': 'application/json'}, body: JSON.stringify(body)} : {});
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j.error || 'Something went wrong.');
  return j;
}

function Who({me}) {
  if (me.user) {
    return (
      <HStack gap={2} align="center" wrap="wrap">
        <Text type="supporting" color="secondary">Signed in as</Text>
        {/* The org bar (flisk.si/assets/bar.js) reads the login from [data-flisk-login]: the element's whole text must be the login. */}
        <span className="who-am" {...(GH_LOGIN.test(String(me.user.login)) ? {'data-flisk-login': ''} : {})}>{me.user.login}</span>
        <Button label="Sign out" size="sm" variant="secondary" href="/auth/out" />
      </HStack>
    );
  }
  if (me.signIn) {
    return (
      <HStack gap={2} align="center" wrap="wrap">
        <Text type="supporting" color="secondary">Kept in this browser.</Text>
        <Button label="Start free with GitHub" size="sm" variant="primary" href="/auth/start?utm_source=grow&utm_medium=cta&utm_campaign=free-key" icon={ic(ArrowRightIcon)} />
        <Text type="supporting" color="secondary">No card. Free to start.</Text>
      </HStack>
    );
  }
  return <Text type="supporting" color="secondary">Kept in this browser.</Text>;
}

function Panel({title, sub, icon, children}) {
  return (
    <Card><VStack gap={3}>
      <VStack gap={1}>
        <HStack gap={2} align="center">{icon && <Icon icon={icon} size="md" />}<Heading level={3}>{title}</Heading></HStack>
        {sub && <Text type="supporting" color="secondary">{sub}</Text>}
      </VStack>
      {children}
    </VStack></Card>
  );
}

function Leads({id, d, reload, refresh}) {
  const s = d.site;
  const [kw, setKw] = useState(s.keywords || '');
  const [filter, setFilter] = useState('new');
  const [busy, setBusy] = useState(false);
  useEffect(() => setKw(s.keywords || ''), [s.keywords]);
  const listenNow = async () => {
    setBusy(true);
    try { const j = await api('/api/sites/' + id + '/listen', {}); toast(j.next ? 'Looked recently. Next look in ' + j.next + ' min.' : j.added + ' new posts'); setFilter('new'); await reload(); refresh(); } catch (e) { toast(e.message); }
    setBusy(false);
  };
  const saveKw = async () => { try { const j = await api('/api/sites/' + id + '/keywords', {keywords: kw}); setKw(j.keywords); toast('Saved'); listenNow(); } catch (e) { toast(e.message); } };
  const mark = (l, status) => async () => { try { await api('/api/leads', {site: id, url: l.url, status}); await reload(); refresh(); } catch (e) { toast(e.message); } };
  const counts = {new: 0, replied: 0, skip: 0};
  d.leads.forEach((l) => { counts[l.status] = (counts[l.status] || 0) + 1; });
  const shown = d.leads.filter((l) => l.status === filter);
  return (
    <Panel title="People talking about it" icon={ChatBubbleLeftRightIcon}
      sub="Posts from the last 30 days on Hacker News, Bluesky and GitHub that use your phrases. Open one, answer as yourself, then mark it.">
      <HStack gap={2} wrap="wrap" align="end">
        <div style={{flex: 1, minWidth: 220}}><TextInput label="Search phrases, comma separated" isLabelHidden value={kw} onChange={setKw} startIcon={ic(MagnifyingGlassIcon)} /></div>
        <Button label="Save phrases" variant="secondary" onClick={saveKw} />
        <Button label={busy ? 'Looking…' : 'Find people now'} variant="primary" isDisabled={busy} onClick={listenNow} icon={ic(MagnifyingGlassIcon)} />
        <Button label="Search Reddit" variant="secondary" href={d.reddit} target="_blank" icon={<Logo name="reddit" url="https://reddit.com" size={16} />} />
      </HStack>
      <Text type="supporting" color="secondary">{s.listened ? 'Last looked ' + ago(s.listened) + '.' : 'Not looked yet.'}</Text>
      <div><SegmentedControl label="Show posts" value={filter} onChange={setFilter}>
        {[['new', 'New'], ['replied', 'Replied'], ['skip', 'Skipped']].map(([k, label]) => <SegmentedControlItem key={k} value={k} label={label + ' ' + (counts[k] || 0)} />)}
      </SegmentedControl></div>
      {!shown.length && <Card variant="subtle"><Text color="secondary">{filter === 'new' ? 'No new posts. Press Find people now, or try wider phrases.' : 'Nothing here yet.'}</Text></Card>}
      {shown.map((l) => (
        <Card key={l.url} variant="subtle"><HStack gap={3} align="start" wrap="wrap" style={{opacity: l.status === 'new' ? 1 : 0.6}}>
          <VStack gap={1} style={{width: 130, flex: 'none'}}>
            <HStack gap={2} align="center"><Logo name={l.source} url={l.url} size={18} /><Text weight="semibold">{l.source}</Text></HStack>
            <Text type="supporting" color="secondary">{ago(l.at)}</Text>
          </VStack>
          <VStack gap={1} style={{flex: 1, minWidth: 220}}>
            {l.title && <Text weight="semibold">{l.title}</Text>}
            <Text color="secondary" style={{overflowWrap: 'anywhere'}}>{l.text}</Text>
            {l.author_url ? <Text type="supporting"><a href={l.author_url} target="_blank" rel="noopener">{l.author}</a></Text> : <Text type="supporting" color="secondary">{l.author}</Text>}
          </VStack>
          <VStack gap={2} style={{flex: 'none'}}>
            <Button label="Open and reply" size="sm" variant="primary" href={l.url} target="_blank" icon={ic(ArrowTopRightOnSquareIcon)} />
            {l.status !== 'replied' && <Button label="Mark replied" size="sm" variant="secondary" icon={ic(CheckIcon)} onClick={mark(l, 'replied')} />}
            {l.status !== 'skip' && <Button label="Skip" size="sm" variant="ghost" onClick={mark(l, 'skip')} />}
            {l.status !== 'new' && <Button label="Back to new" size="sm" variant="ghost" onClick={mark(l, 'new')} />}
          </VStack>
        </HStack></Card>
      ))}
    </Panel>
  );
}

function ListingRow({id, p, cur}) {
  const [status, setStatus] = useState(cur.status);
  const [link, setLink] = useState(cur.link || '');
  const save = async (st, lk) => { try { await api('/api/listings', {site: id, place: p.name, status: st, link: lk.trim()}); toast('Saved'); } catch (e) { toast(e.message); } };
  return (
    <Card variant="subtle"><HStack gap={3} align="center" wrap="wrap">
      <HStack gap={2} align="center" style={{flex: '1 1 180px', minWidth: 0}}>
        <Logo name={p.name} url={p.url} size={18} />
        <a href={cur.link || p.url} target="_blank" rel="noopener" title={p.why} style={{fontWeight: 600}}>{p.name}</a>
        {status === 'live' && <Badge label="Live" variant="green" />}
      </HStack>
      <select className="cab-select" aria-label={'Status on ' + p.name} value={status} onChange={(e) => { setStatus(e.target.value); save(e.target.value, link); }}>
        <option value="todo">To do</option><option value="submitted">Submitted</option><option value="live">Live</option>
      </select>
      <div style={{flex: '2 1 220px', minWidth: 0}}>
        <TextInput label={'Listing link on ' + p.name} isLabelHidden value={link} onChange={setLink} onBlur={() => save(status, link)} placeholder="Link to your listing" startIcon={ic(LinkIcon)} />
      </div>
    </HStack></Card>
  );
}

function Site({id, me, refresh, onGone}) {
  const [d, setD] = useState(null);
  const [err, setErr] = useState('');
  const reload = useCallback(async () => { try { setD(await api('/api/sites/' + id + '/leads')); setErr(''); } catch (e) { setErr(e.message); } }, [id]);
  useEffect(() => { setD(null); reload(); }, [reload]);
  if (err) return <Banner status="error" title={err} />;
  if (!d) return <Text color="secondary">Loading…</Text>;
  const s = d.site;
  const have = {}; d.listings.forEach((x) => { have[x.place] = x; });
  const postJobs = async (ev) => { try { const j = await api('/api/sites/' + id + '/jobs', {}); toast(j.note || j.posted.length + ' jobs posted'); reload(); } catch (e) { toast(e.message); } };
  const remove = async () => { if (!confirm('Remove ' + host(s.url) + ' and its saved posts and listings?')) return; try { await api('/api/sites/' + id + '/delete', {}); onGone(); } catch (e) { toast(e.message); } };
  return (
    <VStack gap={4}>
      <Leads id={id} d={d} reload={reload} refresh={refresh} />
      <Panel title="Where you listed it" icon={ListBulletIcon}
        sub="Each place a buyer might find you. Find people now also looks for your listings on Hacker News, SaaSHub, Toolradar, Uneed and DevHunt and marks them Live. For the rest, submit, then set the status and paste the link.">
        {me.listings.map((p) => <ListingRow key={id + p.name + (have[p.name]?.status || '') + (have[p.name]?.link || '')} id={id} p={p} cur={have[p.name] || {status: 'todo', link: ''}} />)}
      </Panel>
      <Panel title="Get it done for you" icon={BriefcaseIcon}
        sub="Posts the checks a bot really does to jobs.flisk.si: can AI search find your site, and how good is your README (when the site links its GitHub repo). A bot takes them within about 5 minutes. Free and public.">
        <div><Button label="Post as jobs" variant="primary" icon={ic(BriefcaseIcon)} onClick={postJobs} /></div>
        {(d.jobs || []).map((j) => (
          <Card key={j.link} variant="subtle"><HStack gap={2} align="center" justify="space-between" wrap="wrap">
            <a href={j.link} target="_blank" rel="noopener" style={{fontWeight: 600}}>{j.title}</a>
            <Text type="supporting" color="secondary">posted {ago(j.at)}</Text>
          </HStack></Card>
        ))}
      </Panel>
      <Panel title="This site" icon={SparklesIcon}>
        <HStack gap={2} wrap="wrap">
          <Button label="Open the site" variant="secondary" href={s.url} target="_blank" icon={ic(ArrowTopRightOnSquareIcon)} />
          {s.plan_id ? <Button label="Its growth plan" variant="secondary" href={'/p/' + s.plan_id} /> : <Button label="Make its growth plan" variant="secondary" href={'/?url=' + encodeURIComponent(s.url)} />}
          <Button label="Remove from cabinet" variant="ghost" icon={ic(TrashIcon)} onClick={remove} />
        </HStack>
      </Panel>
    </VStack>
  );
}

export default function Cabinet() {
  const [me, setMe] = useState(null);
  const [err, setErr] = useState('');
  const [cur, setCur] = useState(new URLSearchParams(location.search).get('site') || '');
  const [url, setUrl] = useState('');
  const [st, setSt] = useState({text: '', bad: false});
  const load = useCallback(async (pick) => {
    try {
      const j = await api('/api/me'); setMe(j); setErr('');
      setCur((c) => { const want = pick || c; return j.sites.find((s) => s.id === want) ? want : (j.sites[0] ? j.sites[0].id : ''); });
    } catch (e) { setErr(e.message); }
  }, []);
  useEffect(() => { document.title = 'My cabinet · Flisk Grow'; load(); }, [load]);
  const pickSite = (id) => { setCur(id); history.replaceState(null, '', '/me?site=' + id); };
  const add = async (e) => {
    e.preventDefault(); setSt({text: 'Adding…', bad: false});
    try {
      const j = await api('/api/sites', {url: withScheme(url)}); setUrl(''); setSt({text: '', bad: false});
      pickSite(j.id); await load(j.id);
      api('/api/sites/' + j.id + '/listen', {}).then(() => load(j.id)).catch(() => {});
    } catch (x) { setSt({text: x.message, bad: true}); }
  };
  return (
    <div className="page"><VStack gap={4}>
      <HStack gap={3} align="start" justify="space-between" wrap="wrap">
        <VStack gap={1} style={{flex: 1, minWidth: 260}}>
          <Heading level={1}>My cabinet</Heading>
          <Text color="secondary">Your sites, the people talking about the problem each one solves, and where you listed it. Nothing is posted for you.</Text>
        </VStack>
        {me && <Who me={me} />}
      </HStack>
      {err && <Banner status="error" title={err} />}
      <form onSubmit={add}><HStack gap={2} align="end" wrap="wrap">
        <div style={{flex: 1, minWidth: 240}}><TextInput label="Link to add" isLabelHidden type="url" value={url} onChange={setUrl} placeholder="https://your-site.com" startIcon={ic(LinkIcon)} /></div>
        <Button label="Add site" variant="primary" type="submit" icon={ic(PlusIcon)} />
      </HStack></form>
      {st.text && <Banner status={st.bad ? 'error' : 'info'} title={st.text} />}
      {me && me.sites.length > 0 && <div><SegmentedControl label="Your sites" value={cur} onChange={pickSite}>
        {me.sites.map((s) => <SegmentedControlItem key={s.id} value={s.id} label={host(s.url) + (s.new_leads ? ' · ' + s.new_leads : '')} />)}
      </SegmentedControl></div>}
      {me && !me.sites.length && <Card variant="subtle"><HStack gap={2} align="center"><Icon icon={BookmarkIcon} size="md" /><Text color="secondary">No sites yet. Add the link to something you made.</Text></HStack></Card>}
      {me && cur && <Site key={cur} id={cur} me={me} refresh={() => load()} onGone={() => { setCur(''); history.replaceState(null, '', '/me'); load(''); }} />}
    </VStack></div>
  );
}
