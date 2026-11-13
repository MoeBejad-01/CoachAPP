import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { markPaid } from '../data/actions';
import { formatMoney, fullName } from '../data/selectors';
import { useAppState } from '../data/store';
import { Avatar, Empty, useToast } from '../components/ui';
import { useT } from '../i18n';
import { addDays, daysBetween, fmtDay, todayISO } from '../lib/dates';

type Filter = 'all' | 'due' | 'overdue';
const COLS = 'minmax(220px, 2fr) minmax(200px, 1.6fr) 110px 110px 150px 110px 120px';

export function BillingPage() {
  const state = useAppState();
  const t = useT();
  const toast = useToast();
  const [filter, setFilter] = useState<Filter>('all');
  const today = todayISO();

  const rows = useMemo(() => state.trainees
    .filter((tr) => tr.status !== 'inactive' || !tr.membership.paid)
    .map((tr) => {
      const days = daysBetween(today, tr.membership.renewsOn);
      const status: 'paid' | 'due' | 'overdue' = !tr.membership.paid ? (tr.status === 'inactive' || days < 0 ? 'overdue' : 'due') : days <= 7 ? 'due' : 'paid';
      return { tr, days, status };
    })
    .sort((a, b) => a.tr.membership.renewsOn.localeCompare(b.tr.membership.renewsOn)), [state.trainees, today]);

  const monthly = state.trainees
    .filter((tr) => tr.status === 'active' || tr.status === 'onboarding')
    .reduce((n, tr) => n + (tr.membership.cycle === 'quarterly' ? tr.membership.price / 3 : tr.membership.price), 0);
  const overdue = rows.filter((r) => r.status === 'overdue');
  const upcoming = rows.filter((r) => r.tr.membership.renewsOn >= today && r.tr.membership.renewsOn <= addDays(today, 14));
  const shown = rows.filter((r) => filter === 'all' || r.status === filter);
  const FILTERS: [Filter, string][] = [['all', t('common.all')], ['due', t('billing.dueSoon')], ['overdue', t('common.overdue')]];

  return (
    <>
      <header className="page-head">
        <div className="stack">
          <h1 className="page-title">{t('nav.billing')}</h1>
          <p className="muted">{t('billing.subtitle')}</p>
        </div>
      </header>

      <section className="kpis" aria-label={t('billing.summary')}>
        <div className="kpi"><span className="kpi-label">{t('billing.mrr')}</span><span className="kpi-value">{formatMoney(monthly)}</span><span className="kpi-sub">{t('billing.mrrSub')}</span></div>
        <div className="kpi"><span className="kpi-label">{t('billing.renewing')}</span><span className="kpi-value">{upcoming.length}</span><span className="kpi-sub">{t('billing.expected', { v: formatMoney(upcoming.reduce((n, r) => n + r.tr.membership.price, 0)) })}</span></div>
        <button type="button" className="kpi" onClick={() => setFilter('overdue')}><span className="kpi-label">{t('common.overdue')}</span><span className="kpi-value" style={{ color: overdue.length ? 'var(--warn)' : undefined }}>{overdue.length}</span><span className="kpi-sub">{t('billing.outstanding', { v: formatMoney(overdue.reduce((n, r) => n + r.tr.membership.price, 0)) })}</span></button>
      </section>

      <section className="card" aria-label={t('billing.memberships')}>
        <div className="card-head">
          <h2 className="card-title">{t('billing.memberships')}</h2>
          <div className="pills">
            {FILTERS.map(([f, label]) => (
              <button key={f} type="button" className={`pill${filter === f ? ' on' : ''}`} aria-pressed={filter === f} onClick={() => setFilter(f)}>{label}</button>
            ))}
          </div>
        </div>
        <div className="table-scroll">
          <div style={{ minWidth: 1000 }}>
            <div className="dg-head" style={{ gridTemplateColumns: COLS }}>
              <span>{t('roster.colTrainee')}</span><span>{t('billing.plan')}</span><span>{t('billing.price')}</span><span>{t('billing.cycle')}</span><span>{t('billing.renews')}</span><span>{t('roster.colStatus')}</span><span />
            </div>
            {shown.map(({ tr, days, status }) => (
              <div key={tr.id} className="dg-row" style={{ gridTemplateColumns: COLS }}>
                <span className="row" style={{ gap: 10, minWidth: 0 }}><Avatar trainee={tr} size={30} /><Link to={`/trainees/${tr.id}`} className="ellipsis" style={{ color: 'var(--ink)', fontWeight: 500 }}>{fullName(tr)}</Link></span>
                <span className="ellipsis" style={{ color: 'var(--ink-2)' }}>{t(`tier.${tr.tier}`)}</span>
                <span className="mono small">{formatMoney(tr.membership.price)}</span>
                <span style={{ color: 'var(--ink-2)' }}>{t(`cycle.${tr.membership.cycle}`)}</span>
                <span style={{ color: 'var(--ink-2)' }}>{fmtDay(tr.membership.renewsOn)}{days >= 0 && days <= 7 && <span className="xs faint"> · {days === 0 ? t('common.todayLower') : t('billing.inDays', { n: days })}</span>}</span>
                <span>{status === 'paid' ? <span className="chip ok">{t('billing.paid')}</span> : status === 'due' ? <span className="chip accent">{t('billing.dueSoon')}</span> : <span className="chip warn">{t('common.overdue')}</span>}</span>
                <span>{status !== 'paid' && <button type="button" className="btn sm" onClick={() => { markPaid(tr.id); toast(t('billing.recorded', { name: tr.firstName })); }}>{t('billing.markPaid')}</button>}</span>
              </div>
            ))}
            {shown.length === 0 && <Empty>{t('billing.nothing')}</Empty>}
          </div>
        </div>
      </section>
    </>
  );
}
