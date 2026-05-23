import { useMemo, useState, type ReactNode } from 'react';
import type { OwnedPage, ReportBundle } from '../types/report';
import { WorkspacePanel, SectionHeader, DarkButton } from './ui';

const unique = (values: string[]) => Array.from(new Set(values.filter(Boolean))).sort();
type SortKey = keyof Pick<OwnedPage, 'url' | 'journeyCategory' | 'geoScore' | 'clarity' | 'semanticDepth' | 'structure' | 'evidence' | 'freshness' | 'faqReadiness'> | 'relatedQueries';
type SortState = { key: SortKey; direction: 'asc' | 'desc' };

export function QueryDiagnostics() {
  return <WorkspacePanel><SectionHeader eyebrow="Query diagnostics" title="Query diagnostics have moved into Query workbench">Open the Query workbench tab for query-level AI visibility, competitors, winning source types and leading citation domains.</SectionHeader></WorkspacePanel>;
}

export function OwnedUrlReadiness({ report, onOpenCms }: { report: ReportBundle; onOpenCms?: (url: string) => void }) {
  const [search, setSearch] = useState('');
  const [scope, setScope] = useState('All scored owned URLs');
  const [sort, setSort] = useState<SortState>({ key: 'geoScore', direction: 'asc' });
  const cmsUrls = useMemo(() => new Set(report.cmsModules.map((item) => normaliseUrl(item.targetUrl)).filter(Boolean)), [report.cmsModules]);
  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    const rows = report.ownedPages.filter((page) => {
      const matchesSearch = !term || [page.url, page.title, ...page.relatedQueries.map((q) => q.query), ...page.diagnostics].join(' ').toLowerCase().includes(term);
      const hasCms = cmsUrls.has(normaliseUrl(page.url));
      const isQueryMapped = page.queryMapped === true || hasCms;
      const matchesScope = scope === 'All scored owned URLs' || (scope === 'Mapped/CMS URLs' ? isQueryMapped : !isQueryMapped);
      return matchesSearch && matchesScope;
    });
    return [...rows].sort((a, b) => {
      const dir = sort.direction === 'asc' ? 1 : -1;
      const av = sort.key === 'relatedQueries' ? a.relatedQueries.length : a[sort.key] ?? 0;
      const bv = sort.key === 'relatedQueries' ? b.relatedQueries.length : b[sort.key] ?? 0;
      if (typeof av === 'string' || typeof bv === 'string') return String(av).localeCompare(String(bv)) * dir;
      return (Number(av) - Number(bv)) * dir;
    });
  }, [report.ownedPages, cmsUrls, search, scope, sort]);

  function toggle(key: SortKey) {
    setSort((current) => current.key === key ? { key, direction: current.direction === 'asc' ? 'desc' : 'asc' } : { key, direction: 'asc' });
  }

  return (
    <WorkspacePanel>
      <SectionHeader eyebrow="Owned URL GEO readiness" title={`Owned-page readiness records (${filtered.length}/${report.ownedPages.length})`}>
        Site-level readiness includes inventory URLs selected from sitemap/robots plus query-mapped CMS pages.
      </SectionHeader>
      <div className="mb-5 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        <input className="rounded-[var(--radius-sm)] border border-[var(--border-subtle)] bg-[var(--bg-card)] px-3 py-2 text-sm text-[var(--text-primary)]" placeholder="Search URL, title, query, gap…" value={search} onChange={(event) => setSearch(event.target.value)} />
        <select className="rounded-[var(--radius-sm)] border border-[var(--border-subtle)] bg-[var(--bg-card)] px-3 py-2 text-sm text-[var(--text-primary)]" value={scope} onChange={(event) => setScope(event.target.value)}>
          <option>All scored owned URLs</option>
          <option>Mapped/CMS URLs</option>
          <option>Inventory only</option>
        </select>
      </div>
      <OwnedTable pages={filtered} cmsUrls={cmsUrls} sort={sort} onSort={toggle} onOpenCms={onOpenCms} />
      <div className="mt-4 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        {filtered.slice(0, 12).map((page) => <OwnedPageCard key={`${page.url}-diag`} page={page} />)}
      </div>
    </WorkspacePanel>
  );
}

