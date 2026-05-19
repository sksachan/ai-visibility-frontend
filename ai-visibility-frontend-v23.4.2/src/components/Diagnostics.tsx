import { useMemo, useState, type ReactNode } from 'react';
import type { OwnedPage, QueryDiagnostic, ReportBundle } from '../types/report';
import { Badge, Card, SectionTitle } from './ui';

const statusTone = (value: string) => value.includes('competitor') || value.includes('external') ? 'high' : value.includes('owned_domain') ? 'medium' : value.includes('target') ? 'low' : 'neutral';
const unique = (values: string[]) => Array.from(new Set(values.filter(Boolean))).sort();
const sourceLabel = (value: string) => value.replaceAll('_', ' ');
const cleanStatus = (value: string) => value.replaceAll('_', ' ');

export function QueryDiagnostics({ report }: { report: ReportBundle }) {
  const [search, setSearch] = useState('');
  const [journey, setJourney] = useState('All');
  const [status, setStatus] = useState('All');
  const [sortBy, setSortBy] = useState('visibility_asc');

  const journeys = useMemo(() => unique(report.queries.map((q) => q.journey)), [report.queries]);
  const statuses = useMemo(() => unique(report.queries.map((q) => q.visibilityStatus)), [report.queries]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    const rows = report.queries.filter((item) => {
      const matchesSearch = !term || [item.id, item.query, item.journey, item.leadingPublisher, ...(item.competitorBrands ?? []), ...item.winningExternalSourceTypes].join(' ').toLowerCase().includes(term);
      const matchesJourney = journey === 'All' || item.journey === journey;
      const matchesStatus = status === 'All' || item.visibilityStatus === status;
      return matchesSearch && matchesJourney && matchesStatus;
    });
    return [...rows].sort((a, b) => {
      if (sortBy === 'visibility_desc') return (b.aiVisibilityScore ?? 0) - (a.aiVisibilityScore ?? 0);
      if (sortBy === 'competitors_desc') return (b.competitorCitationCount ?? 0) - (a.competitorCitationCount ?? 0);
      if (sortBy === 'citations_desc') return b.citations.length - a.citations.length;
      return (a.aiVisibilityScore ?? 0) - (b.aiVisibilityScore ?? 0);
    });
  }, [report.queries, search, journey, status, sortBy]);

  return (
    <Card>
      <SectionTitle eyebrow="Query diagnostics" title={`Query-level AI visibility, competitor pressure and citation evidence (${filtered.length}/${report.queries.length})`}>
        Filter the 50-query portfolio by journey, visibility status, competitor presence or source domain. Scores are observed AI visibility scores for Nissan from the uploaded Bodhi output.
      </SectionTitle>
      <Controls>
        <input className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm" placeholder="Search query, competitor, source domain..." value={search} onChange={(event) => setSearch(event.target.value)} />
        <select className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm" value={journey} onChange={(event) => setJourney(event.target.value)}>
          <option>All</option>{journeys.map((item) => <option key={item}>{item}</option>)}
        </select>
        <select className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm" value={status} onChange={(event) => setStatus(event.target.value)}>
          <option>All</option>{statuses.map((item) => <option key={item}>{item}</option>)}
        </select>
        <select className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm" value={sortBy} onChange={(event) => setSortBy(event.target.value)}>
          <option value="visibility_asc">Sort: lowest Nissan visibility</option>
          <option value="visibility_desc">Sort: highest Nissan visibility</option>
          <option value="competitors_desc">Sort: most competitor citations</option>
          <option value="citations_desc">Sort: most citation evidence</option>
        </select>
      </Controls>
      <div className="grid gap-4 lg:grid-cols-2">
        {filtered.map((item) => <QueryCard key={item.id} item={item} />)}
      </div>
    </Card>
  );
}

function QueryCard({ item }: { item: QueryDiagnostic }) {
  const competitors = item.competitorBrands?.length ? item.competitorBrands.join(', ') : item.leadingCompetitor !== 'No competitor source flagged' ? item.leadingCompetitor : 'None flagged';
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{item.id} · {item.journey}</p>
          <p className="mt-1 text-sm font-semibold leading-6 text-slate-950">{item.query}</p>
        </div>
        <Badge tone={statusTone(item.visibilityStatus)}>{cleanStatus(item.visibilityStatus || 'unknown')}</Badge>
      </div>
      <dl className="mt-4 grid grid-cols-2 gap-3 text-sm md:grid-cols-4">
        <Metric label="Nissan AI visibility" value={`${item.aiVisibilityScore ?? 0}/100`} />
        <Metric label="Owned target cited" value={item.ownedTargetPageCited ? 'Yes' : 'No'} />
        <Metric label="Competitors" value={competitors} />
        <Metric label="Competitor citations" value={String(item.competitorCitationCount ?? 0)} />
      </dl>
      <div className="mt-4 text-sm leading-6 text-slate-700">
        <p><span className="font-semibold text-slate-950">Winning source types:</span> {item.winningExternalSourceTypes.map(sourceLabel).join(', ') || 'Not supplied'}</p>
        <p><span className="font-semibold text-slate-950">Leading citation domain:</span> {item.leadingPublisher}</p>
      </div>
      {item.citations.length ? (
        <details className="mt-3 rounded-xl bg-white p-3 text-sm text-slate-700">
          <summary className="cursor-pointer font-semibold text-slate-950">View {item.citations.length} citation examples</summary>
          <div className="mt-3 space-y-3">
            {item.citations.slice(0, 5).map((citation) => (
              <div key={`${item.id}-${citation.url}`} className="border-t border-slate-100 pt-3">
                <p className="font-semibold text-slate-900">{citation.domain || citation.title}</p>
                <p className="text-xs text-slate-500">{sourceLabel(citation.sourceType)} · position {citation.citationPosition ?? 'n/a'}{citation.isCompetitor ? ' · competitor' : ''}</p>
                {citation.url && <p className="break-all text-xs text-slate-500">{citation.url}</p>}
                {citation.snippet && <p className="mt-1 text-sm leading-5 text-slate-600">{citation.snippet}</p>}
              </div>
            ))}
          </div>
        </details>
      ) : null}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return <div><dt className="text-slate-500">{label}</dt><dd className="font-semibold text-slate-900">{value}</dd></div>;
}

