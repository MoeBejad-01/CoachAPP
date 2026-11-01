import { useState } from 'react';
import { Link } from 'react-router-dom';
import { weekIndex, weekRange } from '../data/plan';
import { slotsFor } from '../data/selectors';
import { Icon } from '../components/Icon';
import { useT } from '../i18n';
import { addDays, dayOfWeek, fmtDow, fmtShort, todayISO } from '../lib/dates';
import { targetTiles } from './Today';
import { TabScreen, useTraineeApp } from './TraineeApp';

export function ProgramScreen() {
  const t = useT();
  const { trainee, logs, base } = useTraineeApp();
  const p = trainee.program;
  const today = todayISO();
  const current = p ? weekIndex(p, today) : 0;
  const [w, setW] = useState(current);
  const [open, setOpen] = useState<string | null>(null);

  if (!p) {
    return <TabScreen title={t('ta.tab.program')}><div className="ta-card ta-card-pad"><p className="small muted">{t('ta.program.none')}</p></div></TabScreen>;
  }
  const wk = p.plan[Math.min(w, p.plan.length - 1)];
  const range = weekRange(p, w);
  const slots = slotsFor(trainee);
  const dateOf = (i: number) => (slots[i] === undefined ? null : addDays(range.start, (slots[i] - dayOfWeek(range.start) + 7) % 7));
  const isCurrent = w === current && p.startDate <= today;

  return (
    <TabScreen title={p.name} sub={t('ta.program.sub', { n: p.plan.length, d: wk.days.length })}>
      <div className="ta-seg" role="tablist">
        {p.plan.map((x, i) => (
          <button key={x.id} type="button" role="tab" aria-selected={i === w} className={i === w ? 'on' : ''} onClick={() => setW(i)}>
            {t('weeks.week', { n: i + 1 })}{i === current && p.startDate <= today ? ' •' : ''}
          </button>
        ))}
      </div>
      <span className="small muted" style={{ paddingInline: 4 }}>{fmtShort(range.start)} – {fmtShort(range.end)}{isCurrent ? ` · ${t('weeks.phase.current')}` : ''}</span>

      <section className="ta-card">
        <div className="ta-card-head"><span className="ta-card-title">{t('weeks.targets')}</span></div>
        <div className="ta-card-pad">
          <div className="ta-targets">{targetTiles(wk.targets, t)}</div>
          {wk.targets.focus && <p style={{ lineHeight: 1.5, color: 'var(--ink-2)', fontSize: 14 }}>{wk.targets.focus}</p>}
        </div>
      </section>

      {wk.days.map((day, i) => {
        const date = dateOf(i);
        const log = logs.find((l) => l.date >= range.start && l.date <= range.end && l.dayName === day.name);
        const expanded = open === day.id;
        return (
          <section key={day.id} className="ta-card">
            <button type="button" className="ta-row" style={{ borderTop: 0 }} aria-expanded={expanded} onClick={() => setOpen(expanded ? null : day.id)}>
              <span className={`ta-task-icon${log ? ' ok' : ''}`}>{log ? <Icon name="check" size={18} strokeWidth={2.5} /> : <span className="mono small">{i + 1}</span>}</span>
              <span className="stack grow" style={{ gap: 2 }}>
                <span style={{ fontWeight: 600 }}>{day.name}</span>
                <span className="small muted">
                  {date ? `${fmtDow(date)} ${fmtShort(date)}` : t('weeks.unscheduled')} · {t('ta.today.exercises', { n: day.exercises.length })}
                  {log ? ` · ${t('ta.program.done')}` : date && date < today && isCurrent ? ` · ${t('week.missed')}` : ''}
                </span>
              </span>
              <Icon name={expanded ? 'up' : 'down'} size={16} />
            </button>
            {expanded && (
              <>
                {day.exercises.map((ex, j) => (
                  <div key={ex.id} className="ta-row" style={{ alignItems: 'flex-start' }}>
                    <span className="mono xs faint" style={{ paddingTop: 2, width: 18 }}>{j + 1}</span>
                    <span className="stack grow" style={{ gap: 4 }}>
                      <span style={{ fontWeight: 500 }}>{ex.name}</span>
                      <span className="ta-presc">
                        <span className="ta-pill" dir="ltr">{ex.sets} × {ex.reps}</span>
                        {ex.intensity && <span className="ta-pill">{ex.intensity}</span>}
                        {ex.rest && <span className="ta-pill">{t('ta.workout.rest', { v: ex.rest })}</span>}
                      </span>
                      {ex.cue && <span className="ta-cue">{ex.cue}</span>}
                    </span>
                  </div>
                ))}
                {isCurrent && !log && (
                  <div style={{ padding: '4px 16px 16px' }}>
                    <Link to={`${base}/workout/${day.id}`} className="ta-big-btn"><Icon name="play" size={16} />{t('ta.today.start')}</Link>
                  </div>
                )}
              </>
            )}
          </section>
        );
      })}
    </TabScreen>
  );
}
