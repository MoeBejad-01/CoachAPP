// Import training days from a coach's own Excel/CSV or PDF file.
// 1. pick a file  2. check how it was read (column roles / line roles)  3. preview & import.

import { useMemo, useState } from 'react';
import { deleteImportLayout, saveImportLayout } from '../../data/actions';
import {
  applyMapping, COL_ROLES, downloadExample, guessMapping, headerSignature, linesToDays, parseExerciseLine, readPdfLines, readSheets, readWithAi, tagLines,
  type AiError, type AiResult, type ColRole, type LineRole, type SheetData, type SheetMapping, type SplitMode, type TaggedLine,
} from '../../data/importer';
import { useAppState } from '../../data/store';
import type { ProgramDay } from '../../data/types';
import { Icon } from '../../components/Icon';
import { ProgramEditor } from '../../components/ProgramEditor';
import { Modal } from '../../components/ui';
import { useI18n, useT } from '../../i18n';

export type ImportMode = 'replace' | 'append';
export type ImportScope = 'week' | 'rest' | 'fileWeeks';

interface Props {
  onClose: () => void;
  /** `fileWeeks` carries every week the AI found, in order, for programs with several weeks. */
  onImport: (days: ProgramDay[], mode: ImportMode, scope: ImportScope, fileWeeks?: ProgramDay[][]) => void;
  hasDays: boolean;
  /** Trainee programs can apply the import to this week or this and later weeks. */
  scopeChoice?: boolean;
}

type Stage = 'pick' | 'ai' | 'sheet' | 'pdf' | 'preview';
const MAX_ROWS = 40;

