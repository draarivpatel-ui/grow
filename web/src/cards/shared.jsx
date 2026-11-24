// Pieces every card uses: typing animation, enter-when-seen, the Done footer, links coloured like the network colours them.
import {useEffect, useRef, useState} from 'react';
import {CheckboxInput} from '@astryxdesign/core/CheckboxInput';
import {RewriteMenu} from './RewriteMenu.jsx';
import './cards.css';

export const calm = () => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

// True once the card has scrolled into view (and stays true), so the animation plays when a person can see it.
export function useSeen() {
  const ref = useRef(null);
  const [seen, setSeen] = useState(calm());
  useEffect(() => {
    if (seen || !ref.current) return undefined;
    if (typeof IntersectionObserver !== 'function') { setSeen(true); return undefined; }
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setSeen(true); io.disconnect(); } }, {threshold: 0.25});
    io.observe(ref.current);
    return () => io.disconnect();
  }, [seen]);
  return [ref, seen];
}

// Types `text` out once `go` is true: about 1.5 seconds whatever the length. Shows everything at once for reduced motion.
export function useTyping(text, go) {
  const t = String(text || '');
  const [n, setN] = useState(calm() ? t.length : 0);
  useEffect(() => {
    if (!go || n >= t.length) return undefined;
    const step = Math.max(1, Math.ceil(t.length / 70));
    const id = setTimeout(() => setN((c) => Math.min(t.length, c + step)), 22);
    return () => clearTimeout(id);
  }, [go, n, t]);
  return {shown: t.slice(0, n), typing: go && n < t.length, finished: n >= t.length};
}

// Links, @names and #tags in the colour the network uses.
export function Rich({text}) {
  const parts = String(text || '').split(/(https?:\/\/\S+|\b[a-z0-9-]+\.[a-z]{2,}\/?\S*|[@#]\w+)/gi);
  return <>{parts.map((p, i) => (i % 2 ? <span key={i} className="rc-link">{p}</span> : p))}</>;
}

export const Caret = ({on}) => (on ? <span className="rc-caret" aria-hidden="true" /> : null);

// The card frame: fades up when seen, dims when ticked off.
export function Shell({kind, done, id, seen, innerRef, rewrite, children}) {
  return (
    <article ref={innerRef} className={'rc rc-' + kind + (seen ? ' in' : '') + (done.has(id) ? ' is-done' : '') + (rewrite ? ' has-menu' : '') + (rewrite?.busy ? ' is-busy' : '')}>
      {rewrite && <RewriteMenu busy={rewrite.busy} onPick={rewrite.onPick} />}
      {children}
    </article>
  );
}

export function Foot({id, done, toggle, title, actions}) {
  return (
    <div className="rc-foot">
      <div className="rc-actions">{actions}</div>
      <label className="rc-tick"><CheckboxInput label={'Done: ' + title} isLabelHidden value={done.has(id)} onChange={() => toggle(id)} /><span>Done</span></label>
    </div>
  );
}
