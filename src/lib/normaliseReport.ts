import type { ReportBundle, QueryDiagnostic, OwnedPage, RecommendationModule, ActionItem, CitationExample, SourceTypeCount, TrendPoint, CompetitorVisibility, AiHygiene, BrandTopicScorecardRow } from '../types/report';

function str(v: unknown): string { return v == null ? '' : String(v); }
function num(v: unknown): number { const n = Number(v); return Number.isFinite(n) ? n : 0; }
function arr(v: unknown): unknown[] { return Array.isArray(v) ? v : []; }
function obj(v: unknown): Record<string, unknown> { return v && typeof v === 'object' && !Array.isArray(v) ? v as Record<string, unknown> : {}; }

function unwrap(raw: unknown): Record<string, unknown> {
  let current = raw;
  if (typeof current === 'string') { try { current = JSON.parse(current); } catch { return {}; } }
  if (!current || typeof current !== 'object' || Array.isArray(current)) return {};
  const o = current as Record<string, unknown>;
  for (const key of ['frontend_report_bundle', 'report_bundle', 'bundle', 'report', 'payload', 'data', 'Preview Node']) {
    const v = o[key];
    if (v && typeof v === 'object' && !Array.isArray(v)) return unwrap(v);
    if (typeof v === 'string') { try { return unwrap(JSON.parse(v)); } catch { /* skip */ } }
  }
  return o;
}

function normaliseCitation(r: Record<string, unknown>): CitationExample {
  return {
    title: str(r.title || r.source_name),
    url: str(r.url || r.source_url || r.link || r.href),
    domain: str(r.domain || r.source_domain),
    sourceType: str(r.sourceType || r.source_type || r.source_category || 'other'),
    citationPosition: num(r.citationPosition ?? r.citation_position ?? r.rank),
    snippet: str(r.snippet || r.citation_text || r.text || r.summary || r.content_extract),
    queryId: str(r.queryId || r.query_id),
    query: str(r.query),
    isCompetitor: Boolean(r.isCompetitor ?? r.is_competitor),
    isOwnedTargetPage: Boolean(r.isOwnedTargetPage ?? r.is_owned_target_page),
  };
}

function normaliseQuery(r: Record<string, unknown>): QueryDiagnostic {
  const vis = obj(r.current_ai_visibility || r.currentAiVisibility);
  const citations = arr(vis.top_citations || vis.topCitations || r.citations || r.top_citations).map((c) => normaliseCitation(obj(c)));
  return {
    id: str(r.query_id || r.id || r.qid),
    query: str(r.query || r.search_query || r.question),
    journey: str(r.journey || r.journey_category || r.journey_stage),
    visibilityStatus: str(r.visibilityStatus || r.visibility_status || vis.status),
    ownedTargetPageCited: Boolean(r.ownedTargetPageCited ?? r.owned_target_page_cited ?? vis.owned_target_cited),
    ownedDomainCited: Boolean(r.ownedDomainCited ?? r.owned_domain_cited ?? vis.owned_domain_cited ?? false),
    winningExternalSourceTypes: arr(r.winningExternalSourceTypes || r.winning_external_source_types).map(str),
    ownedGeoScore120: num(r.ownedGeoScore120 ?? r.owned_geo_score_120),
    externalBenchmarkScore: num(r.externalBenchmarkScore ?? r.external_benchmark_score),
    sourcePreferenceGap: num(r.sourcePreferenceGap ?? r.source_preference_gap),
    gapReasons: arr(r.gapReasons || r.gap_reasons || r.geo_gaps).map(str),
    citations,
    brandPosition: num(r.brandPosition ?? r.brand_position),
    leadingCompetitor: str(r.leadingCompetitor || r.leading_competitor),
    leadingPublisher: str(r.leadingPublisher || r.leading_publisher),
    sourceType: str(r.sourceType || r.source_type),
    citationLikelihood: num(r.citationLikelihood ?? r.citation_likelihood),
    confidence: num(r.confidence),
    aiVisibilityScore: num(vis.score ?? r.aiVisibilityScore ?? r.ai_visibility_score),
    competitorBrands: arr(vis.competitors || r.competitorBrands || r.competitor_brands).map(str),
    competitorCitationCount: num(vis.competitor_citation_count ?? r.competitorCitationCount ?? r.competitor_citation_count),
    issue: str(r.issue),
    recommendedMove: str(r.recommendedMove || r.recommended_move),
  };
}

