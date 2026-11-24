// An email draft shown as a Gmail compose window: the subject and the message type themselves in.
import {Caret, Foot, Shell, useSeen, useTyping} from './shared.jsx';

export function GmailCard({id, done, toggle, rewrite, email, actions}) {
  const [ref, seen] = useSeen();
  const subject = useTyping(email.subject, seen);
  const body = useTyping(email.body + (email.find ? '\n\nFind them: ' + email.find : ''), seen && subject.finished);
  return (
    <Shell kind="gmail" id={id} done={done} seen={seen} innerRef={ref} rewrite={rewrite}>
      <div className="gm-bar"><span>New Message</span></div>
      <div className="gm-row"><b>To</b>{email.to ? <span className="gm-chip">{email.to}</span> : <span className="rc-mute">someone who fits</span>}</div>
      <div className="gm-row"><b>Subject</b><span>{subject.shown}<Caret on={subject.typing} /></span></div>
      <div className="gm-body">{body.shown}<Caret on={body.typing} /></div>
      <Foot id={id} done={done} toggle={toggle} title={email.subject} actions={actions} />
    </Shell>
  );
}
