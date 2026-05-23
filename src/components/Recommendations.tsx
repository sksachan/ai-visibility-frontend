import { useMemo, useState, useEffect } from 'react';
import type { ActionItem, RecommendationModule, ReportBundle, CmsCopyModule, AdvancedGeoAsset, AdvancedPrAssetPack } from '../types/report';
import { Badge, Card, SectionTitle } from './ui';

const tone = (priority: string) => priority === 'High' ? 'high' : priority === 'Medium' ? 'medium' : 'low';
const unique = (values: string[]) => Array.from(new Set(values.filter(Boolean))).sort();
const label = (value = '') => value.replaceAll('_', ' ');

export function Recommendations({ report }: { report: ReportBundle }) {
  return <CmsRecommendations report={report} />;
}

export function CmsRecommendations({ report, highlightUrl }: { report: ReportBundle; highlightUrl?: string }) {
  return <RecommendationPanel title={`Page-level CMS recommendations (${report.cmsModules.length})`} eyebrow="Content remediation" items={report.cmsModules} type="cms" highlightUrl={highlightUrl} />;
}

export function PrRecommendations({ report }: { report: ReportBundle }) {
  return <RecommendationPanel title={`Grouped PR opportunities (${report.prOpportunities.length})`} eyebrow="External evidence" items={report.prOpportunities} type="pr" />;
}

function RecommendationPanel({ title, eyebrow, items, type, highlightUrl }: { title: string; eyebrow: string; items: RecommendationModule[]; type: 'cms' | 'pr'; highlightUrl?: string }) {
  const [search, setSearch] = useState('');
  const [priority, setPriority] = useState('All');
  const [journey, setJourney] = useState('All');
  const [sortBy, setSortBy] = useState('priority');
  const journeys = useMemo(() => unique(items.map((item) => item.journeyCategory ?? '')), [items]);
  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    const rows = items.filter((item) => {
      const matchesSearch = !term || [item.title, item.targetUrl, item.recommendation, item.evidencePattern, item.journeyCategory, ...(item.targetSourceTypes ?? []), ...(item.linkedQueryIds ?? []), ...(item.observedExternalDomains ?? []).map((d) => d.domain)].join(' ').toLowerCase().includes(term);
      const matchesPriority = priority === 'All' || item.priority === priority;
      const matchesJourney = journey === 'All' || item.journeyCategory === journey;
      return matchesSearch && matchesPriority && matchesJourney;
    });
    const priorityWeight = { High: 3, Medium: 2, Low: 1 } as const;
    return [...rows].sort((a, b) => {
      if (sortBy === 'title') return a.title.localeCompare(b.title);
      if (sortBy === 'journey') return (a.journeyCategory ?? '').localeCompare(b.journeyCategory ?? '');
      if (sortBy === 'coverage') return (b.queryCoverageCount ?? 0) - (a.queryCoverageCount ?? 0);
      if (sortBy === 'value') return (b.valueScore ?? 0) - (a.valueScore ?? 0);
      return priorityWeight[b.priority] - priorityWeight[a.priority] || (b.queryCoverageCount ?? 0) - (a.queryCoverageCount ?? 0);
    });
  }, [items, search, priority, journey, sortBy]);

  useEffect(() => {
    if (!highlightUrl) return;
    const node = document.getElementById(`cms-${encodeURIComponent(highlightUrl)}`);
    node?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [highlightUrl, filtered.length]);

  return (
    <Card>
      <SectionTitle eyebrow={eyebrow} title={`${title} · showing ${filtered.length}`}>
        {type === 'cms'
          ? 'CMS is tracked at owned-page level. Each card aggregates linked queries and shows copy-ready modules for the highest-value page changes.'
          : 'PR is tracked separately from owned URLs. Each card groups queries by external source pattern and prioritises opportunities that can influence multiple queries.'}
      </SectionTitle>
      <div className="mb-4 grid gap-3 md:grid-cols-2 lg:grid-cols-4">
        <input className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm" placeholder={type === 'cms' ? 'Search page, module, query ID...' : 'Search source type, domain, query ID...'} value={search} onChange={(event) => setSearch(event.target.value)} />
        <select className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm" value={priority} onChange={(event) => setPriority(event.target.value)}>
          <option>All</option><option>High</option><option>Medium</option><option>Low</option>
        </select>
        <select className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm" value={journey} onChange={(event) => setJourney(event.target.value)}>
          <option>All</option>{journeys.map((item) => <option key={item}>{item}</option>)}
        </select>
        <select className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm" value={sortBy} onChange={(event) => setSortBy(event.target.value)}>
          <option value="priority">Sort: priority</option><option value="coverage">Sort: query coverage</option><option value="value">Sort: value score</option><option value="journey">Sort: journey</option><option value="title">Sort: title</option>
        </select>
      </div>
      <div className="space-y-4">
        {filtered.length ? filtered.map((item) => <RecommendationCard key={`${item.sourceRecommendationId}-${item.title}-${item.targetUrl}`} item={item} type={type} highlighted={!!highlightUrl && item.targetUrl === highlightUrl} />) : <p className="text-sm text-slate-500">No {title.toLowerCase()} match the current filters.</p>}
      </div>
    </Card>
  );
}