function normaliseOwnedPage(r: Record<string, unknown>): OwnedPage {
  const dims = obj(r.geo_dimensions || r.geoDimensions || r.dimensions || r.dimension_scores);
  const tech = obj(r.technical_signals || r.technicalSignals);
  return {
    url: str(r.url || r.page_url || r.target_url || r.resolved_url),
    title: str(r.title || r.page_title),
    journeyCategory: str(r.journeyCategory || r.journey_category || r.journey || ''),
    evidenceMatchStatus: str(r.evidenceMatchStatus || r.evidence_match_status || r.score_band),
    mappedQuery: str(r.mappedQuery || r.mapped_query),
    relatedQueries: arr(r.relatedQueries || r.related_queries || r.mapped_queries).map((q) => {
      const qo = obj(q);
      return { id: str(qo.id || qo.query_id), query: str(qo.query || qo.text), visibilityStatus: str(qo.visibility_status || qo.visibilityStatus) };
    }),
    geoScore: num(r.geoScore ?? r.current_geo_score_120 ?? r.geo_score_120 ?? r.score_120 ?? r.geo_readiness_score ?? r.readiness_score),
    scoreBand: str(r.scoreBand || r.score_band),
    clarity: num(dims.content_clarity ?? dims.clarity ?? r.clarity),
    semanticDepth: num(dims.semantic_depth ?? dims.semanticDepth ?? r.semanticDepth ?? r.semantic_depth),
    evidence: num(dims.eeat_signals ?? dims.evidence ?? dims.eeat ?? r.evidence ?? r.eeat_signals),
    structure: num(dims.structured_data ?? dims.structure ?? dims.structuredData ?? r.structure ?? r.structured_data),
    freshness: num(dims.freshness_index ?? dims.freshness ?? r.freshness ?? r.freshness_index),
    authority: num(dims.authority ?? r.authority),
    faqReadiness: num(dims.faq_readiness ?? dims.faqReadiness ?? r.faqReadiness ?? r.faq_readiness),
    diagnostics: arr(r.diagnostics || r.geo_gaps).map(str),
    recommendedHtmlChanges: arr(r.recommendedHtmlChanges || r.recommended_html_changes).length ? arr(r.recommendedHtmlChanges || r.recommended_html_changes).map(str) : undefined,
    queryMapped: r.queryMapped != null ? Boolean(r.queryMapped) : r.query_mapped != null ? Boolean(r.query_mapped) : undefined,
    inventorySource: str(r.inventorySource || r.inventory_source) || undefined,
    scoringMethod: str(r.scoringMethod || r.scoring_method) || undefined,
    scoringNotes: str(r.scoringNotes || r.scoring_notes) || undefined,
    technicalSignals: {
      jsonLdPresent: tech.json_ld_present != null ? Boolean(tech.json_ld_present) : tech.jsonLdPresent != null ? Boolean(tech.jsonLdPresent) : undefined,
      schemaTypes: arr(tech.schema_types || tech.schemaTypes).map(str),
      robotsMeta: str(tech.robots_meta || tech.robotsMeta),
      canonicalUrl: str(tech.canonical_url || tech.canonicalUrl),
      metaDescriptionPresent: tech.meta_description_present != null ? Boolean(tech.meta_description_present) : tech.metaDescriptionPresent != null ? Boolean(tech.metaDescriptionPresent) : undefined,
      crawlStatus: str(tech.crawl_status || tech.crawlStatus),
      wordCount: tech.word_count != null ? num(tech.word_count) : tech.wordCount != null ? num(tech.wordCount) : undefined,
      markdownChars: tech.markdown_chars != null ? num(tech.markdown_chars) : tech.markdownChars != null ? num(tech.markdownChars) : undefined,
    },
  };
}

