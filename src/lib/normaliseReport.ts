/**
 * normaliseReport — transforms snake_case backend payload into camelCase ReportBundle.
 *
 * This is the single source of truth for mapping backend JSON → frontend types.
 * It must be defensive: any missing field gets a safe default so the UI never crashes.
 */
import type {
  ReportBundle, ExecutiveSection, HeadlineMetrics, BrandTopicScorecardRow,
  QueryDiagnostic, OwnedPage, RecommendationModule, ActionItem,
  CitationExample, SourceTypeCount, TrendPoint, CompetitorVisibility,
  AiHygiene, QueryWorkbenchItem, AdvancedGeoAsset, AdvancedPrAssetPack,
} from '../types/report';

/* ── tiny helpers ─────────────────────────────────────────────────── */

function str(v: unknown): string { return v == null ? '' : String(v); }
function num(v: unknown): number { try { const n = Number(v); return Number.isFinite(n) ? n : 0; } catch { return 0; } }
function arr<T = unknown>(v: unknown): T[] { return Array.isArray(v) ? v : []; }
function obj(v: unknown): Record<string, unknown> { return v && typeof v === 'object' && !Array.isArray(v) ? v as Record<string, unknown> : {}; }
function bool(v: unknown): boolean { return v === true || v === 'true' || v === 1; }

function firstOf<T>(record: Record<string, unknown>, ...keys: string[]): T | undefined {
  for (const k of keys) { if (record[k] !== undefined && record[k] !== null && record[k] !== '') return record[k] as T; }
  return undefined;
}

/* ── unwrap nested payloads ──────────────────────────────────────── */

function unwrap(raw: unknown): Record<string, unknown> {
  let current = raw;
  if (typeof current === 'string') { try { current = JSON.parse(current); } catch { /* keep string */ } }
  if (!current || typeof current !== 'object' || Array.isArray(current)) return {};
  const o = current as Record<string, unknown>;
  for (const key of ['frontend_report_bundle', 'report_bundle', 'bundle', 'report', 'payload', 'data']) {
    const nested = o[key];
    if (nested && typeof nested === 'object' && !Array.isArray(nested)) return unwrap(nested);
    if (typeof nested === 'string') { try { return unwrap(JSON.parse(nested)); } catch { /* skip */ } }
  }
  // Bodhi Preview Node wrapper
  if (o['Preview Node'] && typeof o['Preview Node'] === 'object') {
    const pn = o['Preview Node'] as Record<string, unknown>;
    const stdout = (pn.data as Record<string, unknown>)?.stdout;
    if (typeof stdout === 'string') { try { return unwrap(JSON.parse(stdout)); } catch { /* skip */ } }
  }
  return o;
}

/* ── citation normaliser ─────────────────────────────────────────── */

function normaliseCitation(r: Record<string, unknown>): CitationExample {
  return {
    title: str(r.title || r.source_name),
    url: str(r.url || r.source_url || r.link || r.href),
    domain: str(r.domain || r.source_domain),
    sourceType: str(r.sourceType || r.source_type || r.source_category),
    citationPosition: num(r.citationPosition ?? r.citation_position ?? r.rank),
    snippet: str(r.snippet || r.citation_text || r.text || r.summary),
    queryId: str(r.queryId || r.query_id),
    query: str(r.query),
    isCompetitor: bool(r.isCompetitor ?? r.is_competitor),
    isOwnedTargetPage: bool(r.isOwnedTargetPage ?? r.is_owned_target_page),
  };
}

/* ── query normaliser ────────────────────────────────────────────── */

