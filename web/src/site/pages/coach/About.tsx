// Numbers strip, the coach's story and their coaching method.

import { useLayoutEffect, useRef, type CSSProperties } from 'react';
import { Icon } from '../../../components/Icon';
import { useI18n } from '../../../i18n';
import { useCoach } from '../../coach/kit';
import { Reveal, RevealItem, SectionHeader, cx } from '../../components/ui';
import { prefersReducedMotion, useReveal } from '../../motion';

/** Counts up from 0 the first time it scrolls into view, and only that once. */
function CountUp({ value, decimals = 0 }: { value: number; decimals?: number }) {
  const { num } = useCoach();
  const ref = useRef<HTMLSpanElement>(null);
  const played = useRef(false);
  const format = useRef(num);
  format.current = num;
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el || played.current || prefersReducedMotion()) return;
    el.textContent = format.current(0, decimals);
    let raf = 0;
    const io = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      io.disconnect();
      played.current = true;
      const start = performance.now();
      const tick = (now: number) => {
        const k = Math.min(1, (now - start) / 1400);
        el.textContent = format.current(value * (1 - Math.pow(1 - k, 3)), decimals);
        if (k < 1) raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    }, { threshold: 0.5 });
    io.observe(el);
    return () => {
      io.disconnect();
      cancelAnimationFrame(raf);
      // Interrupted mid-count: show the real number.
      if (played.current) el.textContent = format.current(value, decimals);
    };
  }, [value, decimals]);
  return <span ref={ref} aria-hidden="true">{num(value, decimals)}</span>;
}

export function Numbers() {
  const { t } = useI18n();
  const { p, L, num } = useCoach();
  return (
    <section className="cp-numbers" aria-label={t('site.cp.numbers')}>
      <div className="s-container">
        <ul className="cp-stats">
          {p.stats.map((s, i) => {
            const decimals = Number.isInteger(s.value) ? 0 : 1;
            return (
              <RevealItem key={i} delay={i * 80}>
                <b>
                  <span dir="ltr">{s.prefix}<CountUp value={s.value} decimals={decimals} />{s.suffix}</span>
                  <span className="sr-only">{s.prefix}{num(s.value, decimals)}{s.suffix}</span>
                </b>
                <span>{L(s.label)}</span>
              </RevealItem>
            );
          })}
        </ul>
      </div>
    </section>
  );
}

export function Story() {
  const { t } = useI18n();
  const { p, L, first } = useCoach();
  const story = p.story!;
  return (
    <section id="about" className="s-section cp-story" aria-labelledby="cp-about-title">
      <div className="s-container cp-story-grid">
        <div className="cp-story-quote">
          <SectionHeader id="cp-about-title" align="start" eyebrow={t('site.cp.about.eyebrow', { name: first })}
            title={<><span className="cp-quote-mark" aria-hidden="true">“</span>{L(story.quote)}</>} />
        </div>
        <div className="cp-story-body">
          <Reveal className="cp-story-text" delay={100}>
            {story.paragraphs.map((para, i) => <p key={i}>{L(para)}</p>)}
          </Reveal>
          {story.specialties.length > 0 && (
            <Reveal delay={160}>
              <h3 className="cp-label">{t('site.cp.about.specialties')}</h3>
              <ul className="cp-tags">{story.specialties.map((s, i) => <li key={i}>{L(s)}</li>)}</ul>
            </Reveal>
          )}
          {story.credentials.length > 0 && (
            <Reveal delay={220}>
              <h3 className="cp-label">{t('site.cp.about.credentials')}</h3>
              <ul className="cp-creds">
                {story.credentials.map((c, i) => (
                  <li key={i}>
                    <span className="s-ico s-ico--brand"><Icon name="award" size={20} /></span>
                    <span>
                      <b>{L(c.name)}</b>
                      <span>{L(c.detail)} · {c.year}</span>
                    </span>
                  </li>
                ))}
              </ul>
            </Reveal>
          )}
        </div>
      </div>
    </section>
  );
}

/** Where each of four steps sits on the wave (y as a share of its height). */
const WAVE_Y = [82 / 120, 57 / 120, 22 / 120, 72 / 120];

/** The method as a training cycle: one wave of load, a step on each crest and trough. */
export function Method() {
  const { t } = useI18n();
  const { p, L, first } = useCoach();
  const [wave, drawn] = useReveal<HTMLDivElement>();
  return (
    <section id="method" className="s-section s-section--alt cp-method" aria-labelledby="cp-method-title">
      <div className="s-container">
        <SectionHeader id="cp-method-title" eyebrow={t('site.cp.method.eyebrow', { name: first })} title={t('site.cp.method.title')} />
        <div ref={wave} className={cx('cp-wave', drawn && 'is-in')} aria-hidden="true">
          <svg viewBox="0 0 1000 120" preserveAspectRatio="none">
            <defs>
              <linearGradient id="cp-wave-grad" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0" stopColor="#0B3D91" />
                <stop offset=".55" stopColor="#007AFF" />
                <stop offset="1" stopColor="#7FE7D6" />
              </linearGradient>
            </defs>
            <path className="cp-wave-line" pathLength={1}
              d="M0,98 C60,98 90,84 125,82 C210,78 290,64 375,57 C470,49 560,18 625,22 C700,26 790,80 875,72 C930,67 970,50 1000,40" />
          </svg>
          {p.method.length === WAVE_Y.length && WAVE_Y.map((y, i) => (
            <span key={i} className="cp-wave-dot" style={{ insetInlineStart: `${12.5 + i * 25}%`, top: `${y * 100}%`, '--i': i } as CSSProperties} />
          ))}
        </div>
        <ol className="cp-steps" style={{ '--n': p.method.length } as CSSProperties}>
          {p.method.map((m, i) => (
            <RevealItem key={i} delay={i * 110}>
              <span className="cp-step-num">{String(i + 1).padStart(2, '0')}</span>
              <h3>{L(m.title)}</h3>
              <p>{L(m.body)}</p>
            </RevealItem>
          ))}
        </ol>
      </div>
    </section>
  );
}