function RecommendationCard({ item, type, highlighted }: { item: RecommendationModule; type: 'cms' | 'pr'; highlighted?: boolean }) {
  return (
    <div id={type === 'cms' ? `cms-${encodeURIComponent(item.targetUrl)}` : undefined} className={`rounded-2xl border p-4 ${highlighted ? 'border-blue-400 bg-blue-50 ring-2 ring-blue-200' : 'border-slate-200 bg-slate-50'}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-slate-950">{item.title}</h3>
          {item.journeyCategory && <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-slate-500">{item.journeyCategory}</p>}
        </div>
        <Badge tone={tone(item.priority)}>{item.priority}</Badge>
      </div>
      <p className="mt-2 break-all text-sm text-slate-500">Owner: {item.owner} · {type === 'pr' ? 'Source group' : 'Target page'}: {item.targetUrl || 'Grouped opportunity'}</p>
      <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-600">
        {item.queryCoverageCount ? <span className="rounded-full bg-white px-2 py-1">{item.queryCoverageCount} linked queries</span> : null}
        {item.valueScore ? <span className="rounded-full bg-white px-2 py-1">Value score {item.valueScore}</span> : null}
        {item.moduleType ? <span className="rounded-full bg-white px-2 py-1">{label(item.moduleType)}</span> : null}
      </div>
      {type === 'cms' ? <CmsCardBody item={item} /> : <PrCardBody item={item} />}
      {item.linkedQueryIds?.length ? <p className="mt-3 text-xs text-slate-500">Linked queries: {item.linkedQueryIds.slice(0, 18).join(', ')}{item.linkedQueryIds.length > 18 ? '…' : ''}</p> : null}
      {item.validationRequired?.length ? <p className="mt-2 text-xs text-slate-500">Validation required: {item.validationRequired.join(', ')}</p> : null}
    </div>
  );
}

function CmsCardBody({ item }: { item: RecommendationModule }) {
  const modules = item.copyModules?.length ? item.copyModules.slice(0, 3) : fallbackCmsModules(item);
  const asset = item.advancedGeoAsset;
  const [activeTab, setActiveTab] = useState<'brief' | 'html' | 'jsonld' | 'facts' | 'validation'>('brief');
  const hasTabs = !!asset;
  return (
    <div className="mt-4 space-y-3">
      {hasTabs && (
        <div className="flex gap-1 overflow-x-auto">
          {(['brief', 'html', 'jsonld', 'facts', 'validation'] as const).map((tab) => (
            <button key={tab} onClick={() => setActiveTab(tab)} className={`whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-semibold ${activeTab === tab ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600'}`}>
              {tab === 'brief' ? 'Brief' : tab === 'html' ? 'HTML' : tab === 'jsonld' ? 'JSON-LD' : tab === 'facts' ? 'Facts' : 'Validation'}
            </button>
          ))}
        </div>
      )}
      {(!hasTabs || activeTab === 'brief') && (
        <>
          {modules.map((module, index) => <CmsCopyBlock key={`${module.moduleId}-${index}`} module={module} item={item} index={index} />)}
          {asset && asset.direct_answer_40_words && (
            <div className="rounded-xl bg-blue-50 border border-blue-200 p-3 text-sm">
              <p className="text-xs font-semibold uppercase tracking-wide text-blue-600">Direct Answer (under 40 words)</p>
              <p className="mt-1 text-slate-800">{asset.direct_answer_40_words}</p>
              <p className="mt-1 text-xs text-blue-500">Expected impact: {asset.expected_impact_score_10}/10</p>
            </div>
          )}
        </>
      )}
      {hasTabs && activeTab === 'html' && asset && (
        <div className="rounded-xl bg-white p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">HTML Component Preview</p>
          <div className="rounded-lg bg-slate-50 p-4 border border-slate-200" dangerouslySetInnerHTML={{ __html: asset.html_component }} />
          <details className="mt-3">
            <summary className="cursor-pointer text-xs font-semibold text-slate-600">View source HTML</summary>
            <pre className="mt-2 overflow-x-auto rounded-lg bg-slate-900 p-3 text-xs text-green-300">{asset.html_component}</pre>
          </details>
        </div>
      )}
      {hasTabs && activeTab === 'jsonld' && asset && (
        <div className="rounded-xl bg-white p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">JSON-LD Extension</p>
          <p className="text-xs text-slate-500 mb-2">Strategy: <span className="font-semibold">{asset.json_ld_strategy}</span>{asset.target_anchor_id && <> · Anchor: <code className="text-xs">{asset.target_anchor_id}</code></>}</p>
          {asset.json_ld_script && <pre className="overflow-x-auto rounded-lg bg-slate-900 p-3 text-xs text-amber-300">{asset.json_ld_script}</pre>}
          {asset.json_ld_merge_notes.length > 0 && (
            <ul className="mt-2 space-y-1 text-xs text-slate-500">{asset.json_ld_merge_notes.map((note, i) => <li key={i}>• {note}</li>)}</ul>
          )}
        </div>
      )}
      {hasTabs && activeTab === 'facts' && asset && <FactsDisplay facts={asset.facts_used} />}
      {hasTabs && activeTab === 'validation' && asset && <ValidationDisplay asset={asset} />}
      <details className="rounded-xl bg-white p-3 text-xs leading-5 text-slate-600">
        <summary className="cursor-pointer font-semibold text-slate-900">How value score is calculated</summary>
        <p className="mt-2">Value score combines query coverage, low current AI visibility, competitor/external-led status, page GEO gap, priority, and availability of reusable winning patterns. Higher scores indicate page changes expected to move more linked queries and improve both page GEO score and query-level AI visibility on rerun.</p>
      </details>
      <p className="rounded-xl bg-white p-3 text-xs leading-5 text-slate-600"><span className="font-semibold text-slate-900">Evidence basis:</span> {item.evidencePattern}</p>
    </div>
  );
}