function normaliseRec(r: Record<string, unknown>): RecommendationModule {
  return {
    title: str(r.title),
    targetUrl: str(r.targetUrl || r.target_url || r.url),
    recommendation: str(r.recommendation || r.recommended_change),
    evidencePattern: str(r.evidencePattern || r.winning_pattern_to_copy || r.evidence_pattern),
    priority: (str(r.priority) || 'Medium') as RecommendationModule['priority'],
    owner: str(r.owner),
    journeyCategory: str(r.journeyCategory || r.journey_category) || undefined,
    moduleType: str(r.moduleType || r.module_type) || undefined,
    placement: str(r.placement || r.recommended_placement) || undefined,
    introCopy: str(r.introCopy || r.intro_copy) || undefined,
    bodyCopy: str(r.bodyCopy || r.body_copy) || undefined,
    bulletPoints: arr(r.bulletPoints || r.bullets || r.bullet_points).map(str),
    faqItems: arr(r.faqItems || r.faq_items).map((f) => { const fo = obj(f); return { question: str(fo.question), answer: str(fo.answer) }; }),
    validationRequired: arr(r.validationRequired || r.validation_required).map(str),
    whyItMatters: str(r.whyItMatters || r.why_it_matters) || undefined,
    evidenceBasis: str(r.evidenceBasis || r.evidence_basis) || undefined,
    targetSourceTypes: arr(r.targetSourceTypes || r.target_source_types).map(str),
    valueScore: r.valueScore != null || r.value_score != null ? num(r.valueScore ?? r.value_score) : undefined,
    queryCoverageCount: r.queryCoverageCount != null || r.query_coverage_count != null ? num(r.queryCoverageCount ?? r.query_coverage_count) : undefined,
    linkedQueryIds: arr(r.linkedQueryIds || r.linked_query_ids || r.linked_queries).map((q: unknown) => typeof q === 'object' ? str((q as Record<string, unknown>).query_id) : str(q)),
    sourceType: str(r.sourceType || r.source_type) || undefined,
    sourceRecommendationId: str(r.sourceRecommendationId || r.recommendation_id) || undefined,
    advancedGeoAsset: (r.advanced_geo_asset || r.advancedGeoAsset) as RecommendationModule['advancedGeoAsset'] | undefined,
    advancedPrAssetPack: (r.advanced_pr_asset_pack || r.advancedPrAssetPack) as RecommendationModule['advancedPrAssetPack'] | undefined,
  };
}

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
    targetSourceTypes: arr(r.targetSourceTypes || r.target_source_types).map(str),
    valueScore: r.valueScore != null || r.value_score != null ? num(r.valueScore ?? r.value_score) : undefined,
    queryCoverageCount: r.queryCoverageCount != null || r.query_coverage_count != null ? num(r.queryCoverageCount ?? r.query_coverage_count) : undefined,
    linkedQueryIds: arr(r.linkedQueryIds || r.linked_query_ids).map(str),
    sourceType: str(r.sourceType || r.source_type) || undefined,
    moduleType: str(r.moduleType || r.module_type) || undefined,
  };
}