export function ImportTrainingModal({ onClose, onImport, hasDays, scopeChoice }: Props) {
  const { t, lang } = useI18n();
  const state = useAppState();
  const [stage, setStage] = useState<Stage>('pick');
  const [file, setFile] = useState<File | null>(null);
  const [ai, setAi] = useState<AiResult | null>(null);
  const [aiError, setAiError] = useState<AiError | null>(null);
  const [weekIdx, setWeekIdx] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [fileName, setFileName] = useState('');
  const [sheets, setSheets] = useState<SheetData[]>([]);
  const [view, setView] = useState(0);
  const [map, setMap] = useState<SheetMapping>({ headerRow: -1, roles: [], split: 'titles' });
  const [usedLayout, setUsedLayout] = useState<string | null>(null);
  const [lines, setLines] = useState<TaggedLine[]>([]);
  const [days, setDays] = useState<ProgramDay[]>([]);
  const [skipped, setSkipped] = useState<string[]>([]);
  const [mode, setMode] = useState<ImportMode>(hasDays ? 'replace' : 'append');
  const [scope, setScope] = useState<ImportScope>('week');
  const [remember, setRemember] = useState(true);
  const [layoutName, setLayoutName] = useState('');
  const dayLabel = (n: number) => t('editor.dayN', { n });

  const sheetResult = useMemo(() => (stage === 'sheet' ? applyMapping(sheets, map, dayLabel) : null), [stage, sheets, map]); // eslint-disable-line react-hooks/exhaustive-deps
  const pdfResult = useMemo(() => (stage === 'pdf' ? linesToDays(lines, dayLabel) : null), [stage, lines]); // eslint-disable-line react-hooks/exhaustive-deps
  const result = sheetResult ?? pdfResult;

  /** Default path: Claude reads the file and the result opens straight in the preview. */
  const open = async (f: File | undefined) => {
    if (!f) return;
    setFile(f);
    setFileName(f.name);
    setLayoutName(f.name.replace(/\.[^.]+$/, ''));
    setError('');
    setAiError(null);
    setAi(null);
    setLines([]);
    setSheets([]);
    setStage('ai');
    try {
      const r = await readWithAi(f, lang);
      if (!r.weeks.length) throw new Error('failed');
      setAi(r);
      setWeekIdx(0);
      setDays(r.weeks[0].days);
      setSkipped([]);
      setStage('preview');
    } catch (e) {
      setAiError((e instanceof Error ? e.message : 'failed') as AiError);
    }
  };

  /** Fallback: map the columns or lines by hand, without AI. */
  const manual = async (file: File | null) => {
    if (!file) return;
    setAi(null);
    setError('');
    setBusy(true);
    try {
      if (/\.pdf$/i.test(file.name) || file.type === 'application/pdf') {
        const ls = await readPdfLines(file);
        if (!ls.length) throw new Error(t('imp.noText'));
        setLines(tagLines(ls));
        setStage('pdf');
      } else {
        const sh = await readSheets(file);
        if (!sh.length) throw new Error(t('imp.emptySheet'));
        setSheets(sh);
        setView(0);
        // Same headers as a layout the coach saved before? Use it as is.
        const guess = guessMapping(sh);
        const saved = state.importLayouts.find((l) => l.signature && l.signature === headerSignature(sh, l.headerRow));
        if (saved) {
          setMap({ headerRow: saved.headerRow, roles: saved.roles as ColRole[], split: saved.split });
          setUsedLayout(saved.id);
        } else {
          setMap(guess);
          setUsedLayout(null);
        }
        setStage('sheet');
      }
    } catch (e) {
      setError(e instanceof Error && e.message ? e.message : t('imp.readError'));
    } finally {
      setBusy(false);
    }
  };

  const toPreview = () => {
    if (!result) return;
    setDays(result.days);
    setSkipped(result.skipped);
    setStage('preview');
  };

  const finish = () => {
    if (!ai && sheets.length && remember && stage === 'preview' && !lines.length) {
      saveImportLayout({ name: layoutName.trim() || fileName, signature: headerSignature(sheets, map.headerRow), headerRow: map.headerRow, roles: map.roles, split: map.split });
    }
    // The week on screen carries the coach's edits; the other weeks import as read.
    const fileWeeks = ai && scope === 'fileWeeks' ? ai.weeks.map((w, i) => (i === weekIdx ? days : w.days)).slice(weekIdx) : undefined;
    onImport(days, mode, scope, fileWeeks);
  };

  const pickWeek = (i: number) => {
    if (!ai) return;
    setAi({ ...ai, weeks: ai.weeks.map((w, j) => (j === weekIdx ? { ...w, days } : w)) });
    setWeekIdx(i);
    setDays(ai.weeks[i].days);
  };

  const fromSheet = !ai && sheets.length > 0 && lines.length === 0;
  const isImage = !!file && /^image\//.test(file.type);
  const saved = state.importLayouts.find((l) => l.id === usedLayout);
  const width = map.roles.length;
  const shown = sheets[view]?.rows.slice(0, MAX_ROWS) ?? [];

  const footer = (
    <>
      {stage !== 'pick' && <button type="button" className="btn" style={{ marginInlineEnd: 'auto' }} onClick={() => setStage(stage === 'preview' && !ai ? (fromSheet ? 'sheet' : 'pdf') : 'pick')}><Icon name="chevronLeft" size={15} />{t('tb.back')}</button>}
      <button type="button" className="btn" onClick={onClose}>{t('common.cancel')}</button>
      {(stage === 'sheet' || stage === 'pdf') && <button type="button" className="btn primary" disabled={!result?.days.length} onClick={toPreview}>{t('imp.toPreview')}<Icon name="chevron" size={15} /></button>}
      {stage === 'preview' && <button type="button" className="btn primary" disabled={!days.length} onClick={finish}><Icon name="check" size={15} />{t('imp.import', { n: days.length })}</button>}
    </>
  );

  return (
    <Modal xl title={t('imp.title')} onClose={onClose} footer={footer}>
      <ol className="imp-steps" aria-label={t('imp.title')}>
        {(['pick', 'check', 'preview'] as const).map((s, i) => {
          const at = stage === 'pick' ? 0 : stage === 'preview' ? 2 : 1; // 'ai', 'sheet' and 'pdf' are all the check step
          return <li key={s} className={i === at ? 'on' : i < at ? 'done' : ''}><span>{i < at ? <Icon name="check" size={12} strokeWidth={2.5} /> : i + 1}</span>{t(`imp.step.${s}`)}</li>;
        })}
      </ol>

      {stage === 'pick' && (
        <>
          <label className={`imp-drop${busy ? ' busy' : ''}`}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => { e.preventDefault(); void open(e.dataTransfer.files[0]); }}>
            <input type="file" className="sr-only" accept=".xlsx,.xls,.csv,.ods,.txt,.pdf,application/pdf,image/png,image/jpeg,image/webp" onChange={(e) => void open(e.target.files?.[0])} />
            <Icon name="upload" size={26} />
            <span style={{ fontWeight: 600, fontSize: 15 }}>{busy ? t('imp.reading', { name: fileName }) : t('imp.drop')}</span>
            <span className="small muted">{t('imp.types')}</span>
          </label>
          {error && <div className="tb-warn">{error}</div>}
          <div className="imp-notes">
            <p className="small muted">{t('imp.howItWorks')}</p>
            <p className="small muted">{t('imp.onlyTraining')}</p>
            <button type="button" className="link-btn" style={{ alignSelf: 'flex-start' }} onClick={() => void downloadExample(t('imp.dayWord'))}>{t('imp.example')}</button>
          </div>
          {state.importLayouts.length > 0 && (
            <div className="stack" style={{ gap: 6 }}>
              <span className="xs faint">{t('imp.savedLayouts')}</span>
              <div className="row wrap" style={{ gap: 6 }}>
                {state.importLayouts.map((l) => (
                  <span key={l.id} className="chip row" style={{ gap: 6 }}>{l.name}
                    <button type="button" className="link-btn" style={{ padding: 0, color: 'var(--faint)' }} aria-label={t('imp.forget', { name: l.name })} onClick={() => deleteImportLayout(l.id)}><Icon name="x" size={12} /></button>
                  </span>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {stage === 'ai' && (
        <div className="ai-read">
          {!aiError ? (
            <>
              <span className="ai-spinner" aria-hidden="true" />
              <span style={{ fontWeight: 600, fontSize: 15 }}>{t('ai.reading', { name: fileName })}</span>
              <span className="small muted">{t('ai.readingSub')}</span>
            </>
          ) : (
            <>
              <span className="ai-err-icon"><Icon name="x" size={22} /></span>
              <span style={{ fontWeight: 600, fontSize: 15 }}>{t(`ai.err.${aiError}` as 'ai.err.failed')}</span>
              {aiError === 'no_key' && <code className="ai-code">ANTHROPIC_API_KEY=…  →  web/.env.local</code>}
              <div className="row wrap" style={{ gap: 8, justifyContent: 'center' }}>
                <button type="button" className="btn" onClick={() => void open(file ?? undefined)}>{t('ai.retry')}</button>
                {!isImage && <button type="button" className="btn primary" disabled={busy} onClick={() => void manual(file)}>{t('ai.manual')}</button>}
              </div>
            </>
          )}
        </div>
      )}

      {stage === 'sheet' && (
        <>
          <div className="row wrap" style={{ justifyContent: 'space-between', gap: 10 }}>
            <span className="small"><span className="muted">{t('imp.file')}</span> <strong>{fileName}</strong></span>
            {saved
              ? <span className="chip ok row" style={{ gap: 6 }}>{t('imp.usingLayout', { name: saved.name })}<button type="button" className="link-btn" style={{ padding: 0, fontSize: 12 }} onClick={() => { setMap(guessMapping(sheets)); setUsedLayout(null); }}>{t('imp.redetect')}</button></span>
              : <span className="small muted">{t('imp.checkColumns')}</span>}
          </div>

          <div className="imp-controls">
            <label className="field">{t('imp.headerRow')}
              <select className="select" value={map.headerRow} onChange={(e) => setMap((m) => ({ ...m, headerRow: Number(e.target.value) }))}>
                <option value={-1}>{t('imp.noHeader')}</option>
                {sheets[0].rows.slice(0, 15).map((r, i) => <option key={i} value={i}>{t('imp.rowN', { n: i + 1 })}{r.filter(Boolean).length ? ` · ${r.filter(Boolean).slice(0, 3).join(', ').slice(0, 40)}` : ''}</option>)}
              </select>
            </label>
            <div className="field"><span>{t('imp.splitBy')}</span>
              <div className="seg" role="radiogroup">
                {(['titles', 'column', 'sheets'] as SplitMode[]).map((s) => (
                  <button key={s} type="button" role="radio" aria-checked={map.split === s} className={map.split === s ? 'on' : ''}
                    disabled={(s === 'column' && !map.roles.includes('day')) || (s === 'sheets' && sheets.length < 2)}
                    onClick={() => setMap((m) => ({ ...m, split: s }))}>{t(`imp.split.${s}`)}</button>
                ))}
              </div>
            </div>
          </div>

          {sheets.length > 1 && (
            <div className="seg" role="tablist" aria-label={t('imp.sheets')}>
              {sheets.map((s, i) => <button key={s.name} type="button" role="tab" aria-selected={i === view} className={i === view ? 'on' : ''} onClick={() => setView(i)}>{s.name}</button>)}
            </div>
          )}

          <div className="imp-grid-wrap">
            <table className="imp-grid">
              <thead>
                <tr>
                  <th />
                  {Array.from({ length: width }, (_, c) => (
                    <th key={c}>
                      <select className={`imp-role ${map.roles[c]}`} aria-label={t('imp.columnN', { n: c + 1 })} value={map.roles[c]}
                        onChange={(e) => {
                          const role = e.target.value as ColRole;
                          setMap((m) => {
                            // A role other than "ignore" belongs to one column only.
                            const roles = m.roles.map((r, i) => (i === c ? role : role !== 'ignore' && r === role ? 'ignore' : r));
                            const split = role === 'day' ? 'column' : m.split === 'column' && !roles.includes('day') ? 'titles' : m.split;
                            return { ...m, roles, split };
                          });
                        }}>
                        {COL_ROLES.map((r) => <option key={r} value={r}>{t(`imp.role.${r}`)}</option>)}
                      </select>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {shown.map((r, i) => (
                  <tr key={i} className={view === 0 && i === map.headerRow ? 'hdr' : view === 0 && i < map.headerRow ? 'pre' : ''}>
                    <td className="rn">{i + 1}</td>
                    {Array.from({ length: width }, (_, c) => <td key={c} className={map.roles[c] === 'ignore' ? 'off' : ''}>{r[c]}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {(sheets[view]?.rows.length ?? 0) > MAX_ROWS && <span className="xs faint">{t('imp.moreRows', { n: sheets[view].rows.length - MAX_ROWS })}</span>}
          <Summary days={result?.days ?? []} skipped={result?.skipped.length ?? 0} />
          {!map.roles.includes('exercise') && <div className="tb-warn">{t('imp.needExercise')}</div>}
        </>
      )}

      {stage === 'pdf' && (
        <>
          <div className="row wrap" style={{ justifyContent: 'space-between', gap: 10 }}>
            <span className="small"><span className="muted">{t('imp.file')}</span> <strong>{fileName}</strong></span>
            <span className="small muted">{t('imp.checkLines')}</span>
          </div>
          <div className="imp-lines">
            {lines.map((l, i) => {
              const ex = l.role === 'exercise' ? parseExerciseLine(l.text) : null;
              return (
                <div key={i} className={`imp-line ${l.role}`}>
                  <div className="seg sm" role="radiogroup" aria-label={t('imp.lineN', { n: i + 1 })}>
                    {(['day', 'exercise', 'ignore'] as LineRole[]).map((r) => (
                      <button key={r} type="button" role="radio" aria-checked={l.role === r} className={l.role === r ? 'on' : ''} onClick={() => setLines((ls) => ls.map((x, j) => (j === i ? { ...x, role: r } : x)))}>{t(`imp.line.${r}`)}</button>
                    ))}
                  </div>
                  <span className="imp-line-text" dir="auto">{l.text}</span>
                  {ex && <span className="imp-parsed mono xs" dir="ltr">{ex.sets}×{ex.reps}{ex.intensity && ` · ${ex.intensity}`}{ex.rest && ` · ${ex.rest}`}</span>}
                </div>
              );
            })}
          </div>
          <Summary days={result?.days ?? []} skipped={result?.skipped.length ?? 0} />
        </>
      )}

      {stage === 'preview' && (
        <>
          {ai ? (
            <div className="ai-banner">
              <span className="row" style={{ gap: 8, fontWeight: 600 }}><Icon name="bolt" size={15} />{t('ai.readBy')}</span>
              <span className="small">{t('ai.checkHint')}</span>
              {(ai.warnings.length > 0 || ai.missingSets > 0) && (
                <ul className="small">
                  {ai.missingSets > 0 && <li>{t('ai.missingSets', { n: ai.missingSets })}</li>}
                  {ai.warnings.map((w, i) => <li key={i} dir="auto">{w}</li>)}
                </ul>
              )}
              {ai.ignored.length > 0 && <span className="xs muted" dir="auto">{t('ai.ignored', { list: ai.ignored.join(' · ') })}</span>}
              {!isImage && <button type="button" className="link-btn" style={{ alignSelf: 'flex-start', fontSize: 12.5 }} disabled={busy} onClick={() => void manual(file)}>{t('ai.manualInstead')}</button>}
            </div>
          ) : <p className="small muted">{t('imp.previewHint')}</p>}
          {ai && ai.weeks.length > 1 && (
            <div className="field"><span>{t('ai.weeksFound', { n: ai.weeks.length })}</span>
              <div className="seg" role="tablist">
                {ai.weeks.map((w, i) => <button key={i} type="button" role="tab" aria-selected={i === weekIdx} className={i === weekIdx ? 'on' : ''} onClick={() => pickWeek(i)}>{w.label || t('weeks.week', { n: i + 1 })}</button>)}
              </div>
            </div>
          )}
          <div className="tb-editor"><ProgramEditor days={days} editing onChange={setDays} /></div>
          {skipped.length > 0 && (
            <details className="imp-skipped">
              <summary className="small">{t('imp.skipped', { n: skipped.length })}</summary>
              <ul className="xs muted">{skipped.slice(0, 50).map((s, i) => <li key={i} dir="auto">{s}</li>)}</ul>
            </details>
          )}
          {hasDays && (
            <div className="field"><span>{t('imp.whatToDo')}</span>
              <div className="choices">
                {(['replace', 'append'] as ImportMode[]).map((m) => (
                  <button key={m} type="button" className={`choice${mode === m ? ' on' : ''}`} onClick={() => setMode(m)}>
                    <span className="t">{t(`imp.mode.${m}`)}</span><span className="s">{t(`imp.mode.${m}.sub`)}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
          {scopeChoice && (
            <div className="field"><span>{t('imp.applyTo')}</span>
              <div className="seg" role="radiogroup">
                {(['week', 'rest', ...(ai && ai.weeks.length > 1 ? ['fileWeeks'] : [])] as ImportScope[]).map((s) => <button key={s} type="button" role="radio" aria-checked={scope === s} className={scope === s ? 'on' : ''} onClick={() => setScope(s)}>{t(`imp.scope.${s}`)}</button>)}
              </div>
            </div>
          )}
          {fromSheet && (
            <div className="row wrap" style={{ gap: 10 }}>
              <label className="check"><input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} />{t('imp.remember')}</label>
              {remember && <input className="input compact" style={{ width: 240 }} aria-label={t('imp.layoutName')} value={layoutName} onChange={(e) => setLayoutName(e.target.value)} />}
            </div>
          )}
        </>
      )}
    </Modal>
  );
}

function Summary({ days, skipped }: { days: ProgramDay[]; skipped: number }) {
  const t = useT();
  const ex = days.reduce((n, d) => n + d.exercises.length, 0);
  return (
    <div className={`imp-summary${days.length ? '' : ' empty'}`}>
      <Icon name={days.length ? 'check' : 'x'} size={15} />
      <span>{days.length ? t('imp.found', { d: days.length, e: ex }) : t('imp.nothing')}</span>
      {days.length > 0 && <span className="muted">· {days.map((d) => d.name).join(', ').slice(0, 80)}</span>}
      {skipped > 0 && <span className="muted">· {t('imp.skippedShort', { n: skipped })}</span>}
    </div>
  );
}