function FactsDisplay({ facts }: { facts: Array<{ fact: string; value?: string; unit?: string; source: string; source_context_snippet: string; source_url?: string }> }) {
  if (!facts.length) return <p className="rounded-xl bg-white p-3 text-sm text-slate-500">No verified facts available for this recommendation.</p>;
  return (
    <div className="rounded-xl bg-white p-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">Verified Facts ({facts.length})</p>
      <div className="space-y-2">
        {facts.map((fact, i) => (
          <div key={i} className="rounded-lg border border-emerald-200 bg-emerald-50 p-2 text-xs">
            <div className="flex items-center gap-2">
              <span className="inline-block h-2 w-2 rounded-full bg-emerald-500" />
              <span className="font-semibold text-slate-800">{fact.fact}</span>
              {fact.value && <span className="text-slate-600">{fact.value}{fact.unit ? ` ${fact.unit}` : ''}</span>}
            </div>
            <p className="mt-1 text-slate-500">Source: <span className="font-semibold">{fact.source.replace(/_/g, ' ')}</span></p>
            <p className="mt-0.5 text-slate-400 break-all">Snippet: {fact.source_context_snippet.slice(0, 200)}</p>
            {fact.source_url && <p className="mt-0.5 text-blue-400 break-all">{fact.source_url}</p>}
          </div>
        ))}
      </div>
    </div>
  );
}

