import { useMemo, useState } from 'react';
import { XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ScatterChart, Scatter, ZAxis, Cell, LabelList } from 'recharts';
import type { CitationExample, ReportBundle } from '../types/report';
import { WorkspacePanel, SectionHeader, DarkButton } from './ui';

const label = (value: string) => value.replaceAll('_', ' ');
const palette = ['#54a2ff', '#935dff', '#00c758', '#ffea35', '#ff6568', '#9f9f9f', '#54a2ff', '#935dff'];

type Point = { x: number; sourceType: string; domain: string; count: number; url?: string; query?: string };
type AxisMode = 'sourceType' | 'domain';

function sourceCitations(report: ReportBundle): CitationExample[] {
  if (report.sourceLandscape?.sourceCitations?.length) return report.sourceLandscape.sourceCitations;
  const rows: CitationExample[] = [];
  report.queryWorkbench?.forEach((query) => {
    const items = [...(query.external_top3_benchmark ?? []), ...(query.current_ai_visibility?.top_citations ?? [])];
    items.forEach((item) => rows.push({ ...item, queryId: query.query_id, query: query.query }));
  });
  if (rows.length) return rows;
  return report.queries.flatMap((query) => query.citations.map((item) => ({ ...item, queryId: query.id, query: query.query })));
}

