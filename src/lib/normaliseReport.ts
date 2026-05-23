/**
 * Normalise any backend payload shape into the canonical ReportBundle.
 * This file MUST exist at src/lib/normaliseReport.ts for the frontend to build.
 */
import type {
  ReportBundle, ExecutiveSection, HeadlineMetrics, QueryDiagnostic,
  OwnedPage, RecommendationModule, ActionItem, CitationExample,
  CompetitorVisibility, SourceTypeCount, TrendPoint, AiHygiene,
  BrandTopicScorecardRow, QueryWorkbenchItem,
} from '../types/report';

function str(v: unknown): string { return typeof v === 'string' ? v : v != null ? String(v) : ''; }
function num(v: unknown, fallback = 0): number { const n = Number(v); return Number.isFinite(n) ? n : fallback; }
function arr(v: unknown): unknown[] { return Array.isArray(v) ? v : []; }
function obj(v: unknown): Record<string, unknown> { return v && typeof v === 'object' && !Array.isArray(v) ? v as Record<string, unknown> : {}; }
function bool(v: unknown, fallback = false): boolean { if (typeof v === 'boolean') return v; if (v == null) return fallback; return Boolean(v); }

function parseCitation(r: unknown): CitationExample {
  const c = obj(r);
  return {
    title: str(c.title || c.source_name),
    url: str(c.url || c.source_url || c.link || c.href),
    domain: str(c.domain || c.source_domain),
    sourceType: str(c.sourceType || c.source_type || c.source_category),
    citationPosition: c.citationPosition != null ? num(c.citationPosition) : c.citation_position != null ? num(c.citation_position) : c.rank != null ? num(c.rank) : undefined,
    snippet: str(c.snippet || c.citation_text || c.text || c.summary),
    queryId: str(c.queryId || c.query_id) || undefined,
    query: str(c.query) || undefined,
    isCompetitor: bool(c.isCompetitor ?? c.is_competitor),
    isOwnedTargetPage: bool(c.isOwnedTargetPage ?? c.is_owned_target_page),
  };
}

function parseQuery(r: unknown, idx: number): QueryDiagnostic {
  const q = obj(r);
  const vis = obj(q.current_ai_visibility || q.currentAiVisibility);
  const citations = arr(vis.top_citations || vis.topCitations || q.citations).map(parseCitation);
  return {
    id: str(q.query_id || q.id || q.qid || `q${idx + 1}`),
    query: str(q.query || q.search_query || q.question),
    journey: str(q.journey || q.journey_category || q.journey_stage),
    visibilityStatus: str(q.visibilityStatus || q.visibility_status || vis.status),
    ownedTargetPageCited: bool(q.ownedTargetPageCited ?? q.owned_target_page_cited ?? vis.owned_target_cited),
    ownedDomainCited: (q.ownedDomainCited ?? q.owned_domain_cited ?? vis.owned_domain_cited) != null ? bool(q.ownedDomainCited ?? q.owned_domain_cited ?? vis.owned_domain_cited) : undefined,
    winningExternalSourceTypes: arr(q.winningExternalSourceTypes || q.winning_external_source_types).map(String),
    ownedGeoScore120: num(q.ownedGeoScore120 ?? q.owned_geo_score_120),
    externalBenchmarkScore: num(q.externalBenchmarkScore ?? q.external_benchmark_score),
    sourcePreferenceGap: num(q.sourcePreferenceGap ?? q.source_preference_gap),
    gapReasons: arr(q.gapReasons || q.gap_reasons || q.geo_gaps).map(String),
    citations,
    brandPosition: num(q.brandPosition ?? q.brand_position),
    leadingCompetitor: str(q.leadingCompetitor || q.leading_competitor),
    leadingPublisher: str(q.leadingPublisher || q.leading_publisher),
    sourceType: str(q.sourceType || q.source_type),
    citationLikelihood: num(q.citationLikelihood ?? q.citation_likelihood),
    confidence: num(q.confidence),
    aiVisibilityScore: vis.score != null ? num(vis.score) : undefined,
    competitorBrands: arr(vis.competitors || q.competitor_brands || q.competitorBrands).map(String),
    competitorCitationCount: num(vis.competitor_citation_count ?? q.competitorCitationCount ?? q.competitor_citation_count),
    issue: str(q.issue || q.gap_summary),
    recommendedMove: str(q.recommendedMove || q.recommended_move || q.recommendation),
  };
}

