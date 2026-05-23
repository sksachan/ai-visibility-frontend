import { WorkspacePanel, SectionHeader } from './ui';

const sections = [
  {
    title: '1. How to interpret the dashboard',
    summary: 'The dashboard is an evidence-to-action workspace for managing AI brand visibility across search and generative AI answer experiences.',
    items: [
      ['Executive Report', 'Start here. It shows the headline AI Visibility Score (0\u2013100), brand topic scorecard with competitor benchmarking, priority actions, and AI discoverability hygiene status. Use it for CMO and senior stakeholder readouts.'],
      ['AEO Insights: Query Workbench', 'Validates each audited query. Shows query intent, journey stage, visibility status (owned target cited, owned domain cited, external led, competitor led, not observed), competitors detected, citation domains, winning source patterns, and mapped owned URLs with GEO scores.'],
      ['AEO Insights: Source Landscape', 'Visualises the citation layer: which external domains and source types are shaping AI answers, their share of mix (percentage or count), and captured citation evidence with pagination.'],
      ['GEO Insights: Owned URL Readiness', 'Prioritise page-level GEO remediation. Features a waterfall chart showing average dimension contributions to GEO Score, a radar comparison by brand topics, and a paginated table with per-page scores, dimension breakdowns, technical signals, and query mappings.'],
      ['Content Alignment (CMS)', 'Convert diagnosis into page-level content changes. Each recommendation includes a brief, JSON-LD suggestions, verified facts from the page, and FAQ generation. All recommendations should be validated by Brand, Content, and Legal teams before implementation.'],
      ['PR & Brand Suggestions', 'Grouped by external source pattern and query cluster. Shows publisher targets, semantic triggers, asset packs, and briefing copy. PR actions are not tied to owned URLs.'],
      ['Action Checklist', 'Consolidated actions by owner, effort, priority, and workstream. Tracks CMS page optimisation and PR/external proof actions with linked query coverage.'],
    ]
  },
  {
    title: '2. Scoring systems explained',
    summary: 'The platform uses two independent scoring systems: AI Visibility Score (query-level) and GEO Readiness Score (page-level).',
    items: [
      ['AI Visibility Score (0\u2013100)', 'Estimates how strongly the brand is represented in AI answers for each audited query. Calculated from: owned target-page citation (+55), owned domain citation (+30), absence of competitors (+15), external citation evidence (+20 max), with penalties for competitor presence (-15) and external dependency (-8). Scores are comparable across runs using the same query portfolio.'],
      ['GEO Readiness Score (0\u2013120)', 'Measures whether an owned page is likely to be extracted, cited, or used by AI answer systems. This is a page-intrinsic score computed from crawl evidence, independent of query mapping. Six dimensions, each scored 0\u201320.'],
      ['Content Clarity (0\u201320)', 'Rewards direct, extractable sections with clear headings, concise answer blocks, title presence, meta description, word count \u2265300, and \u22652 headings.'],
      ['Semantic Depth (0\u201320)', 'Rewards useful coverage of subtopics, comparisons, constraints, trade-offs. Scored on word count thresholds (600, 1200), numeric evidence count, and heading structure.'],
      ['Structured Data (0\u201320)', 'Rewards JSON-LD/schema presence (+12 for JSON-LD detected) and schema type diversity (+3 per type, max 8). Does not over-score pages solely because schema exists.'],
      ['E-E-A-T Signals (0\u201320)', 'Rewards proof points, dates, specifications, warranties, source-backed claims. Scored on proof term frequency, numeric evidence, and freshness indicators.'],
      ['Freshness Index (0\u201320)', 'Rewards visible recency cues, update dates, current policy/specification references. Bonus for canonical URL presence.'],
      ['FAQ Readiness (0\u201320)', 'Rewards extractable question-answer blocks. Scored on question mark frequency, FAQ mentions, and structured Q&A patterns.'],
      ['Fallback scoring', 'When full markdown crawl text is unavailable, a limited fallback score uses only metadata and technical signals (title, canonical URL, JSON-LD/schema). These are labelled as "Fallback" and should be treated as lower-confidence until the page is recrawled.'],
      ['Value Score (CMS/PR)', 'Internal prioritisation metric for recommendations. Calculated from query coverage count, visibility gap severity, evidence value from winning patterns, and GEO gap analysis. Higher value score = higher implementation priority.'],
    ]
  },
  {
    title: '3. Evidence collection and analysis pipeline',
    summary: 'The pipeline creates a traceable chain from brand topics to query evidence, crawl evidence, and recommendations.',
    items: [
      ['Query Portfolio Builder', 'Queries can be supplied manually, uploaded as custom JSON, reused from a stored portfolio, or generated synthetically through the Bodhi Brand Topic Query Portfolio Builder workflow. The portfolio defines the audit scope with brand topics, journey stages, and query types (branded/non-branded).'],
      ['Owned URL Mapping', 'The Evidence Service reads sitemap inventory and maps the most relevant owned URLs to each query using a multi-signal ranking: query term overlap, page content relevance, intent matching, related-query linkage, and GEO readiness. Mapping affects CMS/PR prioritisation but does not change page-level GEO scores.'],
      ['AI Citation Evidence (SerpAPI)', 'Google AI Mode evidence is collected via SerpAPI to capture real AI answer citations. Can be freshly collected or reused from a previous evidence run. Reuse mode allows CMS and crawl testing without spending new SerpAPI calls.'],
      ['Owned Page Crawling', 'Owned pages from sitemap inventory are crawled to extract: title, canonical URL, meta description, schema types, JSON-LD blocks, extracted markdown text, word count, headings, and technical signals. This crawl evidence feeds into GEO scoring.'],
      ['External Citation Crawling', 'Top external citation URLs are crawled to understand winning patterns: what content structure, evidence types, and answer formats are being preferred by AI systems.'],
      ['Bodhi Auditor Workflow', 'The Auditor consumes the compact evidence bundle and produces: executive insights, query diagnostics, page-level CMS recommendations, grouped PR opportunities, action checklist, and the complete frontend report bundle.'],
      ['Source Classification', 'Each citation URL is classified into source types: owned_brand_ecosystem, competitor_owned, publisher_review, authority_body, partner_infrastructure, forum_social_video, aggregator_marketplace, finance_or_insurance, or other. Classification uses domain pattern matching and brand term detection.'],
    ]
  },
  {
    title: '4. AI discoverability hygiene',
    summary: 'Site-level and page-level controls that help crawlers and AI retrieval systems understand, access, and trust the site.',
    items: [
      ['Robots.txt', 'Indicates whether the site exposes crawler guidance and sitemap references. Missing robots.txt is a high-priority technical hygiene gap.'],
      ['LLMs.txt', 'An emerging guidance convention for AI crawlers and agentic retrieval. Useful as a curated route to important brand, product, and policy pages.'],
      ['JSON-LD/Schema Coverage', 'Percentage of audited owned pages containing structured-data signals. Low coverage creates a structured-data remediation action.'],
      ['Technical Signals', 'Per-page signals shown in the Owned URLs table: schema types detected, canonical URL, meta description presence, crawl status, and word count.'],
    ]
  },
  {
    title: '5. Multi-brand and multi-market support',
    summary: 'The platform supports any brand, any market, and any industry vertical.',
    items: [
      ['Brand Configuration', 'Save and load brand configurations with owned domains, brand terms, default parameters. Configurations persist across sessions and can be shared across team members.'],
      ['Owned Domain Classification', 'Owned domains are specified per brand configuration. URLs matching owned domains are classified as owned_brand_ecosystem. Brand terms are used for stop-word filtering and branded/non-branded query classification.'],
      ['Custom Portfolio Upload', 'Upload custom query portfolios in JSON format when you want to bypass the synthetic portfolio builder. Useful for brand teams with specific audit requirements.'],
      ['Industry Agnostic', 'Query portfolio generation, source classification, and GEO scoring are parameterised. The platform works for automotive, technology, retail, healthcare, finance, or any other industry vertical.'],
    ]
  },
  {
    title: '6. Recommendation logic and governance',
    summary: 'Recommendations are implementation briefs that must be validated before publication.',
    items: [
      ['CMS Recommendations', 'Generated when owned pages need answer blocks, comparison modules, FAQs, proof points, or better page structure. Aggregated by page (not per query) to minimise implementation effort while maximising query coverage.'],
      ['PR Recommendations', 'Generated when external publishers, authorities, partners, or communities are shaping AI answers. Grouped by source pattern and query cluster, not by owned URL.'],
      ['Advanced GEO Assets', 'When available, CMS recommendations include: direct answer (40 words), HTML component, JSON-LD extension script, verified facts with source traceability, and validation flags.'],
      ['Fact Traceability', 'Every numeric, technical, or specification claim in advanced assets must be traceable to: owned page visible crawl text, existing JSON-LD, crawl metadata, or approved input facts. No inferred values or model memory.'],
      ['Confidence and Freshness', 'AI answers are dynamic. A single run is an evidence sample. Use repeat runs with the same query portfolio to assess movement over time.'],
      ['Governance', 'Product, Legal, SEO, Content, and Brand teams should validate all claims, regulated language, specifications, and external-source dependencies before implementation.'],
    ]
  },
  {
    title: '7. Integration architecture',
    summary: 'The platform integrates multiple services for evidence collection and analysis.',
    items: [
      ['Frontend (React/TypeScript)', 'Dashboard deployed on Railway. Renders the report bundle, provides refresh controls, brand configuration management, and PDF export.'],
      ['Evidence Service (FastAPI)', 'Deployed on Railway with persistent volume. Manages runs, status, portfolios, compact evidence, and final frontend bundles. Orchestrates refresh pipeline.'],
      ['Bodhi Studio Workflows', 'Two workflows: Brand Topic Query Portfolio Builder (generates synthetic query portfolios) and AI Audit Workflow (builds the canonical frontend report bundle from evidence).'],
      ['SerpAPI Integration', 'Google AI Mode evidence collection. Captures AI answer text and citation reference links for each audited query.'],
      ['Report Storage', 'Evidence runs are stored on Railway persistent volume. Latest successful report is always available. Previous runs can be loaded, compared, or deleted.'],
    ]
  }
];

export function MethodologyAppendix() {
  return (
    <div className="space-y-5">
      <div className="grid gap-4 lg:grid-cols-2">
        {sections.map((section) => (
          <WorkspacePanel key={section.title}>
            <SectionHeader title={section.title}>{section.summary}</SectionHeader>
            <div className="mt-3 space-y-3">
              {section.items.map(([itemLabel, text]) => (
                <div key={itemLabel} className="rounded-[var(--radius-sm)] border border-[var(--border-subtle)] bg-[var(--bg-card)] p-3">
                  <p className="text-sm font-semibold text-[var(--text-primary)]">{itemLabel}</p>
                  <p className="mt-1 text-sm leading-6 text-[var(--text-secondary)]">{text}</p>
                </div>
              ))}
            </div>
          </WorkspacePanel>
        ))}
      </div>
    </div>
  );
}
