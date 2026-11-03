import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { fullName, type RosterGroup, type TraineeStats } from '../data/selectors';
import type { Trainee } from '../data/types';
import { useT } from '../i18n';
import { fmtDay, fmtRelativeDay, todayISO } from '../lib/dates';
import { Icon } from './Icon';
import { Avatar, Bar, Empty, GroupChip } from './ui';

export type RosterFilter = 'all' | RosterGroup;
type Sort = 'activity' | 'name' | 'adherence' | 'joined';

const COLS = 'minmax(240px, 2.2fr) minmax(200px, 1.6fr) 140px 120px 120px 130px 24px';
const FILTERS: RosterFilter[] = ['all', 'active', 'attention', 'onboarding', 'paused', 'inactive'];

interface Props {
  trainees: Trainee[];
  stats: Map<string, TraineeStats>;
  filter: RosterFilter;
  onFilter: (f: RosterFilter) => void;
  query: string;
  limit?: number;
  showSort?: boolean;
}

export function Roster({ trainees, stats, filter, onFilter, query, limit, showSort }: Props) {
  const t = useT();
  const navigate = useNavigate();
  const [sort, setSort] = useState<Sort>('activity');

  const counts = useMemo(() => {
    const c: Record<RosterFilter, number> = { all: trainees.length, active: 0, attention: 0, onboarding: 0, paused: 0, inactive: 0 };
    for (const tr of trainees) {
      const g = stats.get(tr.id)!.group;
      c[g]++;
      if (g === 'attention') c.active++; // "Active" includes those who need attention
    }
    return c;
  }, [trainees, stats]);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = trainees.filter((tr) => {
      const g = stats.get(tr.id)!.group;
      const inFilter = filter === 'all' || g === filter || (filter === 'active' && g === 'attention');
      const hay = `${fullName(tr)} ${tr.program?.name ?? ''} ${tr.goals[0]?.label ?? ''} ${tr.email}`.toLowerCase();
      return inFilter && (!q || hay.includes(q));
    });
    const s = (tr: Trainee) => stats.get(tr.id)!;
    list.sort((a, b) => {
      switch (sort) {
        case 'name': return fullName(a).localeCompare(fullName(b));
        case 'adherence': return (s(a).adherence ?? 101) - (s(b).adherence ?? 101);
        case 'joined': return b.joinedAt.localeCompare(a.joinedAt);
        default: {
          const rank = (tr: Trainee) => (s(tr).group === 'attention' ? 0 : 1);
          return rank(a) - rank(b) || (s(b).lastLog?.date ?? '').localeCompare(s(a).lastLog?.date ?? '');
        }
      }
    });
    return list;
  }, [trainees, stats, filter, query, sort]);

  const shown = limit ? rows.slice(0, limit) : rows;
  const today = todayISO();

  return (
    <section className="card" aria-label={t('roster.title')}>
      <div className="card-head">
        <div className="row" style={{ alignItems: 'baseline', gap: 10 }}>
          <h2 className="card-title">{t('roster.title')}</h2>
          <span className="small muted">{t('roster.showing', { n: shown.length, total: rows.length })}</span>
        </div>
        <div className="row wrap">
          <div className="pills" role="group" aria-label={t('roster.filter')}>
            {FILTERS.map((f) => (
              <button key={f} type="button" className={`pill${filter === f ? ' on' : ''}`} aria-pressed={filter === f} onClick={() => onFilter(f)}>
                {f === 'all' ? t('common.all') : t(`group.${f}`)}<span className="count">{counts[f]}</span>
              </button>
            ))}
          </div>
          {showSort && (
            <select className="select" style={{ width: 190, height: 32, fontSize: 13 }} value={sort} onChange={(e) => setSort(e.target.value as Sort)} aria-label={t('roster.sortBy')}>
              <option value="activity">{t('roster.sortPriority')}</option>
              <option value="name">{t('roster.sortName')}</option>
              <option value="adherence">{t('roster.sortAdherence')}</option>
              <option value="joined">{t('roster.sortNewest')}</option>
            </select>
          )}
        </div>
      </div>
      <div className="table-scroll">
        <div style={{ minWidth: 940 }}>
          <div className="dg-head" style={{ gridTemplateColumns: COLS }}>
            <span>{t('roster.colTrainee')}</span><span>{t('roster.colProgram')}</span><span>{t('roster.colAdherence')}</span><span>{t('roster.colLast')}</span><span>{t('roster.colCheckin')}</span><span>{t('roster.colStatus')}</span><span />
          </div>
          {shown.map((tr) => {
            const s = stats.get(tr.id)!;
            const low = s.adherence !== null && s.adherence < 75;
            const overdue = tr.status === 'active' && s.missedCheckins > 0;
            const checkin = tr.status === 'paused' ? t('group.paused') : tr.status === 'inactive' ? '—' : overdue ? t('common.overdue') : s.nextCheckin === today ? t('common.today') : fmtDay(s.nextCheckin);
            return (
              <div key={tr.id} className="dg-row click" style={{ gridTemplateColumns: COLS }} onClick={() => navigate(`/coach/trainees/${tr.id}`)}>
                <div className="row" style={{ gap: 12, minWidth: 0 }}>
                  <Avatar trainee={tr} />
                  <div className="stack grow" style={{ gap: 2 }}>
                    <Link to={`/coach/trainees/${tr.id}`} style={{ color: 'var(--ink)', fontWeight: 500 }} onClick={(e) => e.stopPropagation()}>{fullName(tr)}</Link>
                    <span className="small muted ellipsis">{tr.goals[0]?.label ?? t('roster.noGoal')}</span>
                  </div>
                </div>
                <div className="stack" style={{ gap: 6, minWidth: 0 }}>
                  <span className="ellipsis">{tr.program?.name ?? t('roster.noProgram')}</span>
                  {tr.program && (
                    <span className="row xs faint">
                      <span style={{ width: 72, display: 'flex' }}><Bar tone="grey" pct={((s.week ?? 0) / tr.program.weeks) * 100} /></span>
                      {s.week ? t('common.weekOf', { w: s.week, n: tr.program.weeks }) : t('common.starts', { date: fmtDay(tr.program.startDate) })}
                    </span>
                  )}
                </div>
                <span className="row">
                  <span className="mono" style={{ width: 38, fontSize: 13, color: low ? 'var(--warn)' : undefined }}>{s.adherence === null ? '—' : `${s.adherence}%`}</span>
                  <Bar pct={s.adherence ?? 0} tone={low ? 'warn' : undefined} />
                </span>
                <span style={{ color: 'var(--ink-2)' }}>{fmtRelativeDay(s.lastLog?.date)}</span>
                <span style={{ color: overdue ? 'var(--warn)' : 'var(--ink-2)' }}>{checkin}</span>
                <span><GroupChip group={s.group} /></span>
                <span className="faint"><Icon name="chevron" size={16} /></span>
              </div>
            );
          })}
          {shown.length === 0 && <Empty>{t('roster.empty')}</Empty>}
        </div>
      </div>
      {limit && rows.length > limit && (
        <div className="card-foot">
          <span className="small muted">{t('roster.more', { n: rows.length - limit })}</span>
          <Link to="/coach/trainees" className="small">{t('roster.viewAll')}</Link>
        </div>
      )}
    </section>
  );
}