function parseOwnedPage(r: unknown): OwnedPage {
  const p = obj(r);
  const dims = obj(p.geo_dimensions || p.dimensions || p.dimension_scores || p.geoDimensions);
  const tech = obj(p.technical_signals || p.technicalSignals);
  const score = num(p.current_geo_score_120 ?? p.geoScore ?? p.geo_score_120 ?? p.readiness_score ?? p.score_120);
  return {
    url: str(p.url || p.page_url || p.target_url),
    title: str(p.title || p.page_title) || undefined,
    journeyCategory: str(p.journeyCategory || p.journey_category || p.journey),
    evidenceMatchStatus: str(p.evidenceMatchStatus || p.evidence_match_status) || undefined,
    mappedQuery: str(p.mappedQuery || p.mapped_query),
    relatedQueries: arr(p.related_queries || p.relatedQueries).map((rq) => {
      const q = obj(rq);
      return { id: str(q.id || q.query_id), query: str(q.query), visibilityStatus: str(q.visibility_status || q.visibilityStatus) || undefined };
    }),
    geoScore: score,
    scoreBand: str(p.scoreBand || p.score_band) || undefined,
    clarity: num(dims.content_clarity ?? dims.clarity ?? p.clarity),
    semanticDepth: num(dims.semantic_depth ?? dims.semanticDepth ?? p.semanticDepth ?? p.semantic_depth),
    evidence: num(dims.structured_data ?? dims.evidence ?? p.evidence ?? p.structured_data),
    structure: num(dims.eeat_signals ?? dims.structure ?? p.structure ?? p.eeat_signals),
    freshness: num(dims.freshness_index ?? dims.freshness ?? p.freshness ?? p.freshness_index),
    authority: num(dims.eeat_signals ?? dims.authority ?? p.authority),
    faqReadiness: dims.faq_readiness != null || dims.faqReadiness != null || p.faq_readiness != null || p.faqReadiness != null ? num(dims.faq_readiness ?? dims.faqReadiness ?? p.faq_readiness ?? p.faqReadiness) : undefined,
    diagnostics: arr(p.diagnostics || p.geo_gaps).map(String),
    recommendedHtmlChanges: arr(p.recommendedHtmlChanges || p.recommended_html_changes).length ? arr(p.recommendedHtmlChanges || p.recommended_html_changes).map(String) : undefined,
    queryMapped: p.queryMapped != null ? bool(p.queryMapped) : p.query_mapped != null ? bool(p.query_mapped) : undefined,
    inventorySource: str(p.inventorySource || p.inventory_source) || undefined,
    scoringMethod: str(p.scoringMethod || p.scoring_method) || undefined,
    scoringNotes: str(p.scoringNotes || p.scoring_notes) || undefined,
    technicalSignals: tech && Object.keys(tech).length ? {
      jsonLdPresent: tech.json_ld_present != null ? bool(tech.json_ld_present) : tech.jsonLdPresent != null ? bool(tech.jsonLdPresent) : undefined,
      schemaTypes: arr(tech.schema_types || tech.schemaTypes).map(String),
      robotsMeta: str(tech.robots_meta || tech.robotsMeta) || undefined,
      canonicalUrl: str(tech.canonical_url || tech.canonicalUrl) || undefined,
      metaDescriptionPresent: tech.meta_description_present != null ? bool(tech.meta_description_present) : undefined,
      crawlStatus: str(tech.crawl_status || tech.crawlStatus) || undefined,
      wordCount: tech.word_count != null ? num(tech.word_count) : tech.wordCount != null ? num(tech.wordCount) : undefined,
      markdownChars: tech.markdown_chars != null ? num(tech.markdown_chars) : undefined,
    } : undefined,
  };
}

function parseRec(r: unknown): RecommendationModule {
  const m = obj(r);
  return {
    title: str(m.title),
    targetUrl: str(m.targetUrl || m.target_url || m.url),
    recommendation: str(m.recommendation || m.recommended_change || m.recommended_pr_action),
    evidencePattern: str(m.evidencePattern || m.evidence_pattern || m.winning_pattern_to_copy),
    priority: (str(m.priority) || 'Medium') as RecommendationModule['priority'],
    owner: str(m.owner),
    journeyCategory: str(m.journeyCategory || m.journey_category) || undefined,
    moduleType: str(m.moduleType || m.module_type) || undefined,
    placement: str(m.placement || m.recommended_placement) || undefined,
    introCopy: str(m.introCopy || m.intro_copy) || undefined,
    bodyCopy: str(m.bodyCopy || m.body_copy) || undefined,
    bulletPoints: arr(m.bulletPoints || m.bullets || m.content_requirements).map(String),
    faqItems: arr(m.faqItems || m.faq_items).map((f) => { const fq = obj(f); return { question: str(fq.question), answer: str(fq.answer) }; }),
    validationRequired: arr(m.validationRequired || m.validation_required).map(String),
    whyItMatters: str(m.whyItMatters || m.why_it_matters) || undefined,
    evidenceBasis: str(m.evidenceBasis || m.evidence_basis) || undefined,
    targetSourceTypes: arr(m.targetSourceTypes || m.target_source_types).map(String),
    valueScore: m.valueScore != null || m.value_score != null ? num(m.valueScore ?? m.value_score) : undefined,
    queryCoverageCount: m.queryCoverageCount != null || m.query_coverage_count != null ? num(m.queryCoverageCount ?? m.query_coverage_count) : undefined,
    linkedQueryIds: arr(m.linkedQueryIds || m.linked_query_ids || m.linked_queries).map((q: unknown) => typeof q === 'object' ? str((q as Record<string, unknown>).query_id) : str(q)),
    sourceType: str(m.sourceType || m.source_type) || undefined,
    sourceRecommendationId: str(m.sourceRecommendationId || m.recommendation_id) || undefined,
    advancedGeoAsset: (m.advanced_geo_asset || m.advancedGeoAsset) as RecommendationModule['advancedGeoAsset'],
    advancedPrAssetPack: (m.advanced_pr_asset_pack || m.advancedPrAssetPack) as RecommendationModule['advancedPrAssetPack'],
  };
}

