// Side panel where the coach shapes the trainee page: what shows, in what
// order, and with what labels. Changes apply live and are saved per coach.

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { resetTraineeLayout, setTraineeLayout } from '../../data/actions';
import { useAppState } from '../../data/store';
import type { LayoutItem, SectionItem, TabItem, TraineeLayout } from '../../data/types';
import { Icon } from '../../components/Icon';
import { useToast } from '../../components/ui';
import { useT } from '../../i18n';
import type { StringKey } from '../../i18n/strings';
import type { TabId } from '../Trainee';
import { CardBuilderModal } from './cardBuilder';

type GroupId = 'header' | 'stats' | 'tabs' | 'overview' | 'program' | 'workouts' | 'progress' | 'notes' | 'checkins' | 'alerts';
const GROUP_FOR_TAB: Record<TabId, GroupId> = { overview: 'overview', program: 'program', workouts: 'workouts', progress: 'progress', notes: 'notes', checkins: 'checkins' };

export function CustomizePanel({ tab, onClose }: { tab: TabId; onClose: () => void }) {
  const t = useT();
  const toast = useToast();
  const L = useAppState().traineeLayout;
  const [open, setOpen] = useState<Set<GroupId>>(() => new Set(['header', GROUP_FOR_TAB[tab]]));
  const ref = useRef<HTMLElement>(null);
  const [newCard, setNewCard] = useState<'overview' | 'progress' | null>(null);
  const [editCard, setEditCard] = useState<string | null>(null);
  const editing = L.customCards.find((c) => c.id === editCard);

  // Follow the tab the coach switches to while the panel is open.
  useEffect(() => { setOpen((o) => new Set(o).add(GROUP_FOR_TAB[tab])); }, [tab]);
  useEffect(() => {
    document.body.classList.add('has-drawer');
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && !document.querySelector('.modal') && onClose();
    document.addEventListener('keydown', onKey);
    ref.current?.focus();
    return () => { document.body.classList.remove('has-drawer'); document.removeEventListener('keydown', onKey); };
  }, [onClose]);

  const set = (patch: Partial<TraineeLayout>) => setTraineeLayout(patch);
  const group = (id: GroupId, title: string, children: ReactNode, hint?: string) => (
    <details className="cz-group" open={open.has(id)} onToggle={(e) => { const isOpen = (e.target as HTMLDetailsElement).open; setOpen((o) => { const n = new Set(o); if (isOpen) n.add(id); else n.delete(id); return n; }); }}>
      <summary><span>{title}</span><Icon name="down" size={15} /></summary>
      <div className="cz-body">
        {hint && <p className="xs muted">{hint}</p>}
        {children}
      </div>
    </details>
  );
  const cardFor = (id: string) => L.customCards.find((c) => `card:${c.id}` === id);
  const sectionList = (key: 'overview' | 'progress') => (
    <>
      <SortList<SectionItem>
        items={L[key]}
        onChange={(items) => set({ [key]: items })}
        label={(x) => cardFor(x.id)?.title ?? t(`custom.section.${x.id}` as StringKey)}
        renderLabel={(x) => {
          const card = cardFor(x.id);
          if (!card) return t(`custom.section.${x.id}` as StringKey);
          return (
            <span className="row" style={{ gap: 6, minWidth: 0 }}>
              <span className="ellipsis">{card.title}</span>
              <button type="button" className="link-btn" style={{ fontSize: 12 }} onClick={() => setEditCard(card.id)}>{t('builder.edit')}</button>
            </span>
          );
        }}
        extra={(x, update) => x.on && (
          <button type="button" className={`cz-pill${x.wide ? ' on' : ''}`} aria-pressed={x.wide} onClick={() => update({ ...x, wide: !x.wide })}>{t('custom.fullWidth')}</button>
        )}
      />
      <button type="button" className="btn sm" style={{ borderStyle: 'dashed', alignSelf: 'flex-start' }} onClick={() => setNewCard(key)}>
        <Icon name="plus" size={14} strokeWidth={2} />{t('builder.newCard')}
      </button>
    </>
  );

  return (
    <aside className="drawer" aria-label={t('custom.title')} ref={ref} tabIndex={-1}>
      <div className="drawer-head">
        <div className="stack" style={{ gap: 2 }}>
          <h2 className="card-title">{t('custom.title')}</h2>
          <p className="xs muted">{t('custom.desc')}</p>
        </div>
        <button type="button" className="btn ghost sm icon" aria-label={t('common.close')} onClick={onClose}><Icon name="x" size={16} /></button>
      </div>

      <div className="drawer-body">
        {group('header', t('custom.g.header'), (
          <>
            <span className="cz-sub">{t('custom.sub.badges')}</span>
            <SortList items={L.badges} onChange={(badges) => set({ badges })} label={(x) => t(`custom.badge.${x.id}`)} />
            <span className="cz-sub">{t('custom.sub.details')}</span>
            <SortList items={L.details} onChange={(details) => set({ details })} label={(x) => t(`custom.detail.${x.id}`)} />
            <span className="cz-sub">{t('custom.sub.banners')}</span>
            <SortList items={L.banners} onChange={(banners) => set({ banners })} label={(x) => t(`custom.banner.${x.id}`)} />
            <span className="cz-sub">{t('custom.sub.actions')}</span>
            <SortList items={L.actions} onChange={(actions) => set({ actions })} label={(x) => t(`custom.action.${x.id}`)} />
          </>
        ))}

        {group('stats', t('custom.g.stats'), <SortList items={L.stats} onChange={(stats) => set({ stats })} label={(x) => t(`custom.statName.${x.id}`)} />, t('custom.statsHint'))}

        {group('tabs', t('custom.g.tabs'), (
          <>
            <SortList<TabItem>
              items={L.tabs}
              onChange={(tabs) => set({ tabs })}
              label={(x) => t(`trainee.tab.${x.id}`)}
              minOn={1}
              renderLabel={(x, update) => (
                <input className="input compact cz-rename" aria-label={t('custom.rename', { name: t(`trainee.tab.${x.id}`) })} placeholder={t(`trainee.tab.${x.id}`)} value={x.label} maxLength={24} onChange={(e) => update({ ...x, label: e.target.value })} />
              )}
            />
            <label className="field">{t('custom.defaultTab')}
              <select className="select" value={L.defaultTab} onChange={(e) => set({ defaultTab: e.target.value as TabId })}>
                {L.tabs.filter((x) => x.on).map((x) => <option key={x.id} value={x.id}>{x.label.trim() || t(`trainee.tab.${x.id}`)}</option>)}
              </select>
            </label>
          </>
        ), t('custom.tabsHint'))}

        {group('overview', t('custom.g.overview'), sectionList('overview'), t('custom.cardsHint'))}
        {group('program', t('custom.g.program'), (
          <>
            <span className="cz-sub">{t('custom.sub.targets')}</span>
            <SortList items={L.targetFields} onChange={(targetFields) => set({ targetFields })} label={(x) => t(`weeks.target.${x.id}`)} />
            <span className="cz-sub">{t('custom.sub.columns')}</span>
            <SortList items={L.programCols} onChange={(programCols) => set({ programCols })} label={(x) => t(`custom.pcol.${x.id}`)} />
          </>
        ))}
        {group('workouts', t('custom.g.workouts'), (
          <>
            <SortList items={L.workoutCols} onChange={(workoutCols) => set({ workoutCols })} label={(x) => t(`custom.wcol.${x.id}`)} minOn={1} />
            <label className="field">{t('custom.expand')}
              <select className="select" value={L.workoutExpand} onChange={(e) => set({ workoutExpand: e.target.value as TraineeLayout['workoutExpand'] })}>
                <option value="latest">{t('custom.expand.latest')}</option>
                <option value="all">{t('custom.expand.all')}</option>
                <option value="none">{t('custom.expand.none')}</option>
              </select>
            </label>
          </>
        ))}
        {group('progress', t('custom.g.progress'), sectionList('progress'), t('custom.cardsHint'))}
        {group('notes', t('custom.g.notes'), (
          <label className="check"><input type="checkbox" checked={L.notesDefaultShared} onChange={(e) => set({ notesDefaultShared: e.target.checked })} />{t('custom.notesShared')}</label>
        ))}
        {group('checkins', t('custom.g.checkins'), <SortList items={L.checkinCols} onChange={(checkinCols) => set({ checkinCols })} label={(x) => t(`custom.ccol.${x.id}`)} minOn={1} />)}
        {group('alerts', t('custom.g.alerts'), (
          <label className="field">{t('custom.adherenceWarn')}
            <div className="row">
              <input className="input" type="number" min={0} max={100} step={5} style={{ width: 100 }} value={L.adherenceWarn} onChange={(e) => set({ adherenceWarn: Math.max(0, Math.min(100, Number(e.target.value) || 0)) })} />
              <span className="small muted">%</span>
            </div>
          </label>
        ), t('custom.alertsHint'))}
      </div>

      <div className="drawer-foot">
        <button type="button" className="btn sm" onClick={() => { resetTraineeLayout(); toast(t('custom.resetDone')); }}>{t('custom.reset')}</button>
        <button type="button" className="btn sm dark" onClick={onClose}>{t('common.done')}</button>
      </div>
      {newCard && <CardBuilderModal defaultTab={newCard} onClose={() => setNewCard(null)} />}
      {editing && <CardBuilderModal card={editing} onClose={() => setEditCard(null)} />}
    </aside>
  );
}

