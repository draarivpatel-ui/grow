// A post draft shown as a Hacker News listing: orange bar, upvote arrow, title with the site in grey.
import {useState} from 'react';
import {Logo} from '../logos.jsx';
import {Caret, Foot, Shell, useSeen, useTyping} from './shared.jsx';

export function HackerNewsCard({id, done, toggle, rewrite, post, plan, actions}) {
  const [ref, seen] = useSeen();
  const [up, setUp] = useState(false);
  const title = useTyping(post.title || '', seen);
  const body = useTyping(post.body || '', seen && title.finished);
  let site = '';
  try { site = new URL(plan.url).host.replace(/^www\./, ''); } catch { /* no site */ }
  return (
    <Shell kind="hn" id={id} done={done} seen={seen} innerRef={ref} rewrite={rewrite}>
      <div className="hn-bar"><Logo name="Hacker News" size={18} /><b>Hacker News</b><span>new | past | submit</span></div>
      <div className="hn-item">
        <button type="button" className={'hn-arrow' + (up ? ' on' : '')} onClick={() => setUp(!up)} aria-label="Upvote" tabIndex={-1}>▲</button>
        <div>
          <div className="hn-title">{title.shown}<Caret on={title.typing} />{site && <span className="hn-site"> ({site})</span>}</div>
          <div className="hn-sub">{up ? 2 : 1} point{up ? 's' : ''} by you just now | hide | 0 comments</div>
        </div>
      </div>
      {post.body && <p className="hn-comment">{body.shown}<Caret on={body.typing} /></p>}
      <Foot id={id} done={done} toggle={toggle} title={post.title || ''} actions={actions} />
    </Shell>
  );
}
