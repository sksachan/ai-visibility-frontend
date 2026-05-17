import { useMemo, useState } from 'react';
import { XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Legend, Treemap } from 'recharts';
import type { ReportBundle } from '../types/report';
import { Badge, Card, SectionTitle } from './ui';

const label = (value: string) => value.replaceAll('_', ' ');
const unique = (values: string[]) => Array.from(new Set(values.filter(Boolean))).sort();
const sourceFocus = (sourceType: string) => {
  const type = sourceType.toLowerCase();
  if (type.includes('forum') || type.includes('social')) return 'Mine recurring user questions and convert them into official FAQ answers.';
  if (type.includes('publisher') || type.includes('review')) return 'Replicate comparison structure, proof points and neutral review-style explanations on owned pages.';
  if (type.includes('competitor')) return 'Create clear Nissan-vs-alternative proof modules for the affected buyer questions.';
  if (type.includes('authority')) return 'Reference official safety, subsidy or standards evidence in owned explanatory modules.';
  if (type.includes('finance') || type.includes('insurance')) return 'Add transparent finance, warranty, running-cost and ownership-cost explainers.';
  if (type.includes('partner') || type.includes('infrastructure')) return 'Use partner/infrastructure evidence to support charging, servicing and compatibility content.';
  return 'Use the observed cited page format as a pattern for answer-first owned content and PR proof assets.';
};

export function VisibilityMatrix({ report }: { report: ReportBundle }) {
  const [sourceFilter, setSourceFilter] = useState('All');
  const [domainSort, setDomainSort] = useState('count_desc');

  const sourceCounts = useMemo(() => report.sourceLandscape?.sourceTypeCounts ?? [], [report.sourceLandscape?.sourceTypeCounts]);
  const domainsAll = useMemo(() => report.sourceLandscape?.observedNonOwnedDomains ?? [], [report.sourceLandscape?.observedNonOwnedDomains]);
  const sourceTypes = useMemo(() => unique([...sourceCounts.map((s) => s.sourceType), ...domainsAll.map((d) => d.sourceType)]), [sourceCounts, domainsAll]);
  const domains = useMemo(() => {
    const rows = domainsAll.filter((domain) => sourceFilter === 'All' || domain.sourceType === sourceFilter);
    return [...rows].sort((a, b) => domainSort === 'alpha' ? a.domain.localeCompare(b.domain) : b.observedCount - a.observedCount).slice(0, 20);
  }, [domainsAll, sourceFilter, domainSort]);

  const patterns = useMemo(() => {
    const explicit = report.sourceLandscape?.winningSourcePatterns ?? [];
    const byType = new Map(sourceCounts.map((item) => [item.sourceType, item.count]));
    return sourceTypes.map((sourceType) => {
      const explicitPattern = explicit.find((p) => p.sourceType === sourceType);
      const topDomains = domainsAll.filter((d) => d.sourceType === sourceType).sort((a, b) => b.observedCount - a.observedCount).slice(0, 4);
      return {
        sourceType,
        citationCount: explicitPattern?.citationCount || byType.get(sourceType) || topDomains.reduce((sum, d) => sum + d.observedCount, 0),
        winningPattern: explicitPattern?.winningPattern || sourceFocus(sourceType),
        focus: sourceFocus(sourceType),
        topDomains
      };
    }).sort((a, b) => b.citationCount - a.citationCount);
  }, [report.sourceLandscape?.winningSourcePatterns, sourceCounts, sourceTypes, domainsAll]);

  return (
    <div className="space-y-5">
      <Card>
        <SectionTitle eyebrow="Source landscape" title="External and competitor sources are shaping the citation layer">
          Source-type counts and observed domains are read from the uploaded Bodhi Preview Node bundle. Use filters to isolate citation patterns by source category.
        </SectionTitle>
        <div className="mb-5 grid gap-3 md:grid-cols-3">
          <select className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm" value={sourceFilter} onChange={(event) => setSourceFilter(event.target.value)}>
            <option>All</option>{sourceTypes.map((item) => <option key={item}>{item}</option>)}
          </select>
          <select className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm" value={domainSort} onChange={(event) => setDomainSort(event.target.value)}>
            <option value="count_desc">Sort domains: most observed</option>
            <option value="alpha">Sort domains: A-Z</option>
          </select>
          <div className="rounded-xl bg-slate-50 px-3 py-2 text-sm text-slate-600">Showing {domains.length} domains from {domainsAll.length} observed domains</div>
        </div>
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="h-96 rounded-2xl bg-slate-50 p-3">
            {sourceCounts.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={sourceCounts} layout="vertical" margin={{ top: 10, right: 20, left: 110, bottom: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis dataKey="sourceType" type="category" width={150} tickFormatter={label} />
                  <Tooltip formatter={(value, name) => [value, String(name)]} labelFormatter={(value) => label(String(value))} />
                  <Legend />
                  <Bar dataKey="count" name="Observed citations / sources" fill="#334155" />
                </BarChart>
              </ResponsiveContainer>
            ) : <Empty>No source-type count array was found in the uploaded file.</Empty>}
          </div>
          <div className="h-96 rounded-2xl bg-slate-50 p-3">
            {domains.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <Treemap data={domains.map((d) => ({ name: d.domain, size: d.observedCount || 1, sourceType: label(d.sourceType) }))} dataKey="size" nameKey="name" aspectRatio={4 / 3} stroke="#fff" fill="#64748b" />
              </ResponsiveContainer>
            ) : <Empty>No observed domain matches the selected filter.</Empty>}
          </div>
        </div>
      </Card>

      <Card>
        <SectionTitle eyebrow="Winning source patterns" title="Source-specific patterns to copy into owned pages and PR assets">
          These cards combine source-type counts, observed domains and pattern guidance so the section does not repeat generic copy.
        </SectionTitle>
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {patterns.map((pattern) => (
            <div key={pattern.sourceType} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="text-sm font-semibold capitalize text-slate-950">{label(pattern.sourceType)}</div>
                <Badge tone={pattern.citationCount > 20 ? 'high' : pattern.citationCount > 5 ? 'medium' : 'neutral'}>{pattern.citationCount}</Badge>
              </div>
              <p className="mt-3 text-sm leading-6 text-slate-700">{pattern.focus}</p>
              {pattern.topDomains.length ? (
                <div className="mt-3 rounded-xl bg-white p-3 text-xs leading-5 text-slate-600">
                  <p className="font-semibold text-slate-900">Observed domains</p>
                  {pattern.topDomains.map((domain) => <p key={domain.domain} className="truncate">{domain.domain} · {domain.observedCount}</p>)}
                </div>
              ) : null}
              {pattern.winningPattern && pattern.winningPattern !== pattern.focus ? <p className="mt-3 text-xs leading-5 text-slate-500">{pattern.winningPattern}</p> : null}
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

function Empty({ children }: { children: string }) {
  return <div className="flex h-full items-center justify-center text-center text-sm text-slate-500">{children}</div>;
}