interface SortListProps<I extends LayoutItem<string>> {
  items: I[];
  onChange: (items: I[]) => void;
  label: (item: I) => string;
  /** Replaces the plain label, e.g. with a rename field. */
  renderLabel?: (item: I, update: (next: I) => void) => ReactNode;
  extra?: (item: I, update: (next: I) => void) => ReactNode;
  /** Smallest number of items that must stay visible. */
  minOn?: number;
}

function SortList<I extends LayoutItem<string>>({ items, onChange, label, renderLabel, extra, minOn = 0 }: SortListProps<I>) {
  const t = useT();
  const [drag, setDrag] = useState<number | null>(null);
  const [over, setOver] = useState<number | null>(null);
  const onCount = items.filter((x) => x.on).length;
  const move = (from: number, to: number) => {
    if (to < 0 || to >= items.length || from === to) return;
    const next = [...items];
    const [x] = next.splice(from, 1);
    next.splice(to, 0, x);
    onChange(next);
  };
  const updateAt = (i: number) => (next: I) => onChange(items.map((x, j) => (j === i ? next : x)));

  return (
    <ul className="cz-list">
      {items.map((x, i) => (
        <li
          key={x.id}
          className={`cz-item${x.on ? '' : ' off'}${over === i && drag !== null && drag !== i ? ' over' : ''}`}
          draggable
          onDragStart={(e) => { setDrag(i); e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', x.id); }}
          onDragOver={(e) => { e.preventDefault(); setOver(i); }}
          onDragLeave={() => setOver((o) => (o === i ? null : o))}
          onDrop={(e) => { e.preventDefault(); if (drag !== null) move(drag, i); setDrag(null); setOver(null); }}
          onDragEnd={() => { setDrag(null); setOver(null); }}
        >
          <span className="cz-grip" aria-hidden="true"><Icon name="grip" size={14} /></span>
          <input
            type="checkbox"
            checked={x.on}
            disabled={x.on && onCount <= minOn}
            aria-label={t('custom.show', { name: label(x) })}
            onChange={(e) => updateAt(i)({ ...x, on: e.target.checked })}
          />
          <span className="cz-label">{renderLabel ? renderLabel(x, updateAt(i)) : label(x)}</span>
          {extra?.(x, updateAt(i))}
          <span className="cz-move">
            <button type="button" className="btn ghost sm icon" aria-label={t('editor.moveUp')} disabled={i === 0} onClick={() => move(i, i - 1)}><Icon name="up" size={14} /></button>
            <button type="button" className="btn ghost sm icon" aria-label={t('editor.moveDown')} disabled={i === items.length - 1} onClick={() => move(i, i + 1)}><Icon name="down" size={14} /></button>
          </span>
        </li>
      ))}
    </ul>
  );
}