export function normaliseReport(raw: unknown): ReportBundle {
  const o = unwrap(raw);
  const exec = obj(o.executive || o.executive_report || o.executive_summary);
  const hm = obj(exec.headline_metrics || exec.headlineMetrics);
  const vis = obj(o.visibility);
  const sl = obj(o.source_landscape || o.sourceLandscape);
  const trend = arr(o.trend || o.trends);
  const queries = arr(o.query_workbench || o.queryWorkbench || o.queries || o.query_evidence).map((q) => normaliseQuery(obj(q)));
  const ownedPages = arr(o.owned_url_readiness || o.ownedPages || o.owned_pages || o.owned_readiness).map((p) => normaliseOwnedPage(obj(p)));
  const cmsModules = arr(o.page_level_cms_recommendations || o.cms_recommendations || o.cmsModules).map((r) => normaliseRec(obj(r)));
  const prOpportunities = arr(o.grouped_pr_opportunities || o.pr_opportunities || o.prOpportunities).map((r) => normaliseRec(obj(r)));
  const actionChecklist = arr(o.action_checklist || o.actionChecklist).map((a) => normaliseAction(obj(a)));
  const scorecard = arr(exec.brand_topic_scorecard || exec.brandTopicScorecard).map((r): BrandTopicScorecardRow => {
    const ro = obj(r);
    return {
      topic: str(ro.topic),
      aiVisibilityScore: ro.aiVisibilityScore != null ? num(ro.aiVisibilityScore) : ro.ai_visibility_score != null ? num(ro.ai_visibility_score) : null,
      relativePosition: str(ro.relativePosition || ro.relative_position),
      directionVsLastPeriod: str(ro.directionVsLastPeriod || ro.direction_vs_last_period),
      comment: str(ro.comment),
      queryCount: num(ro.queryCount ?? ro.query_count),
      ownedUrlCount: num(ro.ownedUrlCount ?? ro.owned_url_count),
      citationCount: num(ro.citationCount ?? ro.citation_count),
    };
  });

  const runId = str(o.run_id || o.runId);
  const brand = str(o.brand);
  const market = str(o.market);
  const generatedAt = str(o.generated_at || o.generatedAt);
  const evidenceDate = str(o.evidence_date || o.evidenceDate || generatedAt);

  const sourceCitations = arr(sl.source_citations || sl.sourceCitations).map((c) => normaliseCitation(obj(c)));
  const observedNonOwnedDomains = arr(sl.observed_non_owned_domains || sl.observedNonOwnedDomains).map((d) => {
    const dd = obj(d);
    return {
      domain: str(dd.domain || dd.source_domain),
      sourceType: str(dd.sourceType || dd.source_type),
      observedCount: num(dd.observedCount ?? dd.observed_count ?? dd.count),
      exampleUrl: str(dd.exampleUrl || dd.example_url) || undefined,
      exampleQuery: str(dd.exampleQuery || dd.example_query) || undefined,
    };
  });

  const sourceLandscape = {
    sourceTypeCounts: arr(sl.source_type_counts || sl.sourceTypeCounts).map((s): SourceTypeCount => {
      const so = obj(s); return { sourceType: str(so.sourceType || so.source_type), count: num(so.count) };
    }),
    observedNonOwnedDomains,
    winningSourcePatterns: arr(sl.winning_source_patterns || sl.winningSourcePatterns).map((p) => {
      const po = obj(p); return { sourceType: str(po.sourceType || po.source_type), citationCount: num(po.citationCount ?? po.citation_count ?? po.count), winningPattern: str(po.winningPattern || po.winning_pattern || po.pattern) };
    }),
    sourceCitations,
  };

  const executive = {
    summary: str(exec.summary),
    whatIsHappening: arr(exec.what_is_happening || exec.whatIsHappening).map(str),
    whyNow: arr(exec.why_now || exec.whyNow).map(str),
    priorityActions: arr(exec.priority_actions || exec.priorityActions).map(str),
    headlineMetrics: {
      brandScore: num(hm.ai_visibility_score ?? hm.brandScore ?? hm.brand_score ?? vis.brandScore ?? vis.brand_score),
      ownedTargetCitations: num(hm.owned_target_page_citations ?? hm.ownedTargetCitations ?? hm.owned_target_citations ?? vis.ownedTargetCitations),
      ownedDomainCitations: num(hm.owned_domain_citations ?? hm.ownedDomainCitations ?? vis.ownedDomainCitations),
      competitorLedQueries: num(hm.competitor_led_query_count ?? hm.competitorLedQueries ?? vis.competitorLedQueries),
      externalLedQueries: num(hm.external_led_query_count ?? hm.externalLedQueries ?? vis.externalLedQueries),
      queryCount: num(hm.query_count ?? hm.queryCount),
      ownedPageCount: num(hm.owned_page_count ?? hm.ownedPageCount),
      externalSourceCount: num(hm.external_source_count ?? hm.externalSourceCount),
      averageOwnedGeoScore120: num(hm.average_owned_geo_score_120 ?? hm.averageOwnedGeoScore120),
    },
    brandTopicScorecard: scorecard.length ? scorecard : undefined,
  };

  return {
    runId, brand, market, generatedAt, evidenceDate,
    executive, visibility: {
      brandScore: executive.headlineMetrics.brandScore,
      ownedTargetCitations: executive.headlineMetrics.ownedTargetCitations,
      ownedDomainCitations: executive.headlineMetrics.ownedDomainCitations,
      competitorLedQueries: executive.headlineMetrics.competitorLedQueries,
      externalLedQueries: executive.headlineMetrics.externalLedQueries,
      brandVsCompetitors: arr(vis.brandVsCompetitors || vis.brand_vs_competitors).map((c): CompetitorVisibility => {
        const co = obj(c); return { name: str(co.name), visibility: num(co.visibility), citationShare: num(co.citationShare ?? co.citation_share), sentiment: num(co.sentiment), position: (str(co.position) || 'Watchlist') as CompetitorVisibility['position'] };
      }),
    },
    sourceLandscape,
    trend: trend.map((t): TrendPoint => { const to = obj(t); return { period: str(to.period), brandScore: num(to.brandScore ?? to.brand_score), ownedCitations: num(to.ownedCitations ?? to.owned_citations), competitorPressure: num(to.competitorPressure ?? to.competitor_pressure) }; }),
    queries, ownedPages, cmsModules, prOpportunities, actionChecklist,
    queryWorkbench: arr(o.query_workbench || o.queryWorkbench).length ? arr(o.query_workbench || o.queryWorkbench) as ReportBundle['queryWorkbench'] : undefined,
    aiHygiene: o.ai_discoverability_hygiene || o.site_ai_hygiene || o.aiHygiene ? obj(o.ai_discoverability_hygiene || o.site_ai_hygiene || o.aiHygiene) as unknown as AiHygiene : undefined,
  };
}
