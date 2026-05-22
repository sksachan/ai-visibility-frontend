/**
 * normaliseReport.ts - Transforms raw backend JSON payloads into the
 * canonical ReportBundle shape consumed by all frontend components.
 *
 * The backend emits snake_case fields; the frontend uses camelCase.
 * This normaliser is defensive: missing fields get safe defaults so
 * the dashboard never crashes on partial or legacy payloads.
 */
import type {
  ReportBundle,
  ExecutiveSection,
  HeadlineMetrics,
  QueryDiagnostic,
  OwnedPage,
  RecommendationModule,
  ActionItem,
  CitationExample,
  CompetitorVisibility,
  SourceTypeCount,
  TrendPoint,
  AiHygiene,
  QueryWorkbenchItem,
  BrandTopicScorecardRow,
} from '../types/report';

// -- Tiny helpers --

function str(v: unknown, fallback = ''): string {
  if (typeof v === 'string') return v;
  if (typeof v === 'number') return String(v);
  return fallback;
}

function num(v: unknown, fallback = 0): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function arr<T>(v: unknown): T[] {
  return Array.isArray(v) ? v : [];
}

function obj(v: unknown): Record<string, unknown> {
  return v && typeof v === 'object' && !Array.isArray(v)
    ? (v as Record<string, unknown>)
    : {};
}

// -- Sub-normalisers --

function normaliseCitation(raw: unknown): CitationExample {
  const r = obj(raw);
  return {
    title: str(r.title),
    url: str(r.url || r.source_url),
    domain: str(r.domain || r.source_domain),
    sourceType: str(r.sourceType || r.source_type),
    citationPosition: r.citationPosition != null ? num(r.citationPosition) : r.citation_position != null ? num(r.citation_position) : undefined,
    snippet: str(r.snippet || r.text || r.description),
    queryId: str(r.queryId || r.query_id),
    query: str(r.query),
    isCompetitor: Boolean(r.isCompetitor ?? r.is_competitor),
    isOwnedTargetPage: Boolean(r.isOwnedTargetPage ?? r.is_owned_target_page),
  };
}

function normaliseHeadlineMetrics(raw: unknown): HeadlineMetrics {
  const r = obj(raw);
  return {
    brandScore: num(r.brandScore ?? r.brand_score ?? r.ai_visibility_score),
    ownedTargetCitations: num(r.ownedTargetCitations ?? r.owned_target_citations ?? r.owned_target_page_citations),
    ownedDomainCitations: num(r.ownedDomainCitations ?? r.owned_domain_citations),
    competitorLedQueries: num(r.competitorLedQueries ?? r.competitor_led_queries),
    externalLedQueries: num(r.externalLedQueries ?? r.external_led_queries),
    queryCount: r.queryCount != null || r.query_count != null ? num(r.queryCount ?? r.query_count) : undefined,
    ownedPageCount: r.ownedPageCount != null || r.owned_page_count != null ? num(r.ownedPageCount ?? r.owned_page_count) : undefined,
    externalSourceCount: r.externalSourceCount != null || r.external_source_count != null ? num(r.externalSourceCount ?? r.external_source_count) : undefined,
    averageOwnedGeoScore120: r.averageOwnedGeoScore120 != null || r.average_owned_geo_score_120 != null ? num(r.averageOwnedGeoScore120 ?? r.average_owned_geo_score_120) : undefined,
    averageExternalBenchmarkScore: r.averageExternalBenchmarkScore != null || r.average_external_benchmark_score != null ? num(r.averageExternalBenchmarkScore ?? r.average_external_benchmark_score) : undefined,
  };
}

