import { memo, useMemo, useState } from 'react';
import { ArrowUpRight, ChevronRight, Search } from 'lucide-react';
import { safeLink } from './feed-model.mjs';

const KINDS = { publisher: 'Newsrooms', official: 'Official updates', research: 'Research' };

const EMPTY_SOURCES = [];

export default memo(function SourceCoverage({ info, loading, error, onReadSource }) {
  const [query, setQuery] = useState('');
  const [kind, setKind] = useState('all');
  const sources = Array.isArray(info?.sources) ? info.sources : EMPTY_SOURCES;
  const available = sources.filter(source => source.ok).length;
  const publishers = new Set(sources.map(source => source.publisher || source.name)).size;
  const filtered = useMemo(() => sources.filter(source =>
    (kind === 'all' || source.kind === kind) &&
    `${source.name} ${source.publisher || ''}`.toLowerCase().includes(query.trim().toLowerCase())
  ), [sources, kind, query]);
  return (
    <section className="panel sources-panel">
      <h3>Independent intelligence</h3>
      <div className="source-state">
        <span className={`live-dot ${error ? 'muted-dot' : ''}`} />
        <span>{loading ? 'Checking the news wires' : sources.length ? `${available} of ${sources.length} feeds responding` : 'Source check unavailable'}</span>
      </div>
      {!loading && <p className="coverage-caption">{publishers} publisher groups · past 24h only</p>}
      {!!sources.length && <div className="coverage-groups">
        {Object.entries(KINDS).map(([id, label]) => {
          const group = sources.filter(source => source.kind === id);
          return group.length ? <div key={id}><span>{label}</span><strong>{group.filter(source => source.ok).length}<small> / {group.length}</small></strong></div> : null;
        })}
      </div>}
      {info && <details className="source-details">
        <summary>Explore the sources <ChevronRight size={12} /></summary>
        <div>
          <label className="source-filter"><Search size={13} /><input aria-label="Find a news source" placeholder="Find a source..." value={query} maxLength={100} onChange={event => setQuery(event.target.value)} /></label>
          <select aria-label="Source type" value={kind} onChange={event => setKind(event.target.value)}>
            <option value="all">All source types</option>
            {Object.entries(KINDS).map(([id, label]) => <option key={id} value={id}>{label}</option>)}
          </select>
          <div className="source-wire-list">
            {filtered.map(source => <div className="source-wire" key={source.id}>
              <div>
                <button onClick={() => onReadSource(source.name)} title={`Search news mentioning ${source.name}`}>{source.name}</button>
                <small>{KINDS[source.kind] || 'Publisher'} · {source.articleCount || 0} fresh entries</small>
              </div>
              <span className={source.ok ? 'green' : ''}>{source.ok ? 'ONLINE' : source.deferred ? 'QUEUED' : 'RETRYING'}</span>
              {safeLink(source.siteUrl) && <a href={safeLink(source.siteUrl)} target="_blank" rel="noopener noreferrer" aria-label={`Visit ${source.name}`} title={source.trustReason || 'Visit original publisher'}><ArrowUpRight size={13} /></a>}
            </div>)}
            {!filtered.length && <p>No sources match this filter.</p>}
          </div>
          <p className="coverage-note">Source availability and publishing schedules vary. Only fresh AI reporting enters your feed.</p>
        </div>
      </details>}
    </section>
  );
});