function normaliseQuery(r: Record<string, unknown>, index: number): QueryDiagnostic {
  const vis = obj(r.current_ai_visibility || r.currentAiVisibility);
  const citations = arr(vis.top_citations || vis.topCitations || r.citations).map((c: unknown) => normaliseCitation(obj(c)));
  const competitors = arr(vis.competitors || r.competitors || r.competitorBrands).map(str);
  return {
    id: str(r.query_id || r.id || r.qid || `q${index + 1}`),
    query: str(r.query || r.search_query || r.question),
    journey: str(r.journey || r.journey_category || r.journey_stage),
    visibilityStatus: str(r.visibilityStatus || r.visibility_status || vis.status),
    ownedTargetPageCited: bool(r.ownedTargetPageCited ?? r.owned_target_page_cited ?? vis.owned_target_cited),
    ownedDomainCited: bool(r.ownedDomainCited ?? r.owned_domain_cited ?? vis.owned_domain_cited),
    winningExternalSourceTypes: arr(r.winningExternalSourceTypes || r.winning_external_source_types),
    ownedGeoScore120: num(r.ownedGeoScore120 ?? r.owned_geo_score_120),
    externalBenchmarkScore: num(r.externalBenchmarkScore ?? r.external_benchmark_score),
    sourcePreferenceGap: num(r.sourcePreferenceGap ?? r.source_preference_gap),
    gapReasons: arr(r.gapReasons || r.gap_reasons).map(str),
    citations,
    brandPosition: num(r.brandPosition ?? r.brand_position),
    leadingCompetitor: str(r.leadingCompetitor || r.leading_competitor || competitors[0]),
    leadingPublisher: str(r.leadingPublisher || r.leading_publisher),
    sourceType: str(r.sourceType || r.source_type),
    citationLikelihood: num(r.citationLikelihood ?? r.citation_likelihood),
    confidence: num(r.confidence),
    aiVisibilityScore: num(vis.score ?? r.aiVisibilityScore ?? r.ai_visibility_score),
    competitorBrands: competitors,
    competitorCitationCount: num(vis.competitor_citation_count ?? r.competitorCitationCount),
    issue: str(r.issue || r.gap_summary),
    recommendedMove: str(r.recommendedMove || r.recommended_move || r.recommendation),
  };
}

/* ── owned page normaliser ───────────────────────────────────────── */

function normaliseOwnedPage(r: Record<string, unknown>): OwnedPage {
  const dims = obj(r.geo_dimensions || r.dimensions || r.dimension_scores || r.geoDimensions);
  const tech = obj(r.technical_signals || r.technicalSignals);
  const relatedRaw = arr(r.related_queries || r.relatedQueries || r.mapped_queries);
  return {
    url: str(r.url || r.page_url || r.target_url),
    title: str(r.title || r.page_title),
    journeyCategory: str(r.journeyCategory || r.journey_category || r.journey_stage || 'Unclassified'),
    evidenceMatchStatus: str(r.evidenceMatchStatus || r.evidence_match_status || r.score_band),
    mappedQuery: str(r.mappedQuery || r.mapped_query),
    relatedQueries: relatedRaw.map((q: unknown) => {
      const qo = obj(q);
      return { id: str(qo.id || qo.query_id), query: str(qo.query || qo.text), visibilityStatus: str(qo.visibility_status || qo.visibilityStatus) };
    }),
    geoScore: num(r.current_geo_score_120 ?? r.geoScore ?? r.geo_score_120 ?? r.readiness_score ?? r.score_120),
    scoreBand: str(r.scoreBand || r.score_band),
    clarity: num(dims.content_clarity ?? r.clarity),
    semanticDepth: num(dims.semantic_depth ?? r.semanticDepth ?? r.semantic_depth),
    evidence: num(dims.eeat_signals ?? r.evidence ?? r.eeat_signals),
    structure: num(dims.structured_data ?? r.structure ?? r.structured_data),
    freshness: num(dims.freshness_index ?? r.freshness ?? r.freshness_index),
    authority: num(r.authority ?? dims.eeat_signals),
    faqReadiness: dims.faq_readiness != null || r.faq_readiness != null || r.faqReadiness != null ? num(r.faqReadiness ?? r.faq_readiness ?? dims.faq_readiness) : undefined,
    diagnostics: arr(r.diagnostics || r.geo_gaps),
    recommendedHtmlChanges: arr(r.recommendedHtmlChanges || r.recommended_html_changes).length ? arr(r.recommendedHtmlChanges || r.recommended_html_changes) : undefined,
    queryMapped: bool(r.queryMapped ?? r.query_mapped),
    inventorySource: str(r.inventorySource || r.inventory_source) || undefined,
    scoringMethod: str(r.scoringMethod || r.scoring_method) || undefined,
    scoringNotes: str(r.scoringNotes || r.scoring_notes) || undefined,
    technicalSignals: {
      jsonLdPresent: tech.json_ld_present != null ? bool(tech.json_ld_present) : tech.jsonLdPresent != null ? bool(tech.jsonLdPresent) : undefined,
      schemaTypes: arr(tech.schema_types || tech.schemaTypes).map(str),
      robotsMeta: str(tech.robots_meta || tech.robotsMeta) || undefined,
      canonicalUrl: str(tech.canonical_url || tech.canonicalUrl) || undefined,
      metaDescriptionPresent: tech.meta_description_present != null ? bool(tech.meta_description_present) : undefined,
      crawlStatus: str(tech.crawl_status || tech.crawlStatus) || undefined,
      wordCount: tech.word_count != null || tech.wordCount != null ? num(tech.word_count ?? tech.wordCount) : undefined,
      markdownChars: tech.markdown_chars != null ? num(tech.markdown_chars) : undefined,
    },
  };
}