function normaliseBrandTopicScorecard(raw: unknown): BrandTopicScorecardRow[] {
  return arr(raw).map((item: unknown) => {
    const r = obj(item);
    return {
      topic: str(r.topic || r.brand_topic),
      aiVisibilityScore: r.aiVisibilityScore != null || r.ai_visibility_score != null ? num(r.aiVisibilityScore ?? r.ai_visibility_score) : null,
      relativePosition: str(r.relativePosition || r.relative_position),
      directionVsLastPeriod: str(r.directionVsLastPeriod || r.direction_vs_last_period),
      comment: str(r.comment || r.summary),
      queryCount: r.queryCount != null || r.query_count != null ? num(r.queryCount ?? r.query_count) : undefined,
      ownedUrlCount: r.ownedUrlCount != null || r.owned_url_count != null ? num(r.ownedUrlCount ?? r.owned_url_count) : undefined,
      citationCount: r.citationCount != null || r.citation_count != null ? num(r.citationCount ?? r.citation_count) : undefined,
    };
  });
}

function normaliseExecutive(raw: unknown): ExecutiveSection {
  const r = obj(raw);
  const hm = normaliseHeadlineMetrics(r.headline_metrics || r.headlineMetrics || r);
  return {
    summary: str(r.summary || r.executive_summary),
    whatIsHappening: arr(r.whatIsHappening || r.what_is_happening || r.key_findings),
    whyNow: arr(r.whyNow || r.why_now || r.why_this_matters),
    priorityActions: arr(r.priorityActions || r.priority_actions || r.recommended_actions),
    riskIfNoAction: str(r.riskIfNoAction || r.risk_if_no_action) || undefined,
    recommendedNextSteps: arr(r.recommendedNextSteps || r.recommended_next_steps).length ? arr(r.recommendedNextSteps || r.recommended_next_steps) : undefined,
    methodologyCaveats: arr(r.methodologyCaveats || r.methodology_caveats).length ? arr(r.methodologyCaveats || r.methodology_caveats) : undefined,
    headlineMetrics: hm,
    brandTopicScorecard: r.brand_topic_scorecard || r.brandTopicScorecard ? normaliseBrandTopicScorecard(r.brand_topic_scorecard || r.brandTopicScorecard) : undefined,
  };
}

function normaliseQuery(raw: unknown): QueryDiagnostic {
  const r = obj(raw);
  const vis = obj(r.current_ai_visibility);
  return {
    id: str(r.id || r.query_id),
    query: str(r.query),
    journey: str(r.journey || r.journey_category || r.journey_stage),
    visibilityStatus: str(r.visibilityStatus || r.visibility_status || vis.status),
    ownedTargetPageCited: Boolean(r.ownedTargetPageCited ?? r.owned_target_page_cited ?? vis.owned_target_cited),
    ownedDomainCited: (r.ownedDomainCited ?? r.owned_domain_cited ?? vis.owned_domain_cited ?? null) as boolean | null,
    winningExternalSourceTypes: arr(r.winningExternalSourceTypes || r.winning_external_source_types),
    ownedGeoScore120: num(r.ownedGeoScore120 ?? r.owned_geo_score_120),
    externalBenchmarkScore: num(r.externalBenchmarkScore ?? r.external_benchmark_score),
    sourcePreferenceGap: num(r.sourcePreferenceGap ?? r.source_preference_gap),
    gapReasons: arr(r.gapReasons || r.gap_reasons),
    citations: arr(r.citations || r.top_citations || vis.top_citations).map(normaliseCitation),
    brandPosition: num(r.brandPosition ?? r.brand_position),
    leadingCompetitor: str(r.leadingCompetitor || r.leading_competitor),
    leadingPublisher: str(r.leadingPublisher || r.leading_publisher),
    sourceType: str(r.sourceType || r.source_type),
    citationLikelihood: num(r.citationLikelihood ?? r.citation_likelihood),
    confidence: num(r.confidence),
    aiVisibilityScore: r.aiVisibilityScore != null || r.ai_visibility_score != null || vis.score != null ? num(r.aiVisibilityScore ?? r.ai_visibility_score ?? vis.score) : undefined,
    issue: str(r.issue || r.key_issue),
    recommendedMove: str(r.recommendedMove || r.recommended_move || r.recommended_action),
  };
}

