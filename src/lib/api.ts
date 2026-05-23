import { normaliseReport } from './normaliseReport';
import type { ReportBundle } from '../types/report';

/* ── Types ─────────────────────────────────────────────── */
export interface RunStatusSummary {
  active: boolean;
  stage?: string;
  status?: string;
  runId?: string;
  targetRunId?: string;
  jobId?: string;
  latestSuccessfulRunId?: string;
  raw?: Record<string, unknown>;
}

export interface ReportHistoryRun {
  run_id: string;
  brand?: string;
  market?: string;
  query_count?: number;
  citation_count?: number;
  owned_pages_scoreable?: number;
  owned_inventory_selected?: number;
  external_pages_scoreable?: number;
  crawl_success_rate?: number;
  serpapi_enabled?: boolean;
  source_run_id?: string;
  completed_at_epoch?: number;
  created_at_epoch?: number;
}

export interface BrandConfig {
  config_id?: string;
  brand: string;
  market: string;
  domain?: string;
  owned_domains?: string[];
  brand_terms?: string[];
  language?: string;
  default_sitemap_url?: string;
  default_seed_topics?: string;
  default_topic_count?: number;
  default_queries_per_topic?: number;
  default_query_limit?: number;
  default_portfolio_goal?: string;
}

export interface PortfolioValidationResult {
  status: string;
  errors?: string[];
  validation?: { valid: boolean; errors?: string[]; warnings?: string[]; stats?: { query_count?: number; topic_count?: number } };
}

export interface RefreshEvidencePayload {
  brand: string;
  market: string;
  domain?: string;
  runMode?: string;
  queryPortfolioMode?: string;
  queryPortfolioId?: string;
  sourceRunId?: string;
  sitemapUrl?: string;
  seedTopics?: string;
  topicCount?: number;
  queriesPerTopic?: number;
  language?: string;
  portfolioGoal?: string;
  queryLimit?: number;
  maxOwnedPagesPerQuery?: number;
  maxExternalCitationsPerQuery?: number;
  maxOwnedInventoryUrls?: number;
  maxExternalUrls?: number;
  enableSerpapi?: boolean;
  enableOwnedCrawl?: boolean;
  enableExternalCrawl?: boolean;
  triggerAuditor?: boolean;
  ownedDomains?: string;
  brandTerms?: string;
  customPortfolio?: Record<string, unknown>;
}

export interface RefreshResult {
  targetRunId?: string;
  evidenceRunId?: string;
  runId?: string;
  jobId?: string;
}

/* ── Helpers ───────────────────────────────────────────── */
async function fetchJson(url: string, init?: RequestInit) {
  const res = await fetch(url, { ...init, headers: { Accept: 'application/json', ...(init?.headers || {}) } });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`${res.status} ${res.statusText}${text ? `: ${text.slice(0, 200)}` : ''}`);
  }
  return res.json();
}

/* ── Report loading ────────────────────────────────────── */
export async function fetchLatestReport(brand: string, market: string): Promise<ReportBundle> {
  const params = new URLSearchParams({ brand, market }).toString();
  const json = await fetchJson(`/api/bodhi/latest?${params}`);
  return normaliseReport(json);
}

/* ── Refresh status ────────────────────────────────────── */
export async function fetchRefreshStatus(brand: string, market: string, runId?: string): Promise<RunStatusSummary> {
  const params = new URLSearchParams({ brand, market });
  if (runId) params.set('runId', runId);
  const json = await fetchJson(`/api/evidence/status?${params.toString()}`);
  const raw = json && typeof json === 'object' ? json : {};
  return {
    active: Boolean(raw.active ?? raw.is_active ?? (raw.stage && !['completed', 'success', 'successful', 'succeeded', 'report_bundle_ready', 'failed', 'error'].includes(String(raw.stage || raw.status || '').toLowerCase()))),
    stage: String(raw.stage || raw.current_stage || raw.status || ''),
    status: String(raw.status || raw.stage || ''),
    runId: String(raw.run_id || raw.target_run_id || raw.evidence_run_id || ''),
    targetRunId: String(raw.target_run_id || raw.run_id || ''),
    jobId: String(raw.job_id || ''),
    latestSuccessfulRunId: String(raw.latest_successful_run_id || raw.latest_successful || ''),
    raw,
  };
}

