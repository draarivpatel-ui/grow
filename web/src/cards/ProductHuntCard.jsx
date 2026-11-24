// A launch draft shown as a Product Hunt listing: icon, name, tagline typing in, and an upvote button that bounces.
import {useState} from 'react';
import {Logo} from '../logos.jsx';
import {Caret, Foot, Shell, useSeen, useTyping} from './shared.jsx';

export function ProductHuntCard({id, done, toggle, rewrite, post, actions}) {
  const [ref, seen] = useSeen();
  const [up, setUp] = useState(false);
  const title = useTyping(post.title || '', seen);
  const body = useTyping(post.body || '', seen && title.finished);
  return (
    <Shell kind="ph" id={id} done={done} seen={seen} innerRef={ref} rewrite={rewrite}>
      <div className="ph-wrap">
        <span className="ph-icon"><Logo name="Product Hunt" size={28} /></span>
        <div className="ph-main">
          <h4 className="ph-title">{title.shown}<Caret on={title.typing} /></h4>
          <p className="ph-tag">{body.shown}<Caret on={body.typing} /></p>
          <div className="ph-chips rc-mute" aria-hidden="true"><span>💬 0</span><span>Free</span></div>
        </div>
        <button type="button" className={'ph-up' + (up ? ' on' : '')} onClick={() => setUp(!up)} aria-label="Upvote" tabIndex={-1}><i>▲</i><b>{up ? 1 : 0}</b></button>
      </div>
      <Foot id={id} done={done} toggle={toggle} title={post.title || ''} actions={actions} />
    </Shell>
  );
}
