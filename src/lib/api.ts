/**
 * API layer for AI Brand Visibility frontend.
 * All fetch calls go through the Express proxy in server.js.
 */
import { normaliseReport } from './normaliseReport';
import type { ReportBundle } from '../types/report';

// -- Types --

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

export interface RefreshEvidencePayload {
  brand: string;
  market: string;
  domain: string;
  runMode: string;
  queryPortfolioMode: string;
  queryPortfolioId?: string;
  sourceRunId?: string;
  sitemapUrl?: string;
  seedTopics?: string;
  topicCount: number;
  queriesPerTopic: number;
  language: string;
  portfolioGoal: string;
  queryLimit: number;
  maxOwnedPagesPerQuery: number;
  maxExternalCitationsPerQuery: number;
  maxOwnedInventoryUrls: number;
  maxExternalUrls: number;
  enableSerpapi: boolean;
  enableOwnedCrawl: boolean;
  enableExternalCrawl: boolean;
  triggerAuditor: boolean;
  ownedDomains?: string;
  brandTerms?: string;
  customPortfolio?: Record<string, unknown>;
}

export interface RefreshResult {
  targetRunId?: string;
  evidenceRunId?: string;
  runId?: string;
  jobId?: string;
  [key: string]: unknown;
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
  [key: string]: unknown;
}

export interface BrandConfigSaveRequest {
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
  status?: string;
  errors?: string[];
  validation?: {
    valid?: boolean;
    errors?: string[];
    warnings?: string[];
    stats?: { query_count?: number; topic_count?: number };
  };
  [key: string]: unknown;
}

// -- Helpers --

async function jsonFetch<T = unknown>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: { Accept: 'application/json', ...(init?.headers ?? {}) },
  });
  const text = await response.text();
  let body: unknown;
  try {
    body = JSON.parse(text);
  } catch {
    body = text;
  }
  if (!response.ok) {
    const msg =
      body && typeof body === 'object' && 'error' in (body as Record<string, unknown>)
        ? String((body as Record<string, unknown>).error)
        : `${response.status} ${response.statusText}`;
    throw new Error(msg);
  }
  return body as T;
}

function qs(params: Record<string, string | undefined>): string {
  const entries = Object.entries(params).filter(
    (pair): pair is [string, string] => pair[1] != null && pair[1] !== '',
  );
  return entries.length ? `?${new URLSearchParams(entries).toString()}` : '';
}

// -- Report fetching --

export async function fetchLatestReport(brand: string, market: string): Promise<ReportBundle> {
  const raw = await jsonFetch<Record<string, unknown>>(
    `/api/bodhi/latest${qs({ brand, market })}`,
  );
  return normaliseReport(raw);
}

export async function fetchReportByRunId(runId: string): Promise<ReportBundle> {
  const raw = await jsonFetch<Record<string, unknown>>(
    `/api/evidence/reports/${encodeURIComponent(runId)}`,
  );
  return normaliseReport(raw);
}

export async function fetchReportHistory(
  brand: string,
  market: string,
  limit = 30,
): Promise<ReportHistoryRun[]> {
  const data = await jsonFetch<unknown>(
    `/api/evidence/reports/history${qs({ brand, market, limit: String(limit) })}`,
  );
  return Array.isArray(data) ? data : [];
}

// Aliases used by RunHistory component
export { fetchReportHistory as fetchRunHistory };
export { fetchReportByRunId as fetchRunReport };

// -- Refresh status --

export async function fetchRefreshStatus(
  brand: string,
  market: string,
  runId?: string,
): Promise<RunStatusSummary> {
  const params: Record<string, string | undefined> = { brand, market };
  if (runId) params.runId = runId;
  const raw = await jsonFetch<Record<string, unknown>>(
    `/api/evidence/status${qs(params)}`,
  );

  const stage = String(raw.stage || raw.current_stage || raw.status || '');
  const terminalStages = new Set([
    'completed', 'success', 'successful', 'succeeded',
    'report_bundle_ready', 'failed', 'error', 'cancelled', 'canceled',
  ]);
  const activeStages = !terminalStages.has(stage.toLowerCase()) && stage !== '';

  return {
    active: activeStages || Boolean(raw.active),
    stage,
    status: String(raw.status || ''),
    runId: String(raw.run_id || raw.runId || ''),
    targetRunId: String(raw.target_run_id || raw.targetRunId || ''),
    jobId: String(raw.job_id || raw.jobId || ''),
    latestSuccessfulRunId: String(raw.latest_successful_run_id || raw.latestSuccessfulRunId || ''),
    raw,
  };
}

// -- Refresh evidence --

export async function refreshEvidence(payload: RefreshEvidencePayload): Promise<RefreshResult> {
  return jsonFetch<RefreshResult>('/api/evidence/refresh', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}

// -- Brand config CRUD --

export async function fetchBrandConfigs(): Promise<BrandConfig[]> {
  const data = await jsonFetch<unknown>('/api/evidence/brands');
  return Array.isArray(data) ? data : [];
}

export async function fetchBrandConfig(brand: string, market: string): Promise<BrandConfig | null> {
  try {
    return await jsonFetch<BrandConfig>(
      `/api/evidence/brands/${encodeURIComponent(brand)}/${encodeURIComponent(market)}`,
    );
  } catch {
    return null;
  }
}

export async function saveBrandConfig(config: BrandConfigSaveRequest): Promise<BrandConfig> {
  return jsonFetch<BrandConfig>('/api/evidence/brands', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(config),
  });
}

export async function deleteBrandConfig(brand: string, market: string): Promise<void> {
  await jsonFetch(
    `/api/evidence/brands/${encodeURIComponent(brand)}/${encodeURIComponent(market)}`,
    { method: 'DELETE' },
  );
}

// -- Portfolio upload / validate / template --

export async function uploadPortfolio(
  portfolio: Record<string, unknown>,
  brand?: string,
  market?: string,
  domain?: string,
): Promise<Record<string, unknown>> {
  return jsonFetch<Record<string, unknown>>(
    `/api/evidence/portfolios/upload${qs({ brand, market, domain })}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(portfolio),
    },
  );
}

export async function validatePortfolio(
  portfolio: Record<string, unknown>,
): Promise<PortfolioValidationResult> {
  return jsonFetch<PortfolioValidationResult>('/api/evidence/portfolios/validate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(portfolio),
  });
}

export async function fetchPortfolioTemplate(
  brand?: string,
  market?: string,
  domain?: string,
): Promise<Record<string, unknown>> {
  return jsonFetch<Record<string, unknown>>(
    `/api/evidence/portfolios/template${qs({ brand, market, domain })}`,
  );
}