function ValidationDisplay({ asset }: { asset: AdvancedGeoAsset }) {
  const hasFlags = asset.validation_flags.length > 0;
  const needsLegal = asset.legal_review_required;
  return (
    <div className="rounded-xl bg-white p-3 space-y-2">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Validation Status</p>
      {needsLegal && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-2 text-xs text-red-800">
          <span className="font-semibold">Legal Review Required</span> — This recommendation contains pricing, warranty, or compliance-sensitive claims.
        </div>
      )}
      {hasFlags ? (
        <div className="space-y-1">
          {asset.validation_flags.map((flag, i) => (
            <div key={i} className="rounded-lg border border-amber-200 bg-amber-50 p-2 text-xs text-amber-800">
              <span className="font-semibold">Warning:</span> {flag}
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-2 text-xs text-emerald-800">
          All facts verified. No validation issues detected.
        </div>
      )}
      <p className="text-xs text-slate-400">Language: {asset.localized_copy_language} · Impact score: {asset.expected_impact_score_10}/10</p>
    </div>
  );
}

function CmsCopyBlock({ module, item, index }: { module: CmsCopyModule; item: RecommendationModule; index: number }) {
  const element = item.htmlElement || '<section class="geo-answer-module">';
  return (
    <div className="rounded-xl bg-white p-3 text-sm leading-6 text-slate-700">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">CMS copy recommendation {index + 1} · HTML element/component</p>
      <code className="mt-1 block break-all rounded-lg bg-slate-100 p-2 text-xs text-slate-800">{module.recommendedPlacement || item.placement || element}</code>
      <p className="mt-3 font-semibold text-slate-950">{module.heading || item.title}</p>
      {module.introCopy ? <p className="mt-2"><span className="font-semibold text-slate-900">Intro copy:</span> {module.introCopy}</p> : null}
      {module.bodyCopy ? <p className="mt-2"><span className="font-semibold text-slate-900">Body copy:</span> {module.bodyCopy}</p> : <p className="mt-2">{item.recommendation}</p>}
      {module.bullets?.length ? <ul className="mt-2 list-disc space-y-1 pl-5">{module.bullets.slice(0, 5).map((point) => <li key={point}>{point}</li>)}</ul> : null}
      {module.faqItems?.length ? (
        <details className="mt-2 rounded-lg bg-slate-50 p-2">
          <summary className="cursor-pointer font-semibold text-slate-900">FAQ copy</summary>
          {module.faqItems.slice(0, 3).map((faq) => <div key={faq.question} className="mt-2"><p className="font-semibold text-slate-900">{faq.question}</p><p>{faq.answer}</p></div>)}
        </details>
      ) : null}
    </div>
  );
}

function fallbackCmsModules(item: RecommendationModule): CmsCopyModule[] {
  return [{
    moduleId: `${item.sourceRecommendationId || item.title}-fallback`,
    moduleType: item.moduleType,
    recommendedPlacement: item.placement || item.htmlElement || '<section class="geo-answer-module">',
    heading: item.title,
    introCopy: item.recommendation,
    bodyCopy: '',
    bullets: item.bulletPoints?.slice(0, 4) ?? [],
    faqItems: []
  }];
}

function PrCardBody({ item }: { item: RecommendationModule }) {
  const pack = item.advancedPrAssetPack;
  const [activeTab, setActiveTab] = useState<'overview' | 'asset' | 'publishers' | 'triggers' | 'requirements' | 'validation'>('overview');
  const hasTabs = !!pack;
  return (
    <div className="mt-4 space-y-3">
      {hasTabs && (
        <div className="flex gap-1 overflow-x-auto">
          {(['overview', 'asset', 'publishers', 'triggers', 'requirements', 'validation'] as const).map((tab) => (
            <button key={tab} onClick={() => setActiveTab(tab)} className={`whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-semibold ${activeTab === tab ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600'}`}>
              {tab === 'overview' ? 'Overview' : tab === 'asset' ? 'Asset Pack' : tab === 'publishers' ? 'Publisher Targets' : tab === 'triggers' ? 'Semantic Triggers' : tab === 'requirements' ? 'Requirements' : 'Validation'}
            </button>
          ))}
        </div>
      )}
      {(!hasTabs || activeTab === 'overview') && (
        <>
          <p className="rounded-xl bg-white p-3 text-sm leading-6 text-slate-700">{item.recommendation}</p>
          {item.whyItMatters ? <p className="rounded-xl bg-white p-3 text-sm leading-6 text-slate-700"><span className="font-semibold text-slate-900">Why it matters:</span> {item.whyItMatters}</p> : null}
          {item.evidenceBasis || item.evidencePattern ? <p className="rounded-xl bg-white p-3 text-sm leading-6 text-slate-600"><span className="font-semibold text-slate-900">Evidence basis:</span> {item.evidenceBasis || item.evidencePattern}</p> : null}
          {item.observedExternalDomains?.length ? <p className="text-xs text-slate-500">Observed domains: {item.observedExternalDomains.slice(0, 10).map((d) => `${d.domain}${d.count ? ` (${d.count})` : ''}`).join(', ')}</p> : null}
        </>
      )}
      {hasTabs && activeTab === 'asset' && pack && (
        <div className="rounded-xl bg-white p-3 space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Asset Pack Details</p>
          <div className="grid gap-2 sm:grid-cols-2">
            <div className="rounded-lg bg-slate-50 p-2"><p className="text-xs text-slate-500">Asset Name</p><p className="text-sm font-semibold text-slate-800">{pack.asset_name}</p></div>
            <div className="rounded-lg bg-slate-50 p-2"><p className="text-xs text-slate-500">Asset Type</p><p className="text-sm font-semibold text-slate-800">{pack.asset_type.replace(/_/g, ' ')}</p></div>
          </div>
          <div className="rounded-lg bg-blue-50 border border-blue-200 p-2"><p className="text-xs text-blue-600 font-semibold">Information Gain Trigger</p><p className="text-sm text-slate-700">{pack.information_gain_trigger}</p></div>
          <div className="rounded-lg bg-slate-50 p-2"><p className="text-xs text-slate-500">Suggested Headline</p><p className="text-sm font-semibold text-slate-800">{pack.suggested_headline}</p></div>
          <div className="rounded-lg bg-slate-50 p-2"><p className="text-xs text-slate-500">Briefing Copy</p><p className="text-sm text-slate-700">{pack.briefing_copy}</p></div>
          {pack.unique_brand_data_required.length > 0 && (
            <div className="rounded-lg bg-amber-50 border border-amber-200 p-2">
              <p className="text-xs text-amber-600 font-semibold">Brand Data Required</p>
              <ul className="mt-1 space-y-0.5">{pack.unique_brand_data_required.map((d, i) => <li key={i} className="text-xs text-slate-600">• {d.replace(/_/g, ' ')}</li>)}</ul>
            </div>
          )}
        </div>
      )}
      {hasTabs && activeTab === 'publishers' && pack && (
        <div className="rounded-xl bg-white p-3 space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Publisher Targets</p>
          <div className="flex flex-wrap gap-1">{pack.target_publisher_types.map((t, i) => <span key={i} className="rounded-full bg-blue-100 px-2 py-1 text-xs text-blue-700">{t.replace(/_/g, ' ')}</span>)}</div>
          {pack.target_domains_observed.length > 0 && (
            <><p className="text-xs font-semibold text-slate-500 mt-2">Observed Domains</p>
            <div className="flex flex-wrap gap-1">{pack.target_domains_observed.map((d, i) => <span key={i} className="rounded-full bg-slate-100 px-2 py-1 text-xs text-slate-600">{d}</span>)}</div></>
          )}
        </div>
      )}
      {hasTabs && activeTab === 'triggers' && pack && (
        <div className="rounded-xl bg-white p-3 space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Semantic Triggers</p>
          <div className="flex flex-wrap gap-1">{pack.semantic_triggers.map((t, i) => <span key={i} className="rounded-full bg-purple-100 px-2 py-1 text-xs text-purple-700">{t.replace(/_/g, ' ')}</span>)}</div>
        </div>
      )}
      {hasTabs && activeTab === 'requirements' && pack && (
        <div className="rounded-xl bg-white p-3 space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Publisher Format Requirements</p>
          <ul className="space-y-1">{pack.publisher_format_requirements.map((r, i) => <li key={i} className="text-xs text-slate-600">• {r.replace(/_/g, ' ')}</li>)}</ul>
        </div>
      )}
      {hasTabs && activeTab === 'validation' && pack && (
        <div className="rounded-xl bg-white p-3 space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Validation</p>
          {pack.validation_flags.length > 0 ? (
            pack.validation_flags.map((flag, i) => <div key={i} className="rounded-lg border border-amber-200 bg-amber-50 p-2 text-xs text-amber-800"><span className="font-semibold">Warning:</span> {flag}</div>)
          ) : (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-2 text-xs text-emerald-800">No validation issues detected.</div>
          )}
        </div>
      )}
      <details className="rounded-xl bg-white p-3 text-xs leading-5 text-slate-600">
        <summary className="cursor-pointer font-semibold text-slate-900">How value score is calculated</summary>
        <p className="mt-2">Value score combines grouped query coverage, source-type influence, external-led or competitor-led status, citation-domain concentration, and priority. PR actions are not tied to owned URLs; success is tracked by grouped-query AI visibility movement, reduced external-led/competitor-led counts, and improved owned or neutral-source citation mix after rerun.</p>
      </details>
    </div>
  );
}

export function ActionChecklist({ report }: { report: ReportBundle }) {
  const [search, setSearch] = useState('');
  const [workstream, setWorkstream] = useState('All');
  const [priority, setPriority] = useState('All');
  const [sortBy, setSortBy] = useState('priority');
  const workstreams = useMemo(() => unique(report.actionChecklist.map((item) => item.workstream || item.source || '')), [report.actionChecklist]);
  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    const rows = report.actionChecklist.filter((item) => {
      const matchesSearch = !term || [item.action, item.owner, item.dependency, item.target, item.category, item.source, ...(item.targetSourceTypes ?? [])].join(' ').toLowerCase().includes(term);
      const matchesWorkstream = workstream === 'All' || item.workstream === workstream || item.source === workstream;
      const matchesPriority = priority === 'All' || item.priority === priority;
      return matchesSearch && matchesWorkstream && matchesPriority;
    });
    const priorityWeight = { High: 3, Medium: 2, Low: 1 } as const;
    return [...rows].sort((a, b) => {
      if (sortBy === 'target') return (a.target ?? '').localeCompare(b.target ?? '');
      if (sortBy === 'category') return (a.category ?? '').localeCompare(b.category ?? '');
      if (sortBy === 'coverage') return (b.queryCoverageCount ?? 0) - (a.queryCoverageCount ?? 0);
      return priorityWeight[b.priority] - priorityWeight[a.priority] || (b.queryCoverageCount ?? 0) - (a.queryCoverageCount ?? 0);
    });
  }, [report.actionChecklist, search, workstream, priority, sortBy]);

  return (
    <Card>
      <SectionTitle eyebrow="Action checklist" title={`Explicit Bodhi action checklist (${filtered.length}/${report.actionChecklist.length})`}>
        CMS actions are tracked at owned-page level. PR actions are tracked separately by grouped query/source opportunity and are not tied to owned URLs.
      </SectionTitle>
      <div className="mb-4 grid gap-3 md:grid-cols-2 lg:grid-cols-4">
        <input className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm" placeholder="Search action, target, category..." value={search} onChange={(event) => setSearch(event.target.value)} />
        <select className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm" value={workstream} onChange={(event) => setWorkstream(event.target.value)}>
          <option>All</option>{workstreams.map((item) => <option key={item}>{item}</option>)}
        </select>
        <select className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm" value={priority} onChange={(event) => setPriority(event.target.value)}>
          <option>All</option><option>High</option><option>Medium</option><option>Low</option>
        </select>
        <select className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm" value={sortBy} onChange={(event) => setSortBy(event.target.value)}>
          <option value="priority">Sort: priority</option><option value="coverage">Sort: query coverage</option><option value="target">Sort: target</option><option value="category">Sort: category</option>
        </select>
      </div>
      <div className="grid gap-3">
        {filtered.map((item, index) => <ActionRow key={`${item.source}-${item.target}-${item.action}-${index}`} item={item} />)}
      </div>
    </Card>
  );
}