function Controls({ children }: { children: ReactNode }) {
  return <div className="mb-5 grid gap-3 md:grid-cols-2 lg:grid-cols-4">{children}</div>;
}

export function OwnedUrlReadiness({ report }: { report: ReportBundle }) {
  const [search, setSearch] = useState('');
  const [journey, setJourney] = useState('All');
  const [sortBy, setSortBy] = useState('score_asc');
  const journeys = useMemo(() => unique(report.ownedPages.map((p) => p.journeyCategory)), [report.ownedPages]);
  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    const rows = report.ownedPages.filter((page) => {
      const matchesSearch = !term || [page.url, page.title, page.journeyCategory, ...page.relatedQueries.map((q) => q.query), ...page.diagnostics].join(' ').toLowerCase().includes(term);
      const matchesJourney = journey === 'All' || page.journeyCategory === journey;
      return matchesSearch && matchesJourney;
    });
    return [...rows].sort((a, b) => {
      if (sortBy === 'score_desc') return b.geoScore - a.geoScore;
      if (sortBy === 'queries_desc') return b.relatedQueries.length - a.relatedQueries.length;
      return a.geoScore - b.geoScore;
    });
  }, [report.ownedPages, search, journey, sortBy]);

  return (
    <Card>
      <SectionTitle eyebrow="Owned URL GEO readiness" title={`Owned-page readiness records (${filtered.length}/${report.ownedPages.length})`}>
        Use filters to isolate low-scoring pages, journeys and mapped-query coverage.
      </SectionTitle>
      <Controls>
        <input className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm" placeholder="Search URL, title, query, gap..." value={search} onChange={(event) => setSearch(event.target.value)} />
        <select className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm" value={journey} onChange={(event) => setJourney(event.target.value)}>
          <option>All</option>{journeys.map((item) => <option key={item}>{item}</option>)}
        </select>
        <select className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm" value={sortBy} onChange={(event) => setSortBy(event.target.value)}>
          <option value="score_asc">Sort: lowest GEO score</option>
          <option value="score_desc">Sort: highest GEO score</option>
          <option value="queries_desc">Sort: most mapped queries</option>
        </select>
      </Controls>
      <OwnedTable pages={filtered} />
      <div className="mt-4 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        {filtered.slice(0, 12).map((page) => <OwnedPageCard key={`${page.url}-diag`} page={page} />)}
      </div>
    </Card>
  );
}

function OwnedTable({ pages }: { pages: OwnedPage[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-slate-200 text-sm">
        <thead>
          <tr className="text-left text-xs uppercase tracking-wide text-slate-500">
            <th className="px-3 py-3">Owned URL</th><th className="px-3 py-3">Journey</th><th className="px-3 py-3">Score /120</th><th className="px-3 py-3">Clarity</th><th className="px-3 py-3">Depth</th><th className="px-3 py-3">Structured data</th><th className="px-3 py-3">E-E-A-T</th><th className="px-3 py-3">Freshness</th><th className="px-3 py-3">FAQ</th><th className="px-3 py-3">Related queries</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {pages.map((page) => (
            <tr key={page.url} className="align-top">
              <td className="max-w-sm px-3 py-4 font-medium text-slate-950"><p className="break-all">{page.url}</p>{page.title && <p className="mt-1 text-xs text-slate-500">{page.title}</p>}</td>
              <td className="max-w-xs px-3 py-4 text-slate-600">{page.journeyCategory}</td>
              <td className="px-3 py-4 font-semibold text-slate-950">{page.geoScore}</td><td className="px-3 py-4">{page.clarity}</td><td className="px-3 py-4">{page.semanticDepth}</td><td className="px-3 py-4">{page.structure}</td><td className="px-3 py-4">{page.evidence}</td><td className="px-3 py-4">{page.freshness}</td><td className="px-3 py-4">{page.faqReadiness ?? 0}</td><td className="px-3 py-4">{page.relatedQueries.length}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function OwnedPageCard({ page }: { page: OwnedPage }) {
  return (
    <div className="rounded-xl bg-slate-50 p-3">
      <p className="break-all text-sm font-semibold text-slate-900">{page.url}</p>
      <p className="mt-1 text-xs text-slate-500">{page.scoreBand || 'unbanded'} · {page.evidenceMatchStatus}</p>
      <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-600">
        {page.diagnostics.map((diag) => <li key={diag}>{diag}</li>)}
      </ul>
      {page.relatedQueries.length ? (
        <details className="mt-2 text-sm text-slate-600">
          <summary className="cursor-pointer font-semibold text-slate-800">Mapped queries</summary>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            {page.relatedQueries.slice(0, 5).map((query) => <li key={query.id}>{query.id}: {query.query}</li>)}
          </ul>
        </details>
      ) : null}
    </div>
  );
}
