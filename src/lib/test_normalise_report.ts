/**
 * Phase 4 — normaliseReport validation tests.
 *
 * Run with: npx tsx src/lib/test_normalise_report.ts
 *
 * These tests verify that the normaliser correctly transforms backend
 * snake_case payloads into the camelCase ReportBundle type, handles
 * missing fields defensively, and works for any brand/market.
 */

import { normaliseReport } from './normaliseReport';

let passed = 0;
let failed = 0;

function assert(condition: boolean, message: string) {
  if (condition) {
    console.log(`  \u2713 ${message}`);
    passed++;
  } else {
    console.error(`  \u2717 FAIL: ${message}`);
    failed++;
  }
}

// ---------------------------------------------------------------------------
// 1. Canonical payload (snake_case)
// ---------------------------------------------------------------------------
console.log('\n=== Test: Canonical snake_case payload ===');
{
  const payload = {
    run_id: 'toyota_germany_001',
    brand: 'Toyota',
    market: 'Germany',
    generated_at: '2026-05-21T12:00:00Z',
    executive: {
      summary: 'Toyota Germany visibility report.',
      what_is_happening: ['Finding 1'],
      why_now: ['Reason 1'],
      priority_actions: ['Action 1'],
      headline_metrics: {
        brand_score: 8.5,
        owned_target_citations: 12,
        owned_domain_citations: 25,
        competitor_led_queries: 5,
        external_led_queries: 8,
      },
    },
    owned_url_readiness: [
      {
        url: 'https://www.toyota.de/corolla',
        page_title: 'Corolla',
        journey_category: 'Product',
        geo_score_120: 85,
        geo_dimensions: { clarity: 16, semantic_depth: 14, structured_data: 13, eeat: 15, freshness: 14, faq_readiness: 13 },
        geo_gaps: ['Needs FAQ'],
      },
    ],
    page_level_cms_recommendations: [
      { title: 'Add FAQ', target_url: 'https://www.toyota.de/corolla', recommendation: 'Add FAQ block', evidence_pattern: 'Winning sources use FAQ', priority: 'High', owner: 'CMS' },
    ],
    grouped_pr_opportunities: [
      { title: 'EV PR', target_url: 'EV pages', recommendation: 'Secure EV coverage', evidence_pattern: 'External benchmark', priority: 'Medium', owner: 'PR' },
    ],
    action_checklist: [
      { action: 'Add FAQ to Corolla page', owner: 'CMS', priority: 'High', effort: 'S', status: 'Not started' },
    ],
    ai_discoverability_hygiene: {
      robots_txt: { status: 'found', url: 'https://www.toyota.de/robots.txt' },
      llms_txt: { status: 'not_found' },
      structured_data: { owned_pages_total: 10, pages_with_json_ld: 7, coverage_pct: 70 },
    },
    source_landscape: {
      source_type_counts: [{ source_type: 'Publisher', count: 15 }],
      observed_non_owned_domains: [{ domain: 'autozeitung.de', source_type: 'Publisher', observed_count: 5 }],
      winning_source_patterns: [{ source_type: 'Publisher', citation_count: 15, winning_pattern: 'Comparison articles' }],
      source_citations: [{ url: 'https://autozeitung.de/test', domain: 'autozeitung.de', source_type: 'Publisher', title: 'Test' }],
    },
  };

  const report = normaliseReport(payload);
  assert(report.runId === 'toyota_germany_001', 'run_id mapped to runId');
  assert(report.brand === 'Toyota', 'brand preserved');
  assert(report.market === 'Germany', 'market preserved');
  assert(report.executive.summary === 'Toyota Germany visibility report.', 'executive.summary mapped');
  assert(report.executive.headlineMetrics.brandScore === 8.5, 'headline_metrics.brand_score mapped');
  assert(report.executive.whatIsHappening.length === 1, 'what_is_happening mapped');
  assert(report.ownedPages.length === 1, 'owned_url_readiness mapped to ownedPages');
  assert(report.ownedPages[0].url === 'https://www.toyota.de/corolla', 'owned page URL preserved');
  assert(report.ownedPages[0].geoScore === 85, 'geo_score_120 mapped to geoScore');
  assert(report.ownedPages[0].clarity === 16, 'geo_dimensions.clarity mapped');
  assert(report.cmsModules.length === 1, 'page_level_cms_recommendations mapped');
  assert(report.prOpportunities.length === 1, 'grouped_pr_opportunities mapped');
  assert(report.actionChecklist.length === 1, 'action_checklist mapped');
  assert(report.aiHygiene?.robots_txt?.status === 'found', 'ai_discoverability_hygiene mapped');
  assert(report.aiHygiene?.structured_data?.coverage_pct === 70, 'structured_data coverage mapped');
  assert(report.sourceLandscape?.sourceTypeCounts?.length === 1, 'source_landscape mapped');
  assert(report.sourceLandscape?.sourceCitations?.length === 1, 'source_citations mapped');
}

// ---------------------------------------------------------------------------
// 2. Empty / minimal payload
// ---------------------------------------------------------------------------
console.log('\n=== Test: Empty payload ===');
{
  const report = normaliseReport({});
  assert(report.runId === '', 'empty payload has empty runId');
  assert(report.brand === '', 'empty payload has empty brand');
  assert(report.queries.length === 0, 'empty payload has no queries');
  assert(report.ownedPages.length === 0, 'empty payload has no owned pages');
  assert(report.cmsModules.length === 0, 'empty payload has no CMS modules');
  assert(report.parserMeta?.warnings?.length! > 0, 'empty payload generates warnings');
}

// ---------------------------------------------------------------------------
// 3. Wrapped payload (frontend_report_bundle wrapper)
// ---------------------------------------------------------------------------
console.log('\n=== Test: Wrapped payload ===');
{
  const wrapped = {
    frontend_report_bundle: {
      run_id: 'wrapped_001',
      brand: 'BMW',
      market: 'UK',
      executive: { summary: 'BMW UK report', headline_metrics: { brand_score: 6.0, owned_target_citations: 5, owned_domain_citations: 10, competitor_led_queries: 3, external_led_queries: 4 } },
    },
  };
  const report = normaliseReport(wrapped);
  assert(report.runId === 'wrapped_001', 'unwrapped frontend_report_bundle');
  assert(report.brand === 'BMW', 'brand from wrapped payload');
}

// ---------------------------------------------------------------------------
// 4. Non-automotive brand
// ---------------------------------------------------------------------------
console.log('\n=== Test: Non-automotive brand (tech) ===');
{
  const payload = {
    run_id: 'aws_global_001',
    brand: 'AWS',
    market: 'Global',
    executive: { summary: 'AWS cloud visibility.', headline_metrics: { brand_score: 9.0, owned_target_citations: 30, owned_domain_citations: 50, competitor_led_queries: 2, external_led_queries: 5 } },
    queries: [{ query_id: 'q1', query: 'best cloud provider', journey_category: 'Consideration', visibility_status: 'visible' }],
  };
  const report = normaliseReport(payload);
  assert(report.brand === 'AWS', 'non-automotive brand works');
  assert(report.queries.length === 1, 'queries parsed for non-automotive');
  assert(report.queries[0].journey === 'Consideration', 'journey_category mapped to journey');
}

// ---------------------------------------------------------------------------
// Summary
// ---------------------------------------------------------------------------
console.log(`\n${'='.repeat(50)}`);
console.log(`Results: ${passed} passed, ${failed} failed out of ${passed + failed} assertions`);
if (failed > 0) process.exit(1);