function normaliseUrl(value: string | undefined) {
  return String(value || '').trim().replace(/#.*$/, '').replace(/\/$/, '').toLowerCase();
}

function SortHeader({ label, sortKey, sort, onSort }: { label: string; sortKey: SortKey; sort: SortState; onSort: (key: SortKey) => void }) {
  const arrow = sort.key === sortKey ? (sort.direction === 'asc' ? '↑' : '↓') : '⇕';
  return <button type="button" className="inline-flex items-center gap-1 font-semibold text-[var(--text-muted)]" onClick={() => onSort(sortKey)}>{label} <span>{arrow}</span></button>;
}

function OwnedTable({ pages, cmsUrls, sort, onSort, onOpenCms }: { pages: OwnedPage[]; cmsUrls: Set<string>; sort: SortState; onSort: (key: SortKey) => void; onOpenCms?: (url: string) => void }) {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-sm">
        <thead>
          <tr className="text-left">
            <th className="px-3 py-3"><SortHeader label="Owned URL" sortKey="url" sort={sort} onSort={onSort} /></th>
            <th className="px-3 py-3"><SortHeader label="Score /120" sortKey="geoScore" sort={sort} onSort={onSort} /></th>
            <th className="px-3 py-3"><SortHeader label="Clarity" sortKey="clarity" sort={sort} onSort={onSort} /></th>
            <th className="px-3 py-3"><SortHeader label="Depth" sortKey="semanticDepth" sort={sort} onSort={onSort} /></th>
            <th className="px-3 py-3"><SortHeader label="Structured" sortKey="structure" sort={sort} onSort={onSort} /></th>
            <th className="px-3 py-3"><SortHeader label="E-E-A-T" sortKey="evidence" sort={sort} onSort={onSort} /></th>
            <th className="px-3 py-3"><SortHeader label="Freshness" sortKey="freshness" sort={sort} onSort={onSort} /></th>
            <th className="px-3 py-3"><SortHeader label="FAQ" sortKey="faqReadiness" sort={sort} onSort={onSort} /></th>
            <th className="px-3 py-3"><SortHeader label="Queries" sortKey="relatedQueries" sort={sort} onSort={onSort} /></th>
            <th className="px-3 py-3 typo-meta text-[var(--text-muted)]">Technical</th>
            <th className="px-3 py-3 typo-meta text-[var(--text-muted)]">CMS</th>
          </tr>
        </thead>
        <tbody>
          {pages.map((page) => (
            <tr key={page.url} className="align-top">
              <td className="max-w-sm px-3 py-4 font-medium text-[var(--text-primary)]"><p className="break-all">{page.url}</p>{page.title && <p className="mt-1 text-xs text-[var(--text-muted)]">{page.title}</p>}<p className="mt-1 typo-meta text-[var(--text-muted)]">{page.queryMapped || cmsUrls.has(normaliseUrl(page.url)) ? 'Mapped/CMS' : 'Inventory only'} · {page.inventorySource || 'sitemap_inventory'}</p></td>
              <td className="px-3 py-4"><p className="font-semibold text-[var(--text-primary)]">{page.geoScore}</p><ScoreMethod page={page} /></td>
              <td className="px-3 py-4 text-[var(--text-secondary)]">{page.clarity}</td>
              <td className="px-3 py-4 text-[var(--text-secondary)]">{page.semanticDepth}</td>
              <td className="px-3 py-4 text-[var(--text-secondary)]">{page.structure}</td>
              <td className="px-3 py-4 text-[var(--text-secondary)]">{page.evidence}</td>
              <td className="px-3 py-4 text-[var(--text-secondary)]">{page.freshness}</td>
              <td className="px-3 py-4 text-[var(--text-secondary)]">{page.faqReadiness ?? 0}</td>
              <td className="px-3 py-4 text-[var(--text-secondary)]">{page.relatedQueries.length}</td>
              <td className="px-3 py-4"><TechnicalSignals page={page} /></td>
              <td className="px-3 py-4">{cmsUrls.has(normaliseUrl(page.url)) ? <DarkButton variant="primary" onClick={() => onOpenCms?.(page.url)}>Open CMS</DarkButton> : <span className="text-xs text-[var(--text-muted)]">No CMS copy</span>}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function scoreMethodLabel(method?: string) {
  if (!method) return '';
  if (method.startsWith('explicit')) return 'Page GEO';
  if (method.startsWith('crawl_evidence')) return 'Crawl scored';
  if (method.startsWith('fallback_limited')) return 'Fallback';
  return method.replace(/_/g, ' ');
}

function ScoreMethod({ page }: { page: OwnedPage }) {
  const lbl = scoreMethodLabel(page.scoringMethod);
  if (!lbl) return null;
  const isFallback = page.scoringMethod?.startsWith('fallback_limited');
  const tone = isFallback ? 'border-amber-500/30 bg-amber-500/10 text-amber-300' : 'border-[var(--border-subtle)] bg-[var(--bg-panel)] text-[var(--text-muted)]';
  return <span title={page.scoringNotes || undefined} className={`mt-1 inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold ${tone}`}>{lbl}</span>;
}

function OwnedPageCard({ page }: { page: OwnedPage }) {
  return (
    <div className="rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--bg-card)] p-3 hover:bg-[var(--bg-card-hover)] transition-colors">
      <p className="break-all text-sm font-semibold text-[var(--text-primary)]">{page.url}</p>
      <p className="mt-1 text-xs text-[var(--text-muted)]">{page.scoreBand || 'unbanded'} · {page.evidenceMatchStatus}{page.scoringMethod ? ` · ${scoreMethodLabel(page.scoringMethod)}` : ''}</p>
      {page.scoringNotes ? <p className="mt-1 text-xs leading-5 text-[var(--text-muted)]">{page.scoringNotes}</p> : null}
      <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-[var(--text-secondary)]">
        {page.diagnostics.map((diag) => <li key={diag}>{diag}</li>)}
      </ul>
      {page.relatedQueries.length ? (
        <details className="mt-2 text-sm text-[var(--text-secondary)]">
          <summary className="cursor-pointer font-semibold text-[var(--text-primary)]">Mapped queries</summary>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            {page.relatedQueries.slice(0, 5).map((query) => <li key={query.id}>{query.id}: {query.query}</li>)}
          </ul>
        </details>
      ) : null}
    </div>
  );
}

function TechnicalSignals({ page }: { page: OwnedPage }) {
  const tech = page.technicalSignals || {};
  const schemaTypes = tech.schemaTypes || [];
  const jsonLdQuality = tech.jsonLdPresent === undefined
    ? 'Not checked'
    : tech.jsonLdPresent
      ? (schemaTypes.length >= 2 ? 'Present · good' : 'Present · partial')
      : 'Missing';
  const tone = jsonLdQuality.startsWith('Present · good') ? 'status-owned-target'
    : jsonLdQuality.startsWith('Present') ? 'border-amber-500/30 bg-amber-500/10 text-amber-300'
    : jsonLdQuality.startsWith('Not checked') ? 'border-[var(--border-subtle)] bg-[var(--bg-panel)] text-[var(--text-muted)]'
    : 'border-red-500/30 bg-red-500/10 text-red-400';
  const supporting = [
    tech.canonicalUrl ? 'canonical' : '',
    tech.metaDescriptionPresent ? 'meta desc' : '',
    tech.crawlStatus === 'success' ? 'crawled' : '',
    tech.wordCount ? `${tech.wordCount} words` : ''
  ].filter(Boolean);
  return (
    <div className="min-w-[180px] space-y-1">
      <span className={`inline-flex rounded-full border px-2 py-1 text-[11px] font-semibold ${tone}`}>JSON-LD: {jsonLdQuality}</span>
      {schemaTypes.length ? <p className="text-[11px] leading-4 text-[var(--text-muted)]">Schema: {schemaTypes.slice(0, 3).join(', ')}{schemaTypes.length > 3 ? '…' : ''}</p> : null}
      {supporting.length ? <p className="text-[11px] leading-4 text-[var(--text-muted)]">{supporting.join(' · ')}</p> : null}
    </div>
  );
}