/* ── recommendation normaliser ───────────────────────────────────── */

function normaliseRecommendation(r: Record<string, unknown>): RecommendationModule {
  return {
    title: str(r.title || r.action),
    targetUrl: str(r.targetUrl || r.target_url || r.url),
    recommendation: str(r.recommendation || r.recommended_change || r.description),
    evidencePattern: str(r.evidencePattern || r.evidence_pattern || r.winning_pattern_to_copy),
    priority: (str(r.priority) || 'Medium') as RecommendationModule['priority'],
    owner: str(r.owner),
    journeyCategory: str(r.journeyCategory || r.journey_category) || undefined,
    moduleType: str(r.moduleType || r.module_type) || undefined,
    placement: str(r.placement || r.recommendedPlacement || r.recommended_placement) || undefined,
    valueScore: r.valueScore != null || r.value_score != null ? num(r.valueScore ?? r.value_score) : undefined,
    queryCoverageCount: r.queryCoverageCount != null || r.query_coverage_count != null ? num(r.queryCoverageCount ?? r.query_coverage_count) : undefined,
    linkedQueryIds: arr(r.linkedQueryIds || r.linked_query_ids || r.linked_queries).map((q: unknown) => typeof q === 'object' ? str((q as Record<string, unknown>).query_id) : str(q)),
    sourceType: str(r.sourceType || r.source_type) || undefined,
    sourceRecommendationId: str(r.sourceRecommendationId || r.recommendation_id) || undefined,
    advancedGeoAsset: (r.advanced_geo_asset || r.advancedGeoAsset) ? (r.advanced_geo_asset || r.advancedGeoAsset) as AdvancedGeoAsset : undefined,
    advancedPrAssetPack: (r.advanced_pr_asset_pack || r.advancedPrAssetPack) ? (r.advanced_pr_asset_pack || r.advancedPrAssetPack) as AdvancedPrAssetPack : undefined,
  };
}

/* ── action normaliser ───────────────────────────────────────────── */

function normaliseAction(r: Record<string, unknown>): ActionItem {
  return {
    action: str(r.action || r.title),
    owner: str(r.owner),
    priority: (str(r.priority) || 'Medium') as ActionItem['priority'],
    effort: (str(r.effort) || 'M') as ActionItem['effort'],
    status: (str(r.status) || 'Not started') as ActionItem['status'],
    dependency: str(r.dependency) || undefined,
    source: str(r.source) || undefined,
    target: str(r.target || r.target_url) || undefined,
    workstream: str(r.workstream) || undefined,
    category: str(r.category) || undefined,
    valueScore: r.value_score != null || r.valueScore != null ? num(r.value_score ?? r.valueScore) : undefined,
    queryCoverageCount: r.query_coverage_count != null || r.queryCoverageCount != null ? num(r.query_coverage_count ?? r.queryCoverageCount) : undefined,
    linkedQueryIds: arr(r.linked_query_ids || r.linkedQueryIds).map(str),
    moduleType: str(r.module_type || r.moduleType) || undefined,
  };
}

/* ── main normaliser ─────────────────────────────────────────────── */