export function VisibilityMatrix({ report }: { report: ReportBundle }) {
  const domainsAll = useMemo(() => report.sourceLandscape?.observedNonOwnedDomains ?? [], [report.sourceLandscape?.observedNonOwnedDomains]);
  const citations = useMemo(() => sourceCitations(report), [report]);
  const [axisMode, setAxisMode] = useState<AxisMode>('sourceType');
  const [tableSearch, setTableSearch] = useState('');
  const [sortBy, setSortBy] = useState('count_desc');
  const axisValues = useMemo(() => Array.from(new Set(domainsAll.map((d) => axisMode === 'domain' ? d.domain : d.sourceType).filter(Boolean))).sort(), [domainsAll, axisMode]);
  const data: Point[] = useMemo(() => domainsAll.map((domain) => ({
    x: Math.max(0, axisValues.indexOf(axisMode === 'domain' ? domain.domain : domain.sourceType)),
    sourceType: domain.sourceType,
    domain: domain.domain,
    count: domain.observedCount || 1,
    url: domain.exampleUrl,
    query: domain.exampleQuery
  })), [domainsAll, axisValues, axisMode]);
  const tableRows = useMemo(() => {
    const grouped = new Map<string, CitationExample & { count: number }>();
    citations.forEach((item) => {
      const key = `${item.domain || item.url}|${item.sourceType}|${item.queryId || item.query}`;
      const existing = grouped.get(key);
      if (existing) existing.count += 1;
      else grouped.set(key, { ...item, count: 1 });
    });
    const term = tableSearch.trim().toLowerCase();
    return Array.from(grouped.values()).filter((item) => {
      const haystack = [item.sourceType, item.domain, item.url, item.title, item.snippet, item.queryId, item.query].join(' ').toLowerCase();
      return !term || haystack.includes(term);
    }).sort((a, b) => {
      if (sortBy === 'domain') return (a.domain || a.url).localeCompare(b.domain || b.url);
      if (sortBy === 'type') return a.sourceType.localeCompare(b.sourceType);
      return b.count - a.count;
    });
  }, [citations, tableSearch, sortBy]);

  return (
    <div className="space-y-5">
      <WorkspacePanel>
        <SectionHeader eyebrow="Source landscape" title="External and competitor sources are shaping the citation layer">
          Each dot is a citation domain. The y-axis shows citation count; switch the x-axis between source type and source domain.
        </SectionHeader>
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <DarkButton variant={axisMode === 'sourceType' ? 'primary' : 'default'} onClick={() => setAxisMode('sourceType')}>X-axis: source type</DarkButton>
          <DarkButton variant={axisMode === 'domain' ? 'primary' : 'default'} onClick={() => setAxisMode('domain')}>X-axis: domain</DarkButton>
        </div>
        <div className="h-[34rem] rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--bg-card)] p-3">
          {data.length ? (
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart margin={{ top: 20, right: 30, left: 20, bottom: 90 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" />
                <XAxis dataKey="x" type="number" domain={[-0.5, Math.max(0.5, axisValues.length - 0.5)]} ticks={axisValues.map((_, index) => index)} tickFormatter={(value) => label(axisValues[Number(value)] ?? '')} angle={-35} textAnchor="end" interval={0} height={90} tick={{ fill: 'var(--text-muted)', fontSize: 11 }} />
                <YAxis dataKey="count" name="Citation count" label={{ value: 'Citation count', angle: -90, position: 'insideLeft', fill: 'var(--text-muted)' }} tick={{ fill: 'var(--text-secondary)' }} />
                <ZAxis dataKey="count" range={[80, 420]} />
                <Tooltip cursor={{ strokeDasharray: '3 3' }} content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  const point = payload[0].payload as Point;
                  return <div className="max-w-xs rounded-[var(--radius-sm)] border border-[var(--border-subtle)] bg-[var(--bg-panel)] p-3 text-sm shadow-lg"><p className="font-semibold text-[var(--text-primary)]">{point.domain}</p><p className="text-[var(--text-secondary)]">{label(point.sourceType)} · {point.count} citations</p>{point.query ? <p className="mt-1 text-xs text-[var(--text-muted)]">{point.query}</p> : null}</div>;
                }} />
                <Scatter data={data} name="Citation domains">
                  <LabelList dataKey="domain" position="top" style={{ fill: 'var(--text-muted)', fontSize: 10 }} />
                  {data.map((point) => <Cell key={`${point.domain}-${point.sourceType}`} fill={palette[point.x % palette.length]} />)}
                </Scatter>
              </ScatterChart>
            </ResponsiveContainer>
          ) : <Empty>No observed non-owned domain array was found in the uploaded file.</Empty>}
        </div>
      </WorkspacePanel>
      <WorkspacePanel>
        <SectionHeader eyebrow="Citation evidence" title={`Captured source citations (${tableRows.length})`}>
          Source type, domain and citation text evidence captured from AI citation responses.
        </SectionHeader>
        <div className="mb-4 grid gap-3 md:grid-cols-2">
          <input className="rounded-[var(--radius-sm)] border border-[var(--border-subtle)] bg-[var(--bg-card)] px-3 py-2 text-sm text-[var(--text-primary)]" placeholder="Search source, query, snippet…" value={tableSearch} onChange={(event) => setTableSearch(event.target.value)} />
          <select className="rounded-[var(--radius-sm)] border border-[var(--border-subtle)] bg-[var(--bg-card)] px-3 py-2 text-sm text-[var(--text-primary)]" value={sortBy} onChange={(event) => setSortBy(event.target.value)}>
            <option value="count_desc">Sort: citation count</option>
            <option value="domain">Sort: domain</option>
            <option value="type">Sort: source type</option>
          </select>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead><tr className="text-left"><th className="typo-meta px-3 py-3 text-[var(--text-muted)]">Type</th><th className="typo-meta px-3 py-3 text-[var(--text-muted)]">Domain</th><th className="typo-meta px-3 py-3 text-[var(--text-muted)]">Query</th><th className="typo-meta px-3 py-3 text-[var(--text-muted)]">Citation evidence</th></tr></thead>
            <tbody>
              {tableRows.slice(0, 200).map((item, index) => (
                <tr key={`${item.url}-${item.queryId}-${index}`} className="align-top">
                  <td className="px-3 py-4 text-[var(--text-secondary)]">{label(item.sourceType || 'unknown')}</td>
                  <td className="px-3 py-4"><p className="font-semibold text-[var(--text-primary)]">{item.domain || 'not supplied'}</p>{item.url && <p className="break-all text-xs text-[var(--text-muted)]">{item.url}</p>}</td>
                  <td className="px-3 py-4"><p className="font-mono text-xs text-[var(--text-muted)]">{item.queryId}</p><p className="max-w-xs text-[var(--text-secondary)]">{item.query}</p></td>
                  <td className="max-w-lg px-3 py-4 text-[var(--text-secondary)]"><p className="font-medium text-[var(--text-primary)]">{item.title}</p>{item.snippet ? <p className="mt-1">{item.snippet}</p> : <p className="mt-1 text-[var(--text-muted)]">Citation text not supplied.</p>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </WorkspacePanel>
    </div>
  );
}

function Empty({ children }: { children: string }) {
  return <div className="flex h-full items-center justify-center text-center text-sm text-[var(--text-muted)]">{children}</div>;
}
