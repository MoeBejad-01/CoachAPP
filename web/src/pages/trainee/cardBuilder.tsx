// Lets the coach build their own trainee-page card from any tracked data:
// an exercise, workout stats, check-ins, InBody, program targets, or a new metric.

import { useMemo, useState } from 'react';
import { addCustomCard, deleteCustomCard, updateCustomCard } from '../../data/actions';
import { useAppState } from '../../data/store';
import type { CardSource, CheckinField, CustomCard, ExerciseMeasure, InBodyField, WorkoutField } from '../../data/types';
import { Modal, useToast } from '../../components/ui';
import { useT } from '../../i18n';
import type { StringKey } from '../../i18n/strings';
import { INBODY_FIELDS, sourceLabel } from './progressCards';

type Kind = CardSource['kind'];
const KINDS: Kind[] = ['exercise', 'workout', 'checkin', 'inbody', 'target', 'metric'];
const MEASURES: ExerciseMeasure[] = ['e1rm', 'topWeight', 'volume', 'reps'];
const WORKOUT_FIELDS: WorkoutField[] = ['volume', 'duration', 'rpe', 'sets'];
const CHECKIN_FIELDS: CheckinField[] = ['weightKg', 'sleepH', 'energy', 'stress', 'soreness'];

export function CardBuilderModal({ card, defaultTab = 'progress', onClose }: { card?: CustomCard; defaultTab?: 'overview' | 'progress'; onClose: () => void }) {
  const t = useT();
  const toast = useToast();
  const state = useAppState();
  const exercises = useMemo(() => {
    const names = new Set<string>();
    for (const l of state.logs) for (const e of l.entries) names.add(e.exerciseName);
    for (const tpl of state.templates) for (const d of tpl.days) for (const e of d.exercises) names.add(e.name);
    return [...names].sort((a, b) => a.localeCompare(b));
  }, [state.logs, state.templates]);

  const src = card?.source;
  const [kind, setKind] = useState<Kind>(src?.kind ?? 'exercise');
  const [exercise, setExercise] = useState(src?.kind === 'exercise' ? src.exercise : exercises[0] ?? '');
  const [measure, setMeasure] = useState<ExerciseMeasure>(src?.kind === 'exercise' ? src.measure : 'e1rm');
  const [workoutField, setWorkoutField] = useState<WorkoutField>(src?.kind === 'workout' ? src.field : 'volume');
  const [checkinField, setCheckinField] = useState<CheckinField>(src?.kind === 'checkin' ? src.field : 'sleepH');
  const [inbodyField, setInbodyField] = useState<InBodyField>(src?.kind === 'inbody' ? src.field : 'muscleKg');
  const [targetField, setTargetField] = useState<'bodyWeight' | 'sleep'>(src?.kind === 'target' ? src.field : 'bodyWeight');
  const [unit, setUnit] = useState(src?.kind === 'metric' ? src.unit : '');
  const [higher, setHigher] = useState(src?.kind === 'metric' ? src.higherIsBetter : true);
  const [chart, setChart] = useState<CustomCard['chart']>(card?.chart ?? 'line');
  const [tab, setTab] = useState(defaultTab);
  const [title, setTitle] = useState(card?.title ?? '');

  const source: CardSource =
    kind === 'exercise' ? { kind, exercise, measure }
    : kind === 'workout' ? { kind, field: workoutField }
    : kind === 'checkin' ? { kind, field: checkinField }
    : kind === 'inbody' ? { kind, field: inbodyField }
    : kind === 'target' ? { kind, field: targetField }
    : { kind, unit: unit.trim(), higherIsBetter: higher };
  const autoTitle = kind === 'metric' ? '' : sourceLabel(source, t);
  const finalTitle = title.trim() || autoTitle;
  const valid = !!finalTitle && (kind !== 'exercise' || !!exercise);

  const save = () => {
    if (card) {
      updateCustomCard(card.id, { title: finalTitle, source, chart });
      toast(t('builder.updated'));
    } else {
      addCustomCard({ title: finalTitle, source, chart }, tab);
      toast(t('builder.added', { tab: t(`trainee.tab.${tab}`) }));
    }
    onClose();
  };

  return (
    <Modal
      wide
      title={card ? t('builder.editTitle') : t('builder.title')}
      onClose={onClose}
      footer={<>
        {card && <button type="button" className="btn danger" style={{ marginInlineEnd: 'auto' }} onClick={() => { deleteCustomCard(card.id); toast(t('builder.deleted')); onClose(); }}>{t('builder.delete')}</button>}
        <button type="button" className="btn" onClick={onClose}>{t('common.cancel')}</button>
        <button type="button" className="btn primary" disabled={!valid} onClick={save}>{card ? t('common.saveChanges') : t('builder.create')}</button>
      </>}
    >
      <div className="stack" style={{ gap: 8 }}>
        <span className="section-label">{t('builder.dataFrom')}</span>
        <div className="choices">
          {KINDS.map((k) => (
            <button key={k} type="button" className={`choice${kind === k ? ' on' : ''}`} onClick={() => setKind(k)}>
              <span className="t">{t(`builder.kind.${k}`)}</span>
              <span className="s">{t(`builder.kind.${k}.sub`)}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="form-grid">
        {kind === 'exercise' && (
          <>
            <label className="field">{t('builder.exercise')}
              <select className="select" value={exercise} onChange={(e) => setExercise(e.target.value)}>{exercises.map((x) => <option key={x} value={x}>{x}</option>)}</select>
            </label>
            <label className="field">{t('builder.measure')}
              <select className="select" value={measure} onChange={(e) => setMeasure(e.target.value as ExerciseMeasure)}>{MEASURES.map((m) => <option key={m} value={m}>{t(`builder.measure.${m}`)}</option>)}</select>
            </label>
          </>
        )}
        {kind === 'workout' && (
          <label className="field">{t('builder.field')}
            <select className="select" value={workoutField} onChange={(e) => setWorkoutField(e.target.value as WorkoutField)}>{WORKOUT_FIELDS.map((f) => <option key={f} value={f}>{t(`builder.workout.${f}`)}</option>)}</select>
          </label>
        )}
        {kind === 'checkin' && (
          <label className="field">{t('builder.field')}
            <select className="select" value={checkinField} onChange={(e) => setCheckinField(e.target.value as CheckinField)}>{CHECKIN_FIELDS.map((f) => <option key={f} value={f}>{t(`builder.checkin.${f}` as StringKey)}</option>)}</select>
          </label>
        )}
        {kind === 'inbody' && (
          <label className="field">{t('builder.field')}
            <select className="select" value={inbodyField} onChange={(e) => setInbodyField(e.target.value as InBodyField)}>{INBODY_FIELDS.map((f) => <option key={f} value={f}>{t(`inbody.f.${f}`)}</option>)}</select>
          </label>
        )}
        {kind === 'target' && (
          <label className="field">{t('builder.field')}
            <select className="select" value={targetField} onChange={(e) => setTargetField(e.target.value as 'bodyWeight' | 'sleep')}>
              <option value="bodyWeight">{t('builder.target.bodyWeight')}</option>
              <option value="sleep">{t('builder.target.sleep')}</option>
            </select>
          </label>
        )}
        {kind === 'metric' && (
          <>
            <label className="field">{t('builder.unit')}<input className="input" value={unit} maxLength={12} placeholder={t('builder.unitPlaceholder')} onChange={(e) => setUnit(e.target.value)} /></label>
            <label className="field">{t('builder.direction')}
              <select className="select" value={higher ? 'up' : 'down'} onChange={(e) => setHigher(e.target.value === 'up')}>
                <option value="up">{t('builder.higherBetter')}</option>
                <option value="down">{t('builder.lowerBetter')}</option>
              </select>
            </label>
          </>
        )}
        <label className="field">{t('builder.cardTitle')}
          <input className="input" value={title} maxLength={40} placeholder={autoTitle || t('builder.titlePlaceholder')} onChange={(e) => setTitle(e.target.value)} />
        </label>
        <label className="field">{t('builder.chart')}
          <select className="select" value={chart} onChange={(e) => setChart(e.target.value as CustomCard['chart'])}>
            <option value="line">{t('builder.chart.line')}</option>
            <option value="bar">{t('builder.chart.bar')}</option>
          </select>
        </label>
        {!card && (
          <label className="field">{t('builder.showOn')}
            <select className="select" value={tab} onChange={(e) => setTab(e.target.value as 'overview' | 'progress')}>
              <option value="progress">{t('trainee.tab.progress')}</option>
              <option value="overview">{t('trainee.tab.overview')}</option>
            </select>
          </label>
        )}
      </div>
      {kind === 'metric' && <p className="xs muted">{t('builder.metricHint')}</p>}
    </Modal>
  );
}
