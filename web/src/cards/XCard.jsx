// A post draft shown as an X post: avatar, the text typing in, a character ring, and reply/repost/like icons that react.
import {useState} from 'react';
import {Logo} from '../logos.jsx';
import {Caret, Foot, Rich, Shell, useSeen, useTyping} from './shared.jsx';

const LIMIT = 280;

export function XCard({id, done, toggle, rewrite, post, actions}) {
  const [ref, seen] = useSeen();
  const [liked, setLiked] = useState(false);
  const text = post.body || post.title || '';
  const t = useTyping(text, seen);
  const used = Math.min(1, text.length / LIMIT);
  return (
    <Shell kind="x" id={id} done={done} seen={seen} innerRef={ref} rewrite={rewrite}>
      <div className="x-head">
        <span className="rc-avatar">You</span>
        <div className="x-who"><b>You</b><span className="rc-mute">@you · now</span></div>
        <Logo name="X" size={18} />
      </div>
      <p className="x-text"><Rich text={t.shown} /><Caret on={t.typing} /></p>
      <div className="x-icons" aria-hidden="true">
        <span>💬</span><span>🔁</span>
        <button type="button" className={'x-like' + (liked ? ' on' : '')} onClick={() => setLiked(!liked)} tabIndex={-1}>{liked ? '♥' : '♡'}</button>
        <span>📊</span>
        <span className="x-ring" title={text.length + ' of ' + LIMIT + ' characters'} style={{'--u': used, '--c': text.length > LIMIT ? '#f4212e' : '#1d9bf0'}} />
      </div>
      <Foot id={id} done={done} toggle={toggle} title={text.slice(0, 40)} actions={actions} />
    </Shell>
  );
}