export function normaliseReport(raw: unknown): ReportBundle {
  const o = unwrap(raw);

  const runId = str(o.run_id || o.runId || 'unknown');
  const brand = str(o.brand || 'Unknown');
  const market = str(o.market || 'Unknown');
  const generatedAt = str(o.generated_at || o.generatedAt || new Date().toISOString());
  const evidenceDate = str(o.evidence_date || o.evidenceDate || generatedAt.slice(0, 10));

  // Executive
  const exec = obj(o.executive || o.executive_report || o.executive_summary);
  const hm = obj(exec.headline_metrics || exec.headlineMetrics || o.headline_metrics);
  const headlineMetrics: HeadlineMetrics = {
    brandScore: num(hm.ai_visibility_score ?? hm.brandScore ?? hm.brand_score),
    ownedTargetCitations: num(hm.owned_target_page_citations ?? hm.ownedTargetCitations ?? hm.owned_target_citations),
    ownedDomainCitations: num(hm.owned_domain_citations ?? hm.ownedDomainCitations),
    competitorLedQueries: num(hm.competitor_led_query_count ?? hm.competitorLedQueries ?? hm.competitor_led_queries),
    externalLedQueries: num(hm.external_led_query_count ?? hm.externalLedQueries ?? hm.external_led_queries),
    queryCount: num(hm.query_count ?? hm.queryCount),
    ownedPageCount: num(hm.owned_page_count ?? hm.ownedPageCount),
    externalSourceCount: num(hm.external_source_count ?? hm.externalSourceCount),
    averageOwnedGeoScore120: num(hm.average_owned_geo_score_120 ?? hm.averageOwnedGeoScore120),
  };
  const scorecard = arr(exec.brandTopicScorecard || exec.brand_topic_scorecard || (obj(o.executive_summary)).brand_topic_scorecard).map((r: unknown): BrandTopicScorecardRow => {
    const row = obj(r);
    return {
      topic: str(row.topic),
      aiVisibilityScore: row.aiVisibilityScore != null || row.ai_visibility_score != null ? num(row.aiVisibilityScore ?? row.ai_visibility_score) : null,
      relativePosition: str(row.relativePosition || row.relative_position),
      directionVsLastPeriod: str(row.directionVsLastPeriod || row.direction_vs_last_period),
      comment: str(row.comment),
      queryCount: num(row.queryCount ?? row.query_count),
      ownedUrlCount: num(row.ownedUrlCount ?? row.owned_url_count),
      citationCount: num(row.citationCount ?? row.citation_count),
    };
  });
  const executive: ExecutiveSection = {
    summary: str(exec.summary),
    whatIsHappening: arr(exec.what_is_happening || exec.whatIsHappening).map(str),
    whyNow: arr(exec.why_now || exec.whyNow).map(str),
    priorityActions: arr(exec.priority_actions || exec.priorityActions).map(str),
    headlineMetrics,
    brandTopicScorecard: scorecard.length ? scorecard : undefined,
  };

  // Visibility
  const vis = obj(o.visibility);
  const bvc = arr(vis.brandVsCompetitors || vis.brand_vs_competitors || o.competitors).map((c: unknown): CompetitorVisibility => {
    const co = obj(c);
    return { name: str(co.name), visibility: num(co.visibility), citationShare: num(co.citationShare ?? co.citation_share), sentiment: num(co.sentiment), position: (str(co.position) || 'Watchlist') as CompetitorVisibility['position'] };
  });
  const visibility = {
    brandScore: num(vis.brandScore ?? vis.brand_score ?? headlineMetrics.brandScore),
    ownedTargetCitations: num(vis.ownedTargetCitations ?? vis.owned_target_citations ?? headlineMetrics.ownedTargetCitations),
    ownedDomainCitations: num(vis.ownedDomainCitations ?? vis.owned_domain_citations ?? headlineMetrics.ownedDomainCitations),
    competitorLedQueries: num(vis.competitorLedQueries ?? vis.competitor_led_queries ?? headlineMetrics.competitorLedQueries),
    externalLedQueries: num(vis.externalLedQueries ?? vis.external_led_queries ?? headlineMetrics.externalLedQueries),
    brandVsCompetitors: bvc,
  };

  // Source landscape
  const sl = obj(o.source_landscape || o.sourceLandscape);
  const stc = arr(sl.source_type_counts || sl.sourceTypeCounts).map((s: unknown): SourceTypeCount => {
    const so = obj(s); return { sourceType: str(so.sourceType || so.source_type), count: num(so.count) };
  });
  const ond = arr(sl.observed_non_owned_domains || sl.observedNonOwnedDomains).map((d: unknown) => {
    const dd = obj(d);
    return { domain: str(dd.domain || dd.source_domain), sourceType: str(dd.sourceType || dd.source_type), observedCount: num(dd.observedCount ?? dd.observed_count ?? dd.count), exampleUrl: str(dd.exampleUrl || dd.example_url) || undefined, exampleQuery: str(dd.exampleQuery || dd.example_query) || undefined };
  });
  const wsp = arr(sl.winning_source_patterns || sl.winningSourcePatterns).map((p: unknown) => {
    const po = obj(p); return { sourceType: str(po.sourceType || po.source_type), citationCount: num(po.citationCount ?? po.citation_count ?? po.count), winningPattern: str(po.winningPattern || po.winning_pattern || po.pattern_type) };
  });
  const sourceCitations = arr(sl.source_citations || sl.sourceCitations).map((c: unknown) => normaliseCitation(obj(c)));
  const sourceLandscape = { sourceTypeCounts: stc, observedNonOwnedDomains: ond, winningSourcePatterns: wsp, sourceCitations: sourceCitations.length ? sourceCitations : undefined };

  // Trend
  const trend = arr(o.trend || o.run_history).map((t: unknown): TrendPoint => {
    const to = obj(t); return { period: str(to.period), brandScore: num(to.brandScore ?? to.brand_score), ownedCitations: num(to.ownedCitations ?? to.owned_citations), competitorPressure: num(to.competitorPressure ?? to.competitor_pressure) };
  });

  // Queries — from query_workbench or legacy queries array
  const queryWorkbenchRaw = arr(o.query_workbench || o.queryWorkbench);
  const queries = queryWorkbenchRaw.length
    ? queryWorkbenchRaw.map((q: unknown, i: number) => normaliseQuery(obj(q), i))
    : arr(o.queries || o.query_evidence).map((q: unknown, i: number) => normaliseQuery(obj(q), i));

  // Owned pages
  const ownedPages = arr(o.owned_url_readiness || o.ownedPages || o.owned_pages || o.owned_readiness).map((p: unknown) => normaliseOwnedPage(obj(p)));

  // CMS — prefer page_level_cms_recommendations
  const cmsModules = arr(o.page_level_cms_recommendations || o.cms_recommendations || o.cmsModules || o.cms_modules).map((r: unknown) => normaliseRecommendation(obj(r)));

  // PR — prefer grouped_pr_opportunities
  const prOpportunities = arr(o.grouped_pr_opportunities || o.pr_opportunities || o.prOpportunities).map((r: unknown) => normaliseRecommendation(obj(r)));

  // Action checklist
  const actionChecklist = arr(o.action_checklist || o.actionChecklist || o.actions).map((a: unknown) => normaliseAction(obj(a)));

  // Query workbench passthrough
  const queryWorkbench: QueryWorkbenchItem[] | undefined = queryWorkbenchRaw.length ? queryWorkbenchRaw as QueryWorkbenchItem[] : undefined;

  // AI Hygiene
  const hyg = obj(o.ai_discoverability_hygiene || o.site_ai_hygiene || o.aiHygiene || o.ai_hygiene);
  const aiHygiene: AiHygiene | undefined = Object.keys(hyg).length ? {
    priority: str(hyg.priority) || undefined,
    summary: str(hyg.summary) || undefined,
    robots_txt: hyg.robots_txt ? obj(hyg.robots_txt) as AiHygiene['robots_txt'] : undefined,
    llms_txt: hyg.llms_txt ? obj(hyg.llms_txt) as AiHygiene['llms_txt'] : undefined,
    structured_data: hyg.structured_data ? obj(hyg.structured_data) as AiHygiene['structured_data'] : undefined,
  } : undefined;

  return {
    runId, brand, market, generatedAt, evidenceDate,
    executive, visibility, sourceLandscape, trend,
    queries, ownedPages, cmsModules, prOpportunities, actionChecklist,
    queryWorkbench, aiHygiene,
  };
}
