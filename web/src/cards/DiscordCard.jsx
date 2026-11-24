// A post draft shown as a Discord message in a channel: dark bubble, name, the text typing in.
import {Logo} from '../logos.jsx';
import {Caret, Foot, Rich, Shell, useSeen, useTyping} from './shared.jsx';

export function DiscordCard({id, done, toggle, rewrite, post, actions}) {
  const [ref, seen] = useSeen();
  const text = (post.title ? post.title + '\n\n' : '') + (post.body || '');
  const t = useTyping(text, seen);
  return (
    <Shell kind="discord" id={id} done={done} seen={seen} innerRef={ref} rewrite={rewrite}>
      <div className="dc-chan"><Logo name="Discord" size={16} /><b># show-your-stack</b></div>
      <div className="dc-msg">
        <span className="rc-avatar dc-av">You</span>
        <div><div className="dc-name"><b>You</b><span>Today</span></div><p className="dc-text"><Rich text={t.shown} /><Caret on={t.typing} /></p></div>
      </div>
      <Foot id={id} done={done} toggle={toggle} title={post.title || ''} actions={actions} />
    </Shell>
  );
}
