import { useEffect, useRef, useState } from 'react';
import { Mail, X } from 'lucide-react';

export default function Newsletter({ open, onClose }) {
  const dialog = useRef(null);
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState(null);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [consent, setConsent] = useState(false);
  const [linkAction] = useState(() => {
    const hash = new URLSearchParams(window.location.hash.slice(1));
    const action = hash.get('newsletter');
    return ['confirm', 'unsubscribe'].includes(action) && hash.get('token')
      ? { action, token: hash.get('token') } : null;
  });
  useEffect(() => {
    if (!open) { dialog.current?.close(); return; }
    dialog.current?.showModal();
    const controller = new AbortController();
    fetch('/.netlify/functions/newsletter', { signal: controller.signal })
      .then(response => response.ok ? response.json() : Promise.reject())
      .then(setStatus).catch(() => { if (!controller.signal.aborted) setStatus({ enabled: false }); });
    return () => controller.abort();
  }, [open]);
  async function submit(event) {
    event.preventDefault(); setBusy(true); setMessage('');
    try {
      const response = await fetch('/.netlify/functions/newsletter', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(linkAction || { action: 'subscribe', email, consent }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || 'Please try again later.');
      setMessage(result.message); setEmail('');
      if (linkAction) history.replaceState(null, '', window.location.pathname + window.location.search);
    } catch (error) { setMessage(error.message || 'Couldn’t reach the subscription service. Please try again.'); }
    finally { setBusy(false); }
  }
  return <dialog ref={dialog} className="newsletter-dialog" aria-labelledby="newsletter-title" onCancel={onClose}>
    <button className="icon-button newsletter-close" onClick={onClose} aria-label="Close newsletter"><X size={20}/></button>
    <span className="newsletter-eyebrow"><Mail size={16}/> THE MORNING SIGNAL</span>
    <h2 id="newsletter-title">Your AI briefing.<br/><span>Fresh every morning.</span></h2>
    <p>Top headlines, significant launches, research and AI policy — from the preceding 24 hours, with original source links.</p>
    <div className="newsletter-schedule">DAILY · 8:00 AM · AMERICA/CHICAGO</div>
    <p className="newsletter-privacy">Email only. No account needed. Confirm your address to subscribe; unsubscribe from any edition. Your email is stored privately for this digest.</p>
    {!status ? <p role="status">Checking email delivery…</p> : !status.enabled ? <p className="newsletter-unavailable" role="status">Email subscriptions are not open yet. The sender connection is being set up. You can still read the live feed.</p> :
      <form onSubmit={submit}>
        {linkAction ? <p>{linkAction.action === 'confirm' ? 'Confirm your email subscription to Dhivi’s daily morning briefing.' : 'Stop the Dhivi morning briefing for this address.'}</p> : <>
          <label htmlFor="newsletter-email">Email address</label>
          <input id="newsletter-email" type="email" autoComplete="email" maxLength={254} required value={email} onChange={event => setEmail(event.target.value)} placeholder="you@example.com"/>
          <label className="newsletter-consent"><input type="checkbox" required checked={consent} onChange={event => setConsent(event.target.checked)}/> Send me Dhivi’s daily AI briefing by email.</label>
        </>}
        <button className="primary-button" disabled={busy}>{busy ? 'Connecting…' : linkAction ? linkAction.action === 'confirm' ? 'Confirm subscription' : 'Unsubscribe' : 'Get the morning signal'}</button>
      </form>}
    {message && <p className="newsletter-message" role="status">{message}</p>}
  </dialog>;
}