/* ── Refresh evidence ──────────────────────────────────── */
export async function refreshEvidence(payload: RefreshEvidencePayload): Promise<RefreshResult> {
  const json = await fetchJson('/api/evidence/refresh', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const raw = json && typeof json === 'object' ? json : {};
  return {
    targetRunId: raw.target_run_id || raw.run_id || raw.evidence_run_id,
    evidenceRunId: raw.evidence_run_id || raw.run_id,
    runId: raw.run_id,
    jobId: raw.job_id,
  };
}

/* ── Report history ────────────────────────────────────── */
export async function fetchReportHistory(brand?: string, market?: string): Promise<ReportHistoryRun[]> {
  const params = new URLSearchParams();
  if (brand) params.set('brand', brand);
  if (market) params.set('market', market);
  params.set('limit', '50');
  const json = await fetchJson(`/api/evidence/reports/history?${params.toString()}`);
  if (Array.isArray(json)) return json;
  if (json && typeof json === 'object' && Array.isArray(json.runs)) return json.runs;
  if (json && typeof json === 'object' && Array.isArray(json.history)) return json.history;
  return [];
}

export async function fetchReportByRunId(runId: string): Promise<ReportBundle> {
  const json = await fetchJson(`/api/evidence/reports/${encodeURIComponent(runId)}`);
  return normaliseReport(json);
}

/* ── Delete run ────────────────────────────────────────── */
export async function deleteRun(runId: string): Promise<void> {
  await fetchJson(`/api/evidence/reports/${encodeURIComponent(runId)}`, { method: 'DELETE' });
}

/* ── Brand config CRUD ─────────────────────────────────── */
export async function fetchBrandConfigs(): Promise<BrandConfig[]> {
  const json = await fetchJson('/api/evidence/brands');
  if (Array.isArray(json)) return json;
  if (json && typeof json === 'object' && Array.isArray(json.configs)) return json.configs;
  if (json && typeof json === 'object' && Array.isArray(json.brands)) return json.brands;
  return [];
}

export async function saveBrandConfig(config: Partial<BrandConfig> & { brand: string; market: string }): Promise<BrandConfig> {
  return fetchJson('/api/evidence/brands', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(config),
  });
}

export async function deleteBrandConfig(brand: string, market: string): Promise<void> {
  await fetchJson(`/api/evidence/brands/${encodeURIComponent(brand)}/${encodeURIComponent(market)}`, { method: 'DELETE' });
}

/* ── Portfolio ─────────────────────────────────────────── */
export async function fetchPortfolioTemplate(brand?: string, market?: string, domain?: string): Promise<Record<string, unknown>> {
  const params = new URLSearchParams();
  if (brand) params.set('brand', brand);
  if (market) params.set('market', market);
  if (domain) params.set('domain', domain);
  return fetchJson(`/api/evidence/portfolios/template?${params.toString()}`);
}

export async function uploadPortfolio(portfolio: Record<string, unknown>, brand?: string, market?: string, domain?: string): Promise<Record<string, unknown>> {
  const params = new URLSearchParams();
  if (brand) params.set('brand', brand);
  if (market) params.set('market', market);
  if (domain) params.set('domain', domain);
  return fetchJson(`/api/evidence/portfolios/upload?${params.toString()}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(portfolio),
  });
}

export async function validatePortfolio(portfolio: Record<string, unknown>): Promise<PortfolioValidationResult> {
  return fetchJson('/api/evidence/portfolios/validate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(portfolio),
  });
}