function parseAction(r: unknown): ActionItem {
  const a = obj(r);
  return {
    action: str(a.action || a.title),
    owner: str(a.owner),
    priority: (str(a.priority) || 'Medium') as ActionItem['priority'],
    effort: (str(a.effort) || 'M') as ActionItem['effort'],
    status: (str(a.status) || 'Not started') as ActionItem['status'],
    dependency: str(a.dependency) || undefined,
    source: str(a.source) || undefined,
    target: str(a.target || a.target_url) || undefined,
    workstream: str(a.workstream) || undefined,
    category: str(a.category) || undefined,
    valueScore: a.value_score != null || a.valueScore != null ? num(a.value_score ?? a.valueScore) : undefined,
    queryCoverageCount: a.query_coverage_count != null || a.queryCoverageCount != null ? num(a.query_coverage_count ?? a.queryCoverageCount) : undefined,
    linkedQueryIds: arr(a.linked_query_ids || a.linkedQueryIds).map(String),
    moduleType: str(a.module_type || a.moduleType) || undefined,
  };
}

function parseScorecard(r: unknown): BrandTopicScorecardRow {
  const s = obj(r);
  return {
    topic: str(s.topic),
    aiVisibilityScore: s.aiVisibilityScore != null ? num(s.aiVisibilityScore) : s.ai_visibility_score != null ? num(s.ai_visibility_score) : null,
    relativePosition: str(s.relativePosition || s.relative_position),
    directionVsLastPeriod: str(s.directionVsLastPeriod || s.direction_vs_last_period),
    comment: str(s.comment),
    queryCount: s.queryCount != null ? num(s.queryCount) : s.query_count != null ? num(s.query_count) : undefined,
    ownedUrlCount: s.ownedUrlCount != null ? num(s.ownedUrlCount) : s.owned_url_count != null ? num(s.owned_url_count) : undefined,
    citationCount: s.citationCount != null ? num(s.citationCount) : s.citation_count != null ? num(s.citation_count) : undefined,
  };
}

