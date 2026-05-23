import type { ReportBundle } from '../types/report';
import { WorkspacePanel, MetricCard, SectionHeader } from './ui';
import { BrandTopicScorecard } from './BrandTopicScorecard';

export function ExecutiveReport({ report }: { report: ReportBundle }) {
  const metrics = report.executive.headlineMetrics;
  const score = metrics.brandScore ?? 0;
  const queryCount = metrics.queryCount ?? report.queries.length;
  const geo = metrics.averageOwnedGeoScore120 ?? 0;
  const position = score >= 60 ? 'is strongly visible' : score >= 35 ? 'has moderate AI visibility' : 'has weak AI visibility';
  const implication = score >= 60
    ? 'The priority is to defend citation quality and keep owned pages current.'
    : 'The priority is to improve owned-page extractability and strengthen external citation coverage.';
  const executiveHeadline = `${report.brand} ${position} across ${queryCount} audited queries.`;
  const executiveSubline = `AI visibility is ${score.toFixed(1)}/100 and average owned-page GEO readiness is ${geo.toFixed(1)}/120. ${implication}`;
  return (
    <div className="space-y-5">
      {/* Hero card */}
      <WorkspacePanel className="!bg-gradient-to-br !from-[#0a0a1a] !to-[#0d1117] !border-[var(--accent-blue)]/20">
        <p className="typo-meta text-[var(--accent-blue)]">Executive summary</p>
        <h1 className="mt-3 max-w-5xl typo-page text-[var(--text-primary)]">
          {executiveHeadline}
        </h1>
        <p className="mt-4 max-w-4xl text-[15px] leading-7 text-[var(--text-secondary)]">{executiveSubline}</p>
        <div className="mt-6 flex flex-wrap gap-3 text-xs text-[var(--text-muted)]">
          <span>Run: {report.runId}</span>
          <span>Evidence date: {report.evidenceDate}</span>
          <span>Market: {report.market}</span>
        </div>
      </WorkspacePanel>

      {report.parserMeta?.warnings?.length ? (
        <WorkspacePanel className="!border-amber-500/30 !bg-amber-500/10">
          <SectionHeader eyebrow="Parser notes" title="Uploaded file parsed with caveats" />
          <ul className="list-disc space-y-1 pl-5 text-sm leading-6 text-amber-300">
            {report.parserMeta.warnings.map((warning) => <li key={warning}>{warning}</li>)}
          </ul>
        </WorkspacePanel>
      ) : null}

      <div className="grid gap-4 md:grid-cols-4">
        <MetricCard label="AI visibility score" value={`${metrics.brandScore.toFixed(1)} / 100`} />
        <MetricCard label="Queries audited" value={metrics.queryCount ?? report.queries.length} />
        <MetricCard label="Avg owned GEO" value={`${(metrics.averageOwnedGeoScore120 ?? 0).toFixed(1)} / 120`} />
        <MetricCard label="Owned pages audited" value={metrics.ownedPageCount ?? report.ownedPages.length} />
      </div>

      <AiHygieneCard report={report} />

      <BrandTopicScorecard rows={report.executive.brandTopicScorecard ?? []} />

      <div className="grid gap-4 lg:grid-cols-3">
        <Narrative title="What is happening" items={report.executive.whatIsHappening} />
        <Narrative title="Why it is happening" items={report.executive.whyNow} />
        <Narrative title="Priority actions" items={report.executive.priorityActions} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {report.executive.riskIfNoAction && <Narrative title="Risk if no action" items={[report.executive.riskIfNoAction]} />}
        {report.executive.recommendedNextSteps?.length ? <Narrative title="Recommended next steps" items={report.executive.recommendedNextSteps} /> : null}
      </div>
    </div>
  );
}

function Narrative({ title, items }: { title: string; items: string[] }) {
  return (
    <WorkspacePanel>
      <SectionHeader title={title} />
      <div className="space-y-3">
        {items.length ? items.map((item) => (
          <p key={item} className="rounded-[var(--radius-sm)] bg-[var(--bg-card)] p-3 text-sm leading-6 text-[var(--text-secondary)]">
            {item}
          </p>
        )) : <p className="text-sm text-[var(--text-muted)]">No data supplied in uploaded output.</p>}
      </div>
    </WorkspacePanel>
  );
}

function AiHygieneCard({ report }: { report: ReportBundle }) {
  const hygiene = report.aiHygiene;
  if (!hygiene) return null;
  const sd = hygiene.structured_data || {};
  const priority = String(hygiene.priority || 'medium').toLowerCase();
  const priorityClass = priority === 'high' ? '!border-red-500/30 !bg-red-500/8' : priority === 'low' ? '!border-emerald-500/30 !bg-emerald-500/8' : '!border-amber-500/30 !bg-amber-500/8';
  const schemaCoverage = sd.pages_with_json_ld === undefined || sd.coverage_pct === undefined
    ? 'not checked'
    : `${sd.pages_with_json_ld}/${sd.owned_pages_total ?? 0} pages · ${sd.coverage_pct}%`;
  return (
    <WorkspacePanel className={priorityClass}>
      <SectionHeader eyebrow="AI Discoverability Hygiene" title="Priority technical controls for AI crawler and citation readiness">
        LLMs.txt is not mandatory for all AI systems, but it is useful as an explicit guidance layer for AI crawlers and agentic retrieval systems.
      </SectionHeader>
      <div className="grid gap-3 md:grid-cols-4">
        <HygieneMetric label="Robots.txt" value={hygiene.robots_txt?.status || 'not supplied'} />
        <HygieneMetric label="LLMs.txt" value={hygiene.llms_txt?.status || 'not supplied'} />
        <HygieneMetric label="JSON-LD/schema coverage" value={schemaCoverage} />
        <HygieneMetric label="Priority" value={hygiene.priority || 'not supplied'} />
      </div>
      {hygiene.summary && <p className="mt-3 rounded-[var(--radius-sm)] bg-[var(--bg-card)] p-3 text-sm leading-6 text-[var(--text-secondary)]">{hygiene.summary}</p>}
    </WorkspacePanel>
  );
}

function HygieneMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[var(--radius-sm)] bg-[var(--bg-card)] p-3">
      <p className="typo-meta text-[var(--text-muted)]">{label}</p>
      <p className="mt-1 font-semibold text-[var(--text-primary)]">{value}</p>
    </div>
  );
}
