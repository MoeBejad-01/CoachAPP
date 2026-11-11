// Trainee results on one shared timeline: drag (or play) through the weeks and
// every card's number and line move together.

import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { Icon } from '../../../components/Icon';
import { useI18n } from '../../../i18n';
import { useCoach } from '../../coach/kit';
import type { TraineeResult } from '../../coach/types';
import { RevealItem, SectionHeader, cx } from '../../components/ui';
import { prefersReducedMotion } from '../../motion';

const PLAY_MS = 3200;

/** Value at a fractional week, interpolated between logged weeks. */
function at(weekly: number[], week: number) {
  const i = Math.min(weekly.length - 1, Math.max(0, Math.floor(week)));
  const next = weekly[Math.min(weekly.length - 1, i + 1)];
  return weekly[i] + (next - weekly[i]) * (week - i);
}

export function Results() {
  const { t } = useI18n();
  const { p, count } = useCoach();
  const weeks = Math.max(...p.results.map((r) => r.weekly.length - 1));
  const [week, setWeek] = useState(() => (prefersReducedMotion() ? weeks : 0));
  const [playing, setPlaying] = useState(false);
  const section = useRef<HTMLElement>(null);
  const raf = useRef(0);

  // Play once the first time the section is in view.
  useEffect(() => {
    if (prefersReducedMotion() || !section.current) return;
    const io = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return;
      io.disconnect();
      setPlaying(true);
    }, { threshold: 0.35 });
    io.observe(section.current);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (!playing) return;
    let from = week >= weeks ? 0 : week;
    let last = performance.now();
    const tick = (now: number) => {
      from = Math.min(weeks, from + ((now - last) / PLAY_MS) * weeks);
      last = now;
      setWeek(from);
      if (from < weeks) raf.current = requestAnimationFrame(tick);
      else setPlaying(false);
    };
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
  }, [playing]); // eslint-disable-line react-hooks/exhaustive-deps

  const shownWeek = Math.round(week);
  const ticks = Array.from({ length: Math.floor(weeks / 4) + 1 }, (_, i) => i * 4);

  return (
    <section ref={section} id="results" className="s-section cp-results" aria-labelledby="cp-results-title">
      <div className="s-container">
        <SectionHeader id="cp-results-title" eyebrow={t('site.cp.results.eyebrow')} title={t('site.cp.results.title')}
          lead={t('site.cp.results.lead', { weeks: count('site.cp.weeks', weeks) })} />

        <div className="cp-scrub">
          <button type="button" className="s-icon-btn s-icon-btn--lg cp-play" onClick={() => setPlaying(!playing)}
            aria-label={t(playing ? 'site.cp.results.pause' : week >= weeks ? 'site.cp.results.replay' : 'site.cp.results.play')}>
            <Icon name={playing ? 'pause' : week >= weeks ? 'rotate' : 'play'} size={18} strokeWidth={2.2} />
          </button>
          <div className="cp-scrub-track">
            <div className="cp-scrub-head">
              <span>{t('site.cp.results.weekLabel')}</span>
              <b>{shownWeek}</b>
            </div>
            <input type="range" min={0} max={weeks} step={0.01} value={week}
              style={{ '--p': `${(week / weeks) * 100}%` } as CSSProperties}
              aria-label={t('site.cp.results.weekLabel')}
              aria-valuetext={t('site.cp.results.valuetext', { n: shownWeek, total: weeks })}
              onChange={(e) => { setPlaying(false); setWeek(Number(e.target.value)); }} />
            <div className="cp-scrub-ticks" aria-hidden="true">
              {ticks.map((n) => <span key={n} style={{ insetInlineStart: `${(n / weeks) * 100}%` }}>{n}</span>)}
            </div>
          </div>
        </div>

        <ul className="cp-result-grid">
          {p.results.map((r, i) => <ResultCard key={i} r={r} week={Math.min(week, r.weekly.length - 1)} delay={(i % 3) * 80} />)}
        </ul>
        <p className="cp-note">{t('site.cp.results.consent')}</p>
      </div>
    </section>
  );
}

function ResultCard({ r, week, delay }: { r: TraineeResult; week: number; delay: number }) {
  const { L, num } = useCoach();
  const last = r.weekly.length - 1;
  const value = at(r.weekly, week);
  const delta = value - r.weekly[0];
  const good = r.lowerIsBetter ? delta < 0 : delta > 0;
  const d = r.decimals ?? 0;

  // Fixed scale over the whole series, so the line grows into its final shape.
  const { min, max } = useMemo(() => ({ min: Math.min(...r.weekly), max: Math.max(...r.weekly) }), [r.weekly]);
  const xy = (w: number, v: number): [number, number] => [(w / last) * 100, 34 - ((v - min) / (max - min || 1)) * 28];
  const path = (upTo: number) => {
    const pts: [number, number][] = [];
    for (let w = 0; w <= Math.floor(upTo); w++) pts.push(xy(w, r.weekly[w]));
    if (upTo % 1) pts.push(xy(upTo, at(r.weekly, upTo)));
    return pts.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(2)},${y.toFixed(2)}`).join(' ');
  };
  const [dx, dy] = xy(week, value);
  const unit = L(r.unit);

  return (
    <RevealItem delay={delay} className={cx('s-card cp-result', good && 'is-good')}>
      <div className="cp-result-who">
        <span className="cp-result-av" aria-hidden="true">{L(r.name).slice(0, 1)}</span>
        <b>{L(r.name)}</b>
        <span className="cp-chip">{L(r.goal)}</span>
      </div>
      <span className="cp-result-metric">{L(r.metric)}</span>
      <div className="cp-result-value">
        <b>{num(value, d)}</b>
        <span>{unit}</span>
        <span className={cx('cp-delta', good && 'is-good')} dir="ltr">
          {delta > 0 ? '+' : delta < 0 ? '−' : '±'}{num(Math.abs(delta), d)}{unit === '%' || unit === '٪' ? '' : ' '}{unit}
        </span>
      </div>
      <div className="cp-spark">
        <svg viewBox="0 0 100 36" preserveAspectRatio="none" aria-hidden="true">
          <path className="cp-spark-ghost" d={path(last)} />
          <path className="cp-spark-line" d={path(week)} />
        </svg>
        <span className="cp-spark-dot" style={{ insetInlineStart: `${dx}%`, top: `${(dy / 36) * 100}%` }} aria-hidden="true" />
      </div>
    </RevealItem>
  );
}
