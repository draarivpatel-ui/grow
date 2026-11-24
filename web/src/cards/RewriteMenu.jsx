// The sparkle button on top of every card. It opens a small menu of changes (more polite, more formal, add links ...)
// and a box for anything else; the card shimmers while the model rewrites it.
// The menu is position:fixed inside the card (no portal), so the card must not have a transform or filter while it is open.
import {useEffect, useRef, useState} from 'react';

export const TWEAKS = [
  ['polite', 'Make it more polite'],
  ['formal', 'Make it more formal'],
  ['friendly', 'Make it friendlier'],
  ['shorter', 'Make it shorter'],
  ['direct', 'Make it more direct'],
  ['links', 'Add links'],
  ['question', 'End with a question'],
  ['confident', 'Make it more confident'],
];

export function RewriteMenu({busy, onPick}) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({top: 0, left: 0});
  const [text, setText] = useState('');
  const btn = useRef(null);
  const show = () => {
    const r = btn.current.getBoundingClientRect();
    setPos({top: Math.min(r.bottom + 6, innerHeight - 330), left: Math.max(8, Math.min(r.right - 260, innerWidth - 268))});
    setOpen(true);
  };
  useEffect(() => {
    if (!open) return undefined;
    const close = () => setOpen(false);
    const key = (e) => { if (e.key === 'Escape') { close(); btn.current?.focus(); } };
    const away = (e) => { if (!e.target.closest?.('.rw-pop') && !btn.current?.contains(e.target)) close(); };
    addEventListener('keydown', key); addEventListener('mousedown', away); addEventListener('scroll', close, true); addEventListener('resize', close);
    return () => { removeEventListener('keydown', key); removeEventListener('mousedown', away); removeEventListener('scroll', close, true); removeEventListener('resize', close); };
  }, [open]);
  const pick = (tweak, note) => { setOpen(false); setText(''); onPick(tweak, note); };
  return (
    <>
      <button ref={btn} type="button" className={'rw-btn' + (busy ? ' busy' : '')} aria-label="Rewrite with AI" aria-haspopup="menu" aria-expanded={open} title="Rewrite with AI" disabled={busy} onClick={() => (open ? setOpen(false) : show())}>✨</button>
      {open && (
        <div className="rw-pop" role="menu" style={{top: pos.top, left: pos.left}}>
          <div className="rw-title">Rewrite with AI</div>
          {TWEAKS.map(([k, label]) => <button key={k} type="button" role="menuitem" onClick={() => pick(k)}>{label}</button>)}
          <form onSubmit={(e) => { e.preventDefault(); if (text.trim()) pick('', text.trim()); }}>
            <input value={text} onChange={(e) => setText(e.target.value)} maxLength={120} placeholder="Or ask for something else" aria-label="Ask for another change" />
            <button type="submit" disabled={!text.trim()}>Go</button>
          </form>
        </div>)}
    </>
  );
}
