// A post draft shown as a Bluesky post, with the butterfly and the 300-character limit.
import {useState} from 'react';
import {Logo} from '../logos.jsx';
import {Caret, Foot, Rich, Shell, useSeen, useTyping} from './shared.jsx';

const LIMIT = 300;

export function BlueskyCard({id, done, toggle, rewrite, post, actions}) {
  const [ref, seen] = useSeen();
  const [liked, setLiked] = useState(false);
  const text = post.body || post.title || '';
  const t = useTyping(text, seen);
  return (
    <Shell kind="bsky" id={id} done={done} seen={seen} innerRef={ref} rewrite={rewrite}>
      <div className="x-head">
        <span className="rc-avatar bsky">You</span>
        <div className="x-who"><b>You</b><span className="rc-mute">@you.bsky.social · now</span></div>
        <Logo name="Bluesky" size={18} />
      </div>
      <p className="x-text"><Rich text={t.shown} /><Caret on={t.typing} /></p>
      <div className="x-icons" aria-hidden="true">
        <span>💬</span><span>🔁</span>
        <button type="button" className={'x-like' + (liked ? ' on' : '')} onClick={() => setLiked(!liked)} tabIndex={-1}>{liked ? '♥' : '♡'}</button>
        <span className="rc-mute">{text.length}/{LIMIT}</span>
      </div>
      <Foot id={id} done={done} toggle={toggle} title={text.slice(0, 40)} actions={actions} />
    </Shell>
  );
}