function normaliseTechnicalSignals(raw: unknown): OwnedPage['technicalSignals'] {
  const r = obj(raw);
  return {
    jsonLdPresent: r.jsonLdPresent ?? r.json_ld_present ?? r.jsonld_present ?? undefined,
    schemaTypes: arr(r.schemaTypes || r.schema_types).length ? arr(r.schemaTypes || r.schema_types) : undefined,
    robotsMeta: str(r.robotsMeta || r.robots_meta) || undefined,
    canonicalUrl: str(r.canonicalUrl || r.canonical_url) || undefined,
    metaDescriptionPresent: r.metaDescriptionPresent ?? r.meta_description_present ?? undefined,
    crawlStatus: str(r.crawlStatus || r.crawl_status) || undefined,
    wordCount: r.wordCount != null || r.word_count != null ? num(r.wordCount ?? r.word_count) : undefined,
    markdownChars: r.markdownChars != null || r.markdown_chars != null ? num(r.markdownChars ?? r.markdown_chars) : undefined,
  } as OwnedPage['technicalSignals'];
}

function normaliseOwnedPage(raw: unknown): OwnedPage {
  const r = obj(raw);
  const dims = obj(r.geo_dimensions || r.geoDimensions);
  return {
    url: str(r.url),
    title: str(r.title || r.page_title) || undefined,
    journeyCategory: str(r.journeyCategory || r.journey_category || r.page_type),
    evidenceMatchStatus: str(r.evidenceMatchStatus || r.evidence_match_status) || undefined,
    mappedQuery: str(r.mappedQuery || r.mapped_query || r.primary_query),
    relatedQueries: arr(r.relatedQueries || r.related_queries).map((q: unknown) => {
      const qr = obj(q);
      return { id: str(qr.id || qr.query_id), query: str(qr.query), visibilityStatus: str(qr.visibilityStatus || qr.visibility_status) || undefined };
    }),
    geoScore: num(r.geoScore ?? r.geo_score ?? r.geo_score_120 ?? r.current_geo_score_120),
    scoreBand: str(r.scoreBand || r.score_band) || undefined,
    clarity: num(r.clarity ?? dims.clarity),
    semanticDepth: num(r.semanticDepth ?? r.semantic_depth ?? dims.semantic_depth),
    evidence: num(r.evidence ?? dims.evidence),
    structure: num(r.structure ?? dims.structured_data ?? dims.structure),
    freshness: num(r.freshness ?? dims.freshness),
    authority: num(r.authority ?? dims.authority ?? dims.eeat),
    faqReadiness: r.faqReadiness != null || r.faq_readiness != null || dims.faq_readiness != null ? num(r.faqReadiness ?? r.faq_readiness ?? dims.faq_readiness) : undefined,
    diagnostics: arr(r.diagnostics || r.geo_gaps),
    recommendedHtmlChanges: arr(r.recommendedHtmlChanges || r.recommended_html_changes).length ? arr(r.recommendedHtmlChanges || r.recommended_html_changes) : undefined,
    queryMapped: (r.queryMapped ?? r.query_mapped ?? undefined) as boolean | undefined,
    inventorySource: str(r.inventorySource || r.inventory_source) || undefined,
    scoringMethod: str(r.scoringMethod || r.scoring_method) || undefined,
    scoringNotes: str(r.scoringNotes || r.scoring_notes) || undefined,
    technicalSignals: r.technicalSignals || r.technical_signals ? normaliseTechnicalSignals(r.technicalSignals || r.technical_signals) : undefined,
  };
}