export function normaliseReport(raw: unknown): ReportBundle {
  const p = obj(raw);
  const runId = str(p.run_id || p.runId);
  const brand = str(p.brand);
  const market = str(p.market);
  const generatedAt = str(p.generated_at || p.generatedAt);
  const evidenceDate = str(p.evidence_date || p.evidenceDate || generatedAt);

  const exec = obj(p.executive || p.executive_report);
  const hm = obj(exec.headline_metrics || exec.headlineMetrics);
  const headlineMetrics: HeadlineMetrics = {
    brandScore: num(hm.ai_visibility_score ?? hm.brandScore ?? hm.brand_score),
    ownedTargetCitations: num(hm.owned_target_page_citations ?? hm.ownedTargetCitations ?? hm.owned_target_citations),
    ownedDomainCitations: num(hm.owned_domain_citations ?? hm.ownedDomainCitations),
    competitorLedQueries: num(hm.competitor_led_query_count ?? hm.competitorLedQueries ?? hm.competitor_led_queries),
    externalLedQueries: num(hm.external_led_query_count ?? hm.externalLedQueries ?? hm.external_led_queries),
    queryCount: hm.query_count != null ? num(hm.query_count) : hm.queryCount != null ? num(hm.queryCount) : undefined,
    ownedPageCount: hm.owned_page_count != null ? num(hm.owned_page_count) : hm.ownedPageCount != null ? num(hm.ownedPageCount) : undefined,
    externalSourceCount: hm.external_source_count != null ? num(hm.external_source_count) : undefined,
    averageOwnedGeoScore120: hm.average_owned_geo_score_120 != null ? num(hm.average_owned_geo_score_120) : hm.averageOwnedGeoScore120 != null ? num(hm.averageOwnedGeoScore120) : undefined,
  };

  const scorecard = arr(exec.brandTopicScorecard || exec.brand_topic_scorecard || obj(p.executive_summary).brand_topic_scorecard).map(parseScorecard);

  const executive: ExecutiveSection = {
    summary: str(exec.summary),
    whatIsHappening: arr(exec.what_is_happening || exec.whatIsHappening).map(String),
    whyNow: arr(exec.why_now || exec.whyNow).map(String),
    priorityActions: arr(exec.priority_actions || exec.priorityActions).map(String),
    headlineMetrics,
    brandTopicScorecard: scorecard.length ? scorecard : undefined,
  };

  const vis = obj(p.visibility);
  const visibility = {
    brandScore: num(vis.brandScore ?? vis.brand_score ?? headlineMetrics.brandScore),
    ownedTargetCitations: num(vis.ownedTargetCitations ?? vis.owned_target_citations ?? headlineMetrics.ownedTargetCitations),
    ownedDomainCitations: num(vis.ownedDomainCitations ?? vis.owned_domain_citations ?? headlineMetrics.ownedDomainCitations),
    competitorLedQueries: num(vis.competitorLedQueries ?? vis.competitor_led_queries ?? headlineMetrics.competitorLedQueries),
    externalLedQueries: num(vis.externalLedQueries ?? vis.external_led_queries ?? headlineMetrics.externalLedQueries),
    brandVsCompetitors: arr(vis.brandVsCompetitors || vis.brand_vs_competitors).map((c) => {
      const cv = obj(c);
      return { name: str(cv.name), visibility: num(cv.visibility), citationShare: num(cv.citationShare ?? cv.citation_share), sentiment: num(cv.sentiment), position: (str(cv.position) || 'Watchlist') as CompetitorVisibility['position'] };
    }),
  };

  const sl = obj(p.source_landscape || p.sourceLandscape);
  const sourceLandscape = {
    sourceTypeCounts: arr(sl.source_type_counts || sl.sourceTypeCounts).map((s) => { const st = obj(s); return { sourceType: str(st.sourceType || st.source_type), count: num(st.count) } as SourceTypeCount; }),
    observedNonOwnedDomains: arr(sl.observed_non_owned_domains || sl.observedNonOwnedDomains).map((d) => { const dd = obj(d); return { domain: str(dd.domain || dd.source_domain), sourceType: str(dd.sourceType || dd.source_type), observedCount: num(dd.observedCount ?? dd.observed_count ?? dd.count), exampleUrl: str(dd.exampleUrl || dd.example_url) || undefined, exampleQuery: str(dd.exampleQuery || dd.example_query) || undefined }; }),
    winningSourcePatterns: arr(sl.winning_source_patterns || sl.winningSourcePatterns).map((w) => { const ww = obj(w); return { sourceType: str(ww.sourceType || ww.source_type), citationCount: num(ww.citationCount ?? ww.citation_count ?? ww.count), winningPattern: str(ww.winningPattern || ww.winning_pattern || ww.pattern_type) }; }),
    sourceCitations: arr(sl.source_citations || sl.sourceCitations).map(parseCitation),
  };

  const trend: TrendPoint[] = arr(p.trend || p.run_history).map((t) => { const tp = obj(t); return { period: str(tp.period), brandScore: num(tp.brandScore ?? tp.brand_score), ownedCitations: num(tp.ownedCitations ?? tp.owned_citations), competitorPressure: num(tp.competitorPressure ?? tp.competitor_pressure) }; });
  const queries = arr(p.query_workbench || p.queries || p.query_evidence).map(parseQuery);
  const ownedPages = arr(p.owned_url_readiness || p.owned_readiness || p.ownedPages || p.owned_pages).map(parseOwnedPage);
  const cmsModules = arr(p.page_level_cms_recommendations || p.cms_recommendations || p.cmsModules).map(parseRec);
  const prOpportunities = arr(p.grouped_pr_opportunities || p.pr_opportunities || p.prOpportunities).map(parseRec);
  const actionChecklist = arr(p.action_checklist || p.actionChecklist).map(parseAction);
  const queryWorkbench: QueryWorkbenchItem[] | undefined = Array.isArray(p.query_workbench) ? p.query_workbench as QueryWorkbenchItem[] : undefined;
  const rawHygiene = obj(p.ai_discoverability_hygiene || p.aiHygiene || p.site_ai_hygiene || p.ai_hygiene);
  const aiHygiene: AiHygiene | undefined = Object.keys(rawHygiene).length ? rawHygiene as AiHygiene : undefined;

  return {
    runId, brand, market, generatedAt, evidenceDate,
    executive, visibility, sourceLandscape, trend,
    queries, ownedPages, cmsModules, prOpportunities, actionChecklist,
    queryWorkbench, aiHygiene,
  };
}
