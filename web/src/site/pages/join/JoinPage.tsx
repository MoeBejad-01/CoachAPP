// /join/<coach>?plan=<id>: where "Join" on a coach's page leads. Visitors
// without an account are sent to sign up (or log in) and come back here; then
// they fill in the intake form and send the request to the coach. What the
// coach does with it comes later.

import { useEffect, useMemo, useState } from 'react';
import { Link, Navigate, useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Icon } from '../../../components/Icon';
import { useI18n } from '../../../i18n';
import { CoachCtx, makeCoachKit, useCoach } from '../../coach/kit';
import type { CoachProfile } from '../../coach/types';
import { Barbell } from '../../components/Barbell';
import { SiteShell } from '../../components/SiteShell';
import { LanguageSwitch, ThemeToggle } from '../../components/Toggles';
import { Button } from '../../components/ui';
import { getSession, logOut, type Session } from '../../services/auth';
import { coachPageUrl, getCoachProfile } from '../../services/coachProfiles';
import { findJoinRequest, loadDraft, type JoinRequest } from '../../services/joinRequests';
import { CoachAvatar } from '../coach/Hero';
import { NotFoundPage } from '../NotFoundPage';
import { IntakeForm, STEP_PLATES, blankDraft, draftFromAnswers, type IntakeDraft } from './IntakeForm';
import '../../coach.css';
import '../../join.css';

type Load = { status: 'loading' } | { status: 'missing' } | { status: 'ok'; profile: CoachProfile };

export function JoinPage() {
  const { coach = '' } = useParams();
  const [params] = useSearchParams();
  const location = useLocation();
  const { t, lang } = useI18n();
  const [load, setLoad] = useState<Load>({ status: 'loading' });
  const session = getSession();

  useEffect(() => {
    let live = true;
    getCoachProfile(coach).then((profile) => {
      if (live) setLoad(profile ? { status: 'ok', profile } : { status: 'missing' });
    });
    return () => { live = false; };
  }, [coach]);

  const kit = useMemo(
    () => (load.status === 'ok' ? makeCoachKit(load.profile, lang, t, { owner: false, update: () => false }) : null),
    [load, lang, t],
  );

  useEffect(() => {
    if (!kit) return;
    const before = document.title;
    document.title = `${t('site.join.docTitle', { name: kit.name })} · Coach HQ`;
    return () => { document.title = before; };
  }, [kit, t]);

  if (load.status === 'missing') return <NotFoundPage />;
  if (!kit) return <SiteShell className="jn"><main id="main" className="cp-loading" /></SiteShell>;

  const p = kit.p;
  const known = [...p.plans, ...p.programs].some((x) => x.id === params.get('plan'));
  const plan = known ? params.get('plan')! : '';
  if (!session) {
    const next = encodeURIComponent(location.pathname + location.search);
    const query = `coach=${encodeURIComponent(p.id)}${plan ? `&plan=${encodeURIComponent(plan)}` : ''}&next=${next}`;
    return <Navigate to={`/signup?${query}`} replace />;
  }

  return (
    <CoachCtx.Provider value={kit}>
      <SiteShell className="jn">
        <JoinTop />
        <main id="main" tabIndex={-1} className="jn-main">
          <div className="s-container">
            {session.role === 'coach' ? <CoachAccount query={location.search} /> : <JoinFlow session={session} plan={plan} />}
          </div>
        </main>
      </SiteShell>
    </CoachCtx.Provider>
  );
}