function normaliseRecommendation(raw: unknown): RecommendationModule {
  const r = obj(raw);
  return {
    title: str(r.title || r.recommendation_title || r.heading),
    targetUrl: str(r.targetUrl || r.target_url || r.url),
    recommendation: str(r.recommendation || r.description || r.body_copy || r.summary),
    evidencePattern: str(r.evidencePattern || r.evidence_pattern || r.evidence_basis),
    priority: (str(r.priority) || 'Medium') as 'High' | 'Medium' | 'Low',
    owner: str(r.owner || r.workstream),
    journeyCategory: str(r.journeyCategory || r.journey_category) || undefined,
    moduleType: str(r.moduleType || r.module_type) || undefined,
    placement: str(r.placement || r.recommended_placement) || undefined,
    introCopy: str(r.introCopy || r.intro_copy) || undefined,
    bodyCopy: str(r.bodyCopy || r.body_copy) || undefined,
    bulletPoints: arr(r.bulletPoints || r.bullet_points || r.bullets).length ? arr(r.bulletPoints || r.bullet_points || r.bullets) : undefined,
    faqItems: arr(r.faqItems || r.faq_items).length ? arr(r.faqItems || r.faq_items) : undefined,
    whyItMatters: str(r.whyItMatters || r.why_it_matters) || undefined,
    evidenceBasis: str(r.evidenceBasis || r.evidence_basis) || undefined,
    sourceRecommendationId: str(r.sourceRecommendationId || r.source_recommendation_id) || undefined,
    copyModules: arr(r.copyModules || r.copy_modules).length ? arr(r.copyModules || r.copy_modules) : undefined,
  };
}

function normaliseAction(raw: unknown): ActionItem {
  const r = obj(raw);
  return {
    action: str(r.action || r.title || r.description),
    owner: str(r.owner || r.workstream),
    priority: (str(r.priority) || 'Medium') as 'High' | 'Medium' | 'Low',
    effort: (str(r.effort) || 'M') as 'S' | 'M' | 'L',
    status: (str(r.status) || 'Not started') as 'Not started' | 'In progress' | 'Done',
    dependency: str(r.dependency) || undefined,
    source: str(r.source) || undefined,
    target: str(r.target || r.target_url) || undefined,
    workstream: str(r.workstream || r.category) || undefined,
    category: str(r.category || r.workstream) || undefined,
  };
}

function normaliseCompetitor(raw: unknown): CompetitorVisibility {
  const r = obj(raw);
  return {
    name: str(r.name || r.brand),
    visibility: num(r.visibility ?? r.visibility_score),
    citationShare: num(r.citationShare ?? r.citation_share),
    sentiment: num(r.sentiment ?? r.sentiment_score),
    position: (str(r.position) || 'Watchlist') as CompetitorVisibility['position'],
  };
}

// -- Unwrap nested payload wrappers --

function unwrap(raw: unknown): Record<string, unknown> {
  let current = obj(raw);
  const wrapperKeys = ['frontend_report_bundle', 'report_bundle', 'bundle', 'report', 'payload', 'data', 'Preview Node'];
  for (const key of wrapperKeys) {
    if (current[key] && typeof current[key] === 'object') {
      current = obj(current[key]);
    }
  }
  const keys = Object.keys(current);
  if (keys.length === 1 && current[keys[0]] && typeof current[keys[0]] === 'object') {
    const inner = obj(current[keys[0]]);
    if (inner['Preview Node'] && typeof inner['Preview Node'] === 'object') {
      current = obj(inner['Preview Node']);
    }
  }
  return current;
}

// -- Main normaliser --