function ActionRow({ item }: { item: ActionItem }) {
  const target = item.target || item.source || 'No target supplied';
  const isUrl = /^https?:\/\//i.test(target);
  const action = item.action.replace(target, '').replace(/:\s*$/, '').trim() || item.action;
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={tone(item.priority)}>{item.priority}</Badge>
            <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-600">Effort {item.effort}</span>
            <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-600">{item.status}</span>
            {(item.workstream || item.source) && <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-600">{item.workstream || item.source}</span>}
          </div>
          <h3 className="mt-3 text-base font-semibold leading-6 text-slate-950">{action}</h3>
          <div className="mt-3 rounded-xl bg-slate-50 p-3 text-sm leading-6 text-slate-600">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Target</p>
            <p className={`${isUrl ? 'break-all font-mono text-xs' : 'break-words'}`}>{target}</p>
          </div>
        </div>
        <div className="grid w-full gap-2 text-sm text-slate-600 sm:grid-cols-3 xl:w-[420px] xl:grid-cols-1">
          <Meta label="Owner" value={item.owner} />
          <Meta label="Category" value={label(item.category || item.dependency || item.targetSourceTypes?.join(', ') || 'Not supplied')} />
          <Meta label="Linked queries" value={String(item.queryCoverageCount || item.linkedQueryIds?.length || 0)} />
        </div>
      </div>
    </article>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return <div className="rounded-xl bg-slate-50 p-3"><p className="text-xs uppercase tracking-wide text-slate-500">{label}</p><p className="mt-1 font-semibold text-slate-800">{value}</p></div>;
}