function JoinTop() {
  const { t } = useI18n();
  const { p, name, first } = useCoach();
  return (
    <header className="jn-top">
      <div className="s-container jn-top-in">
        <Link to={coachPageUrl(p)} className="jn-back" aria-label={t('site.join.backToCoach', { name: first })}>
          <Icon name="chevronLeft" size={18} strokeWidth={2} />
          <CoachAvatar size={34} />
          <span>
            <small>{t('site.join.joining')}</small>
            <b>{name}</b>
          </span>
        </Link>
        <div className="jn-tools">
          <Link to="/" className="s-nav-link jn-home">{t('site.nav.homeLink')}</Link>
          <LanguageSwitch />
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}

function JoinFlow({ session, plan }: { session: Session; plan: string }) {
  const { p } = useCoach();
  const [sent, setSent] = useState<JoinRequest | null>(() => findJoinRequest(p.id, session.accountId));
  const [editing, setEditing] = useState<IntakeDraft | null>(null);

  if (sent && !editing) {
    return <Sent request={sent} onEdit={() => setEditing({ ...draftFromAnswers(sent.answers), planId: plan || sent.answers.planId })} />;
  }

  // Pick up an unfinished draft; a plan chosen on the coach's page wins over the draft's.
  const saved = loadDraft<IntakeDraft>(p.id, session.accountId);
  const initial = editing ?? { ...blankDraft(session.name, '', plan), ...saved, ...(plan ? { planId: plan } : {}) };
  return (
    <IntakeForm accountId={session.accountId} email={session.email} initial={initial}
      onSent={(r) => { setEditing(null); setSent(r); window.scrollTo({ top: 0, behavior: 'instant' }); }} />
  );
}

/** After sending (or on a later visit): the request is with the coach. */
function Sent({ request, onEdit }: { request: JoinRequest; onEdit: () => void }) {
  const { t } = useI18n();
  const { p, first, numLocale } = useCoach();
  const when = new Intl.DateTimeFormat(numLocale, { day: 'numeric', month: 'long', hour: 'numeric', minute: '2-digit' }).format(new Date(request.sentAt));
  return (
    <section className="s-card jn-sent" aria-labelledby="jn-sent-title" role="status">
      <div className="jn-sent-bar">
        <Barbell plates={STEP_PLATES} loaded={STEP_PLATES.length} label={t('site.join.progressLabel', { n: STEP_PLATES.length, total: STEP_PLATES.length })} />
        <span className="jn-sent-badge"><Icon name="check" size={26} strokeWidth={2.75} /></span>
      </div>
      <h1 id="jn-sent-title">{t('site.join.sent.title', { name: first })}</h1>
      <p className="jn-sent-when">{t('site.join.sent.when', { date: when })}</p>
      <ol className="jn-next">
        {(['site.join.next1', 'site.join.next2', 'site.join.next3'] as const).map((k, i) => (
          <li key={k}><span>{i + 1}</span>{t(k, { name: first })}</li>
        ))}
      </ol>
      <div className="jn-sent-actions">
        <Link to={coachPageUrl(p)} className="s-btn s-btn--primary s-btn--lg">{t('site.join.backToCoach', { name: first })}</Link>
        <Button variant="ghost" size="lg" onClick={onEdit}>{t('site.join.edit')}</Button>
      </div>
    </section>
  );
}

/** Join requests come from trainee accounts; a coach who lands here can switch. */
function CoachAccount({ query }: { query: string }) {
  const { t } = useI18n();
  const navigate = useNavigate();
  const { p, first } = useCoach();
  return (
    <section className="s-card jn-sent jn-coach" aria-labelledby="jn-coach-title">
      <span className="s-ico s-ico--brand"><Icon name="user" size={22} /></span>
      <h1 id="jn-coach-title">{t('site.join.coachTitle')}</h1>
      <p className="jn-sent-when">{t('site.join.coachBody', { name: first })}</p>
      <div className="jn-sent-actions">
        <Button size="lg" onClick={() => { logOut(); navigate(`/join/${encodeURIComponent(p.handle)}${query}`, { replace: true }); }}>
          {t('site.join.switch')}
        </Button>
        <Link to={coachPageUrl(p)} className="s-btn s-btn--ghost s-btn--lg">{t('site.join.backToCoach', { name: first })}</Link>
      </div>
    </section>
  );
}
