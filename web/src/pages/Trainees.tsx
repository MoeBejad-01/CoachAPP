import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { allStats } from '../data/selectors';
import { useAppState } from '../data/store';
import { Icon } from '../components/Icon';
import { Roster, type RosterFilter } from '../components/Roster';
import { useT } from '../i18n';

export function TraineesPage() {
  const state = useAppState();
  const t = useT();
  const stats = useMemo(() => allStats(state), [state]);
  const [params, setParams] = useSearchParams();
  const [query, setQuery] = useState('');
  const filter = (params.get('filter') as RosterFilter) || 'all';

  return (
    <>
      <header className="page-head">
        <div className="stack">
          <h1 className="page-title">{t('nav.trainees')}</h1>
          <p className="muted">{t('trainees.subtitle')}</p>
        </div>
        <div className="row wrap">
          <label className="search">
            <Icon name="search" size={16} />
            <span className="sr-only">{t('common.searchTrainees')}</span>
            <input type="search" placeholder={t('trainees.searchPlaceholder')} value={query} onChange={(e) => setQuery(e.target.value)} />
          </label>
          <Link to="/coach/trainees/new" className="btn primary"><Icon name="plus" size={16} strokeWidth={2} />{t('common.newTrainee')}</Link>
        </div>
      </header>
      <Roster
        trainees={state.trainees}
        stats={stats}
        filter={filter}
        onFilter={(f) => setParams(f === 'all' ? {} : { filter: f }, { replace: true })}
        query={query}
        showSort
      />
    </>
  );
}
