// A post draft shown as a Reddit post: vote column that reacts, title and text typing in.
import {useState} from 'react';
import {Logo} from '../logos.jsx';
import {Caret, Foot, Shell, useSeen, useTyping} from './shared.jsx';

export function RedditCard({id, done, toggle, rewrite, post, actions}) {
  const [ref, seen] = useSeen();
  const [vote, setVote] = useState(1);
  const title = useTyping(post.title || '', seen);
  const body = useTyping(post.body || '', seen && title.finished);
  return (
    <Shell kind="reddit" id={id} done={done} seen={seen} innerRef={ref} rewrite={rewrite}>
      <div className="rd-wrap">
        <div className="rd-votes">
          <button type="button" className={vote === 1 ? 'up' : ''} onClick={() => setVote(vote === 1 ? 0 : 1)} aria-label="Upvote" tabIndex={-1}>▲</button>
          <b>{vote ? 1 : 0}</b>
          <button type="button" className={vote === -1 ? 'down' : ''} onClick={() => setVote(vote === -1 ? 0 : -1)} aria-label="Downvote" tabIndex={-1}>▼</button>
        </div>
        <div className="rd-main">
          <div className="rd-meta"><Logo name="Reddit" size={18} /><b>r/yourcommunity</b><span className="rc-mute">· Posted by u/you · now</span></div>
          <h4 className="rd-title">{title.shown}<Caret on={title.typing} /></h4>
          <p className="rd-body">{body.shown}<Caret on={body.typing} /></p>
          <div className="rd-foot rc-mute" aria-hidden="true"><span>💬 0 comments</span><span>↗ Share</span><span>🔖 Save</span></div>
        </div>
      </div>
      <Foot id={id} done={done} toggle={toggle} title={post.title || ''} actions={actions} />
    </Shell>
  );
}