export function normaliseReport(raw: unknown): ReportBundle {
  const r = unwrap(raw);

  const execRaw = r.executive || r.executive_summary_section || {};
  const executive = normaliseExecutive(execRaw);

  const rawQueries = arr(r.query_workbench || r.queries || r.queryWorkbench);
  const queries: QueryDiagnostic[] = rawQueries.map(normaliseQuery);

  const rawOwned = arr(r.owned_url_readiness || r.ownedPages || r.owned_pages);
  const ownedPages: OwnedPage[] = rawOwned.map(normaliseOwnedPage);

  const rawCms = arr(
    r.page_level_cms_recommendations || r.cmsModules || r.cms_recommendations || r.cms_modules,
  );
  const cmsModules: RecommendationModule[] = rawCms.map(normaliseRecommendation);

  const rawPr = arr(
    r.grouped_pr_opportunities || r.prOpportunities || r.pr_opportunities || r.pr_recommendations,
  );
  const prOpportunities: RecommendationModule[] = rawPr.map(normaliseRecommendation);

  const rawActions = arr(r.action_checklist || r.actionChecklist || r.actions);
  const actionChecklist: ActionItem[] = rawActions.map(normaliseAction);

  const slRaw = obj(r.source_landscape || r.sourceLandscape);
  const sourceLandscape = {
    sourceTypeCounts: arr(slRaw.source_type_counts || slRaw.sourceTypeCounts).map((s: unknown) => {
      const sr = obj(s);
      return { sourceType: str(sr.sourceType || sr.source_type), count: num(sr.count) } as SourceTypeCount;
    }),
    observedNonOwnedDomains: arr(slRaw.observed_non_owned_domains || slRaw.observedNonOwnedDomains).map((d: unknown) => {
      const dr = obj(d);
      return {
        domain: str(dr.domain),
        sourceType: str(dr.sourceType || dr.source_type),
        observedCount: num(dr.observedCount ?? dr.observed_count ?? dr.count),
        exampleUrl: str(dr.exampleUrl || dr.example_url) || undefined,
        exampleQuery: str(dr.exampleQuery || dr.example_query) || undefined,
      };
    }),
    winningSourcePatterns: arr(slRaw.winning_source_patterns || slRaw.winningSourcePatterns).map((p: unknown) => {
      const pr = obj(p);
      return {
        sourceType: str(pr.sourceType || pr.source_type),
        citationCount: num(pr.citationCount ?? pr.citation_count),
        winningPattern: str(pr.winningPattern || pr.winning_pattern || pr.pattern),
      };
    }),
    sourceCitations: arr(slRaw.source_citations || slRaw.sourceCitations).map(normaliseCitation),
  };

  const trend: TrendPoint[] = arr(r.trend || r.trends).map((t: unknown) => {
    const tr = obj(t);
    return {
      period: str(tr.period),
      brandScore: num(tr.brandScore ?? tr.brand_score),
      ownedCitations: num(tr.ownedCitations ?? tr.owned_citations),
      competitorPressure: num(tr.competitorPressure ?? tr.competitor_pressure),
    };
  });

  const visRaw = obj(r.visibility);
  const hm = executive.headlineMetrics;

  const hygieneRaw = r.ai_discoverability_hygiene || r.site_ai_hygiene || r.aiHygiene;
  const aiHygiene: AiHygiene | undefined = hygieneRaw ? obj(hygieneRaw) as AiHygiene : undefined;

  const queryWorkbench: QueryWorkbenchItem[] | undefined = r.query_workbench
    ? arr(r.query_workbench) as QueryWorkbenchItem[]
    : undefined;

  return {
    runId: str(r.run_id || r.runId),
    brand: str(r.brand),
    market: str(r.market),
    generatedAt: str(r.generated_at || r.generatedAt || new Date().toISOString()),
    evidenceDate: str(r.evidence_date || r.evidenceDate || r.generated_at || r.generatedAt || new Date().toISOString().slice(0, 10)),
    executive,
    visibility: {
      brandScore: num(visRaw.brandScore ?? visRaw.brand_score ?? hm.brandScore),
      ownedTargetCitations: num(visRaw.ownedTargetCitations ?? visRaw.owned_target_citations ?? hm.ownedTargetCitations),
      ownedDomainCitations: num(visRaw.ownedDomainCitations ?? visRaw.owned_domain_citations ?? hm.ownedDomainCitations),
      competitorLedQueries: num(visRaw.competitorLedQueries ?? visRaw.competitor_led_queries ?? hm.competitorLedQueries),
      externalLedQueries: num(visRaw.externalLedQueries ?? visRaw.external_led_queries ?? hm.externalLedQueries),
      brandVsCompetitors: arr(visRaw.brandVsCompetitors || visRaw.brand_vs_competitors).map(normaliseCompetitor),
    },
    sourceLandscape,
    trend,
    queries,
    ownedPages,
    cmsModules,
    prOpportunities,
    actionChecklist,
    queryWorkbench,
    aiHygiene,
  };
}
