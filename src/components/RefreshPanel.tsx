import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { CheckCircle2, CircleDashed, Download, PlayCircle, RefreshCcw, Save, Trash2, Upload, XCircle } from 'lucide-react';
import { fetchRefreshStatus, refreshEvidence, fetchBrandConfigs, saveBrandConfig, deleteBrandConfig, fetchPortfolioTemplate, uploadPortfolio, validatePortfolio, type RunStatusSummary, type BrandConfig, type PortfolioValidationResult } from '../lib/api';
import { Card, SectionTitle } from './ui';

const failedStages = new Set(['failed', 'error', 'cancelled', 'canceled']);
const terminalStages = new Set(['completed', 'success', 'successful', 'succeeded', 'report_bundle_ready']);

const phaseOrder = ['accepted', 'portfolio', 'portfolio_ready', 'sitemap', 'mapping', 'ai_citations', 'crawls', 'auditor', 'report_ready'] as const;
type Phase = typeof phaseOrder[number];

const phaseLabels: Record<Phase, string> = {
  accepted: 'Accepted',
  portfolio: 'Portfolio',
  portfolio_ready: 'Portfolio ready',
  sitemap: 'Sitemap',
  mapping: 'Mapping',
  ai_citations: 'AI citations',
  crawls: 'Crawls',
  auditor: 'Auditor',
  report_ready: 'Report ready'
};

const stageLabels: Record<string, string> = {
  accepted: 'Refresh accepted',
  portfolio_generation_queued: 'Synthetic portfolio queued',
  portfolio_generation_running: 'Generating synthetic query portfolio',
  portfolio_ui_hitl_waiting: 'Waiting for portfolio UI-node submission',
  portfolio_ui_hitl_submitted: 'Submitted portfolio UI-node form',
  portfolio_generation_completed: 'Synthetic query portfolio generated',
  sitemap_inventory_running: 'Loading sitemap inventory',
  sitemap_inventory_completed: 'Sitemap inventory loaded',
  owned_url_mapping_running: 'Mapping queries to owned URLs',
  owned_url_mapping_completed: 'Query-to-owned URL mapping completed',
  serpapi_collection_running: 'Collecting fresh AI citations',
  serpapi_collection_completed: 'AI citation collection completed',
  crawl_refresh_running: 'Refreshing crawl evidence',
  owned_crawl_running: 'Crawling owned inventory URLs',
  owned_crawl_completed: 'Owned URL crawl completed',
  external_crawl_running: 'Crawling top external citation URLs',
  external_crawl_completed: 'External citation crawl completed',
  evidence_ready: 'Evidence bundle ready',
  auditor_queued: 'Bodhi auditor queued',
  auditor_ui_hitl_waiting: 'Waiting for auditor UI-node submission',
  auditor_ui_hitl_submitted: 'Submitted auditor UI-node form',
  auditor_running: 'Bodhi auditor running',
  auditor_completed: 'Bodhi auditor completed',
  report_bundle_ready: 'Report bundle ready',
  failed: 'Refresh failed'
};

function normaliseStage(value?: string) {
  return String(value || '').trim().toLowerCase();
}

function niceStage(value?: string) {
  const key = normaliseStage(value);
  if (!key) return 'Status not checked yet';
  return stageLabels[key] || key.replaceAll('_', ' ');
}

function phaseForStage(stage?: string): Phase | null {
  const s = normaliseStage(stage);
  if (!s) return null;
  if (s === 'accepted') return 'accepted';
  if (s.startsWith('portfolio_ui_') || s === 'portfolio_generation_queued' || s === 'portfolio_generation_running') return 'portfolio';
  if (s === 'portfolio_generation_completed') return 'portfolio_ready';
  if (s.startsWith('sitemap_')) return 'sitemap';
  if (s.startsWith('owned_url_mapping_')) return 'mapping';
  if (s.startsWith('serpapi_') || s.includes('ai_citation')) return 'ai_citations';
  if (s.includes('crawl')) return 'crawls';
  if (s === 'evidence_ready') return 'auditor';
  if (s.startsWith('auditor_')) return 'auditor';
  if (s === 'report_bundle_ready') return 'report_ready';
  if (terminalStages.has(s)) return 'report_ready';
  return null;
}

function runIdFrom(status: RunStatusSummary | null, fallback = '') {
  return status?.runId || status?.targetRunId || status?.jobId || fallback;
}

function statusText(status: RunStatusSummary | null, trackedRunId: string) {
  const id = runIdFrom(status, trackedRunId);
  if (!status && trackedRunId) return `Tracking refresh run: ${trackedRunId}. Status not checked yet.`;
  if (!status) return 'Status not checked yet.';
  if (status.active) {
    return `${niceStage(status.stage || status.status)}${id ? `: ${id}` : ''}. The dashboard will continue showing the last successful report until this completes.`;
  }
  if (id && (status.stage || status.status)) {
    return `${niceStage(status.stage || status.status)}${id ? `: ${id}` : ''}.`;
  }
  if (status.latestSuccessfulRunId) return `Latest successful evidence/report run: ${status.latestSuccessfulRunId}.`;
  return 'No active refresh run detected.';
}

function StagePill({ label, state }: { label: string; state: 'pending' | 'active' | 'done' | 'failed' }) {
  const classes = {
    pending: 'border-slate-200 bg-white text-slate-500',
    active: 'border-blue-300 bg-blue-100 text-blue-900 shadow-sm ring-2 ring-blue-100',
    done: 'border-emerald-200 bg-emerald-50 text-emerald-800',
    failed: 'border-red-200 bg-red-50 text-red-800'
  }[state];
  const Icon = state === 'done' ? CheckCircle2 : state === 'failed' ? XCircle : CircleDashed;
  return <span className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-semibold ${classes}`}><Icon size={13} />{label}</span>;
}

function valueFromRaw(raw: unknown, keys: string[]): string {
  if (!raw || typeof raw !== 'object') return '';
  const obj = raw as Record<string, unknown>;
  for (const key of keys) {
    const value = obj[key];
    if (typeof value === 'string' && value.trim()) return value.trim();
    if (typeof value === 'number') return String(value);
  }
  return '';
}

export function RefreshPanel({ brand: defaultBrand, market: defaultMarket }: { brand: string; market: string }) {
  const [brand, setBrand] = useState(defaultBrand || '');
  const [market, setMarket] = useState(defaultMarket || '');
  const [domain, setDomain] = useState('');
  const [ownedDomains, setOwnedDomains] = useState('');
  const [brandTerms, setBrandTerms] = useState('');
  const [queryLimit, setQueryLimit] = useState(5);
  const [runMode, setRunMode] = useState('fresh_mapping');
  const [queryPortfolioMode, setQueryPortfolioMode] = useState('synthetic');
  const [queryPortfolioId, setQueryPortfolioId] = useState('');
  const [sourceRunId, setSourceRunId] = useState('');
  const [seedTopics, setSeedTopics] = useState('');
  const [topicCount, setTopicCount] = useState(8);
  const [queriesPerTopic, setQueriesPerTopic] = useState(6);
  const [language, setLanguage] = useState('English');
  const [portfolioGoal, setPortfolioGoal] = useState('AI answer visibility audit query portfolio.');
  const [sitemapUrl, setSitemapUrl] = useState('');
  const [maxOwnedPagesPerQuery, setMaxOwnedPagesPerQuery] = useState(3);
  const [maxExternalCitationsPerQuery, setMaxExternalCitationsPerQuery] = useState(3);
  const [maxOwnedInventoryUrls, setMaxOwnedInventoryUrls] = useState(60);
  const [maxExternalUrls, setMaxExternalUrls] = useState(150);
  const [enableSerpapi, setEnableSerpapi] = useState(false);
  const [enableOwnedCrawl, setEnableOwnedCrawl] = useState(false);
  const [enableExternalCrawl, setEnableExternalCrawl] = useState(false);
  const [triggerAuditor, setTriggerAuditor] = useState(true);
  const [trackedRunId, setTrackedRunId] = useState('');
  const [refreshResult, setRefreshResult] = useState<string | null>(null);
  const [status, setStatus] = useState<RunStatusSummary | null>(null);
  const [error, setError] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isChecking, setIsChecking] = useState(false);

  // Brand config state
  const [brandConfigs, setBrandConfigs] = useState<BrandConfig[]>([]);
  const [selectedBrandKey, setSelectedBrandKey] = useState('');
  const [brandConfigsLoading, setBrandConfigsLoading] = useState(false);

  // Portfolio upload state
  const [portfolioJson, setPortfolioJson] = useState('');
  const [portfolioValidation, setPortfolioValidation] = useState<PortfolioValidationResult | null>(null);
  const [portfolioUploading, setPortfolioUploading] = useState(false);
  const portfolioFileRef = useRef<HTMLInputElement>(null);

  // Load brand configs on mount
  const loadBrandConfigs = useCallback(async () => {
    setBrandConfigsLoading(true);
    try {
      const configs = await fetchBrandConfigs();
      setBrandConfigs(configs);
    } catch {
      // Brand configs are optional; don't block the UI
    } finally {
      setBrandConfigsLoading(false);
    }
  }, []);

  useEffect(() => { void loadBrandConfigs(); }, [loadBrandConfigs]);

  const [savingConfig, setSavingConfig] = useState(false);
  const [deletingConfig, setDeletingConfig] = useState(false);
  const [configNotice, setConfigNotice] = useState<{ tone: 'success' | 'error'; message: string } | null>(null);

  // Auto-populate from selected brand config
  function applyBrandConfig(key: string) {
    setSelectedBrandKey(key);
    if (!key) return;
    const config = brandConfigs.find(c => `${c.brand}__${c.market}` === key);
    if (!config) return;
    setBrand(config.brand);
    setMarket(config.market);
    setDomain(config.domain || '');
    setOwnedDomains(config.owned_domains?.join(', ') || '');
    setBrandTerms(config.brand_terms?.join(', ') || '');
    setLanguage(config.language || 'English');
    setSitemapUrl(config.default_sitemap_url || '');
    setSeedTopics(config.default_seed_topics || '');
    setTopicCount(config.default_topic_count || 8);
    setQueriesPerTopic(config.default_queries_per_topic || 6);
    setQueryLimit(config.default_query_limit || 50);
    setPortfolioGoal(config.default_portfolio_goal || 'AI answer visibility audit query portfolio.');
  }

  // Save current form values as a brand config
  async function onSaveBrandConfig() {
    if (!brand.trim() || !market.trim()) {
      setConfigNotice({ tone: 'error', message: 'Brand and Market are required to save a configuration.' });
      return;
    }
    setSavingConfig(true);
    setConfigNotice(null);
    try {
      await saveBrandConfig({
        brand: brand.trim(),
        market: market.trim(),
        domain: domain.trim() || undefined,
        owned_domains: ownedDomains.trim() ? ownedDomains.split(',').map(s => s.trim()).filter(Boolean) : [],
        brand_terms: brandTerms.trim() ? brandTerms.split(',').map(s => s.trim()).filter(Boolean) : [],
        language,
        default_sitemap_url: sitemapUrl.trim() || undefined,
        default_seed_topics: seedTopics.trim() || undefined,
        default_topic_count: topicCount,
        default_queries_per_topic: queriesPerTopic,
        default_query_limit: queryLimit,
        default_portfolio_goal: portfolioGoal.trim() || undefined,
      });
      setConfigNotice({ tone: 'success', message: `Brand config saved for ${brand} / ${market}.` });
      setSelectedBrandKey(`${brand}__${market}`);
      await loadBrandConfigs();
    } catch (err) {
      setConfigNotice({ tone: 'error', message: err instanceof Error ? err.message : 'Failed to save brand config.' });
    } finally {
      setSavingConfig(false);
    }
  }

  // Delete selected brand config
  async function onDeleteBrandConfig() {
    if (!selectedBrandKey) return;
    const config = brandConfigs.find(c => `${c.brand}__${c.market}` === selectedBrandKey);
    if (!config) return;
    if (!window.confirm(`Delete saved configuration for ${config.brand} / ${config.market}?`)) return;
    setDeletingConfig(true);
    setConfigNotice(null);
    try {
      await deleteBrandConfig(config.brand, config.market);
      setConfigNotice({ tone: 'success', message: `Brand config deleted for ${config.brand} / ${config.market}.` });
      setSelectedBrandKey('');
      await loadBrandConfigs();
    } catch (err) {
      setConfigNotice({ tone: 'error', message: err instanceof Error ? err.message : 'Failed to delete brand config.' });
    } finally {
      setDeletingConfig(false);
    }
  }

  // Portfolio file upload handler
  async function onPortfolioFileUpload(file: File | undefined) {
    if (!file) return;
    try {
      const text = await file.text();
      setPortfolioJson(text);
      // Auto-validate
      const parsed = JSON.parse(text);
      const result = await validatePortfolio(parsed);
      setPortfolioValidation(result);
    } catch (err) {
      setPortfolioValidation({ status: 'error', errors: [err instanceof Error ? err.message : 'Invalid JSON file'] });
    } finally {
      if (portfolioFileRef.current) portfolioFileRef.current.value = '';
    }
  }

  // Validate pasted JSON
  async function onValidatePortfolio() {
    if (!portfolioJson.trim()) return;
    try {
      const parsed = JSON.parse(portfolioJson);
      const result = await validatePortfolio(parsed);
      setPortfolioValidation(result);
    } catch (err) {
      setPortfolioValidation({ status: 'error', errors: [err instanceof Error ? err.message : 'Invalid JSON'] });
    }
  }

  // Download template
  async function onDownloadTemplate() {
    try {
      const template = await fetchPortfolioTemplate(brand, market, domain);
      const blob = new Blob([JSON.stringify(template, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `portfolio_template_${brand || 'brand'}_${market || 'market'}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to download template');
    }
  }

  const currentStage = normaliseStage(status?.stage || status?.status);
  const currentPhase = phaseForStage(currentStage);
  const stageState = useMemo(() => {
    const idx = currentPhase ? phaseOrder.indexOf(currentPhase) : -1;
    const isFailed = failedStages.has(currentStage);
    const isDone = currentStage === 'report_bundle_ready' || terminalStages.has(currentStage);
    return { idx, isFailed, isDone };
  }, [currentPhase, currentStage]);

  async function checkStatus() {
    setIsChecking(true);
    setError('');
    try {
      const next = await fetchRefreshStatus(brand, market, trackedRunId || undefined);
      const nextRunId = runIdFrom(next, trackedRunId) || valueFromRaw(next.raw, ['run_id', 'target_run_id', 'evidence_run_id']);
      if (nextRunId) setTrackedRunId(nextRunId);
      setStatus(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsChecking(false);
    }
  }

  useEffect(() => {
    const initial = window.setTimeout(() => void checkStatus(), 0);
    const timer = window.setInterval(() => void checkStatus(), 10000);
    return () => {
      window.clearTimeout(initial);
      window.clearInterval(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [brand, market, trackedRunId]);

  async function onSubmit() {
    setIsSubmitting(true);
    setError('');
    setRefreshResult(null);
    try {
      // Build custom portfolio if upload mode
      let customPortfolio: Record<string, unknown> | undefined;
      if (queryPortfolioMode === 'upload' && portfolioJson.trim()) {
        try {
          customPortfolio = JSON.parse(portfolioJson);
        } catch {
          setError('Invalid portfolio JSON. Please fix the JSON and try again.');
          setIsSubmitting(false);
          return;
        }
      }

      const result = await refreshEvidence({
        brand,
        market,
        domain,
        runMode,
        queryPortfolioMode,
        queryPortfolioId: queryPortfolioId.trim() || undefined,
        sourceRunId: sourceRunId.trim() || undefined,
        sitemapUrl: sitemapUrl.trim() || undefined,
        seedTopics: seedTopics.trim() || undefined,
        topicCount,
        queriesPerTopic,
        language,
        portfolioGoal,
        queryLimit,
        maxOwnedPagesPerQuery,
        maxExternalCitationsPerQuery,
        maxOwnedInventoryUrls,
        maxExternalUrls,
        enableSerpapi,
        enableOwnedCrawl,
        enableExternalCrawl,
        triggerAuditor,
        ownedDomains: ownedDomains.trim() || undefined,
        brandTerms: brandTerms.trim() || undefined,
        customPortfolio,
      });
      const id = result.targetRunId || result.evidenceRunId || result.runId || result.jobId || '';
      if (id) setTrackedRunId(id);
      setRefreshResult(`Refresh evidence started${id ? `: ${id}` : ''}. Load latest will continue returning the last successful report until the new run completes and is promoted.`);
      const nextStatus = await fetchRefreshStatus(brand, market, id || undefined);
      setStatus(nextStatus);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="space-y-4">
      <Card>
        <SectionTitle eyebrow="Refresh Evidence" title="Start a new evidence run without replacing the current report">
          Evidence refresh is executed by the Railway evidence service. The dashboard keeps showing the last successful report while a new refresh is running.
        </SectionTitle>

        <div className="mb-4 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="font-medium">{statusText(status, trackedRunId)}</p>
              {trackedRunId && <p className="mt-1 text-xs text-slate-500">Target run ID: <span className="font-mono">{trackedRunId}</span></p>}
              {status?.jobId && <p className="mt-1 text-xs text-slate-500">Job ID: <span className="font-mono">{status.jobId}</span></p>}
            </div>
            <button onClick={() => void checkStatus()} disabled={isChecking} className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 disabled:opacity-60">
              <RefreshCcw size={16} /> {isChecking ? 'Checking...' : 'Check status'}
            </button>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {phaseOrder.map((phase, index) => {
              const state = stageState.isFailed && currentPhase === phase ? 'failed' : stageState.isDone || (stageState.idx >= 0 && index < stageState.idx) ? 'done' : currentPhase === phase ? 'active' : 'pending';
              return <StagePill key={phase} label={phaseLabels[phase]} state={state} />;
            })}
          </div>
        </div>

        {/* Brand config selector */}
        <div className="mb-4 rounded-xl border border-blue-100 bg-blue-50 p-4">
          <label className="text-sm font-medium text-blue-900">Brand configuration
            <div className="mt-1 flex items-center gap-2">
              <select
                className="flex-1 rounded-xl border border-blue-200 bg-white px-3 py-2 text-sm"
                value={selectedBrandKey}
                onChange={(e) => applyBrandConfig(e.target.value)}
              >
                <option value="">— Select a saved brand —</option>
                {brandConfigs.map((c) => (
                  <option key={`${c.brand}__${c.market}`} value={`${c.brand}__${c.market}`}>
                    {c.brand} / {c.market}{c.domain ? ` (${c.domain})` : ''}
                  </option>
                ))}
              </select>
              <button
                onClick={() => void loadBrandConfigs()}
                disabled={brandConfigsLoading}
                className="inline-flex items-center gap-1 rounded-xl border border-blue-200 bg-white px-3 py-2 text-xs font-semibold text-blue-700"
              >
                <RefreshCcw size={14} /> {brandConfigsLoading ? '...' : 'Refresh'}
              </button>
            </div>
            <span className="mt-1 block text-xs font-normal text-blue-700">Selecting a brand auto-fills all fields below. You can still override any value before starting the refresh.</span>
          </label>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <button
              onClick={() => void onSaveBrandConfig()}
              disabled={savingConfig || !brand.trim() || !market.trim()}
              className="inline-flex items-center gap-1 rounded-xl border border-blue-300 bg-white px-3 py-2 text-xs font-semibold text-blue-800 hover:bg-blue-100 disabled:opacity-50"
            >
              <Save size={14} /> {savingConfig ? 'Saving...' : 'Save current as brand config'}
            </button>
            {selectedBrandKey && (
              <button
                onClick={() => void onDeleteBrandConfig()}
                disabled={deletingConfig}
                className="inline-flex items-center gap-1 rounded-xl border border-red-200 bg-white px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50"
              >
                <Trash2 size={14} /> {deletingConfig ? 'Deleting...' : 'Delete selected'}
              </button>
            )}
            {configNotice && (
              <span className={`text-xs font-medium ${configNotice.tone === 'success' ? 'text-emerald-700' : 'text-red-700'}`}>
                {configNotice.message}
              </span>
            )}
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <label className="text-sm font-medium text-slate-700">Brand
            <input className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2" value={brand} onChange={(e) => setBrand(e.target.value)} placeholder="e.g. Toyota, BMW, Nissan" />
          </label>
          <label className="text-sm font-medium text-slate-700">Market
            <input className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2" value={market} onChange={(e) => setMarket(e.target.value)} placeholder="e.g. Germany, Japan, USA" />
          </label>
          <label className="text-sm font-medium text-slate-700">Domain
            <input className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2" value={domain} onChange={(e) => setDomain(e.target.value)} placeholder="e.g. https://www.toyota.de" />
          </label>
          <label className="text-sm font-medium text-slate-700 md:col-span-2">Owned domains (comma-separated)
            <input className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2" value={ownedDomains} onChange={(e) => setOwnedDomains(e.target.value)} placeholder="e.g. toyota.de, www.toyota.de, press.toyota.de" />
            <span className="mt-1 block text-xs font-normal text-slate-500">Domains the brand owns. Used for owned vs external URL classification. Auto-derived from domain if left blank.</span>
          </label>
          <label className="text-sm font-medium text-slate-700">Brand terms (comma-separated)
            <input className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2" value={brandTerms} onChange={(e) => setBrandTerms(e.target.value)} placeholder="e.g. Toyota, トヨタ, Corolla, RAV4" />
            <span className="mt-1 block text-xs font-normal text-slate-500">Brand-specific terms for stop-word filtering and classifier logic.</span>
          </label>
          <label className="text-sm font-medium text-slate-700">Run mode
            <select className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2" value={runMode} onChange={(e) => setRunMode(e.target.value)}>
              <option value="fresh_mapping">Portfolio + mapping smoke test</option>
              <option value="reuse_existing_evidence">Reuse existing evidence</option>
              <option value="refresh_owned_pages">Refresh mapped owned URLs</option>
              <option value="refresh_external_pages">Refresh existing external top-3 pages</option>
              <option value="fresh_ai_citations">Fresh AI citations / SerpAPI</option>
              <option value="full_refresh">Full refresh</option>
            </select>
          </label>
          <label className="text-sm font-medium text-slate-700">Query portfolio mode
            <select className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2" value={queryPortfolioMode} onChange={(e) => setQueryPortfolioMode(e.target.value)}>
              <option value="synthetic">Synthetic via Bodhi DeepResearch workflow</option>
              <option value="upload">Upload custom portfolio</option>
              <option value="manual">Manual / stored portfolio ID</option>
              <option value="reuse">Reuse existing portfolio</option>
            </select>
          </label>
          <label className="text-sm font-medium text-slate-700">Existing portfolio ID
            <input className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2" value={queryPortfolioId} onChange={(e) => setQueryPortfolioId(e.target.value)} placeholder="Optional; identifies the query portfolio only" />
          </label>

          {/* Portfolio upload UI — shown when mode is 'upload' */}
          {queryPortfolioMode === 'upload' && (
            <div className="md:col-span-3 rounded-xl border border-amber-200 bg-amber-50 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-amber-900">Custom query portfolio</p>
                <button onClick={() => void onDownloadTemplate()} className="inline-flex items-center gap-1 rounded-lg border border-amber-300 bg-white px-3 py-1.5 text-xs font-semibold text-amber-800 hover:bg-amber-100">
                  <Download size={14} /> Download template
                </button>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => portfolioFileRef.current?.click()} className="inline-flex items-center gap-1 rounded-lg border border-amber-300 bg-white px-3 py-2 text-sm font-semibold text-amber-800 hover:bg-amber-100">
                  <Upload size={14} /> Upload JSON file
                </button>
                <input ref={portfolioFileRef} className="hidden" type="file" accept="application/json,.json" onChange={(e) => void onPortfolioFileUpload(e.target.files?.[0])} />
                <span className="text-xs text-amber-700">or paste JSON below</span>
              </div>
              <textarea
                className="min-h-32 w-full rounded-xl border border-amber-200 bg-white px-3 py-2 font-mono text-xs"
                value={portfolioJson}
                onChange={(e) => { setPortfolioJson(e.target.value); setPortfolioValidation(null); }}
                placeholder='{\n  "topics": [{"topic": "Electric vehicles"}],\n  "queries": [{"query_id": "q001", "query": "best electric SUV 2025", "topic": "Electric vehicles", "query_type": "non_branded", "journey_stage": "consideration"}]\n}'
              />
              <div className="flex items-center gap-2">
                <button onClick={() => void onValidatePortfolio()} disabled={!portfolioJson.trim()} className="rounded-lg bg-amber-700 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50">
                  Validate portfolio
                </button>
                {portfolioValidation && (
                  <span className={`text-xs font-medium ${portfolioValidation.status === 'validation_failed' || portfolioValidation.status === 'error' ? 'text-red-700' : 'text-emerald-700'}`}>
                    {portfolioValidation.status === 'error' ? `Error: ${(portfolioValidation.errors || [])[0] || 'Unknown'}` : portfolioValidation.validation?.valid ? `\u2713 Valid — ${portfolioValidation.validation.stats?.query_count || 0} queries, ${portfolioValidation.validation.stats?.topic_count || 0} topics` : `\u2717 ${(portfolioValidation.errors || portfolioValidation.validation?.errors || []).slice(0, 3).join('; ')}`}
                  </span>
                )}
              </div>
              {portfolioValidation?.validation?.warnings && portfolioValidation.validation.warnings.length > 0 && (
                <div className="rounded-lg border border-amber-200 bg-amber-100 px-3 py-2 text-xs text-amber-800">
                  <p className="font-semibold">Warnings:</p>
                  <ul className="mt-1 list-disc pl-4">{portfolioValidation.validation.warnings.map((w, i) => <li key={i}>{w}</li>)}</ul>
                </div>
              )}
            </div>
          )}

          <label className="text-sm font-medium text-slate-700 md:col-span-2">Reuse citation evidence run ID
            <input className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2" value={sourceRunId} onChange={(e) => setSourceRunId(e.target.value)} placeholder="Optional; e.g. evidence_nissan_japan_1779101052_5d1acd" />
            <span className="mt-1 block text-xs font-normal text-slate-500">Use this when SerpAPI is off but you want to reuse AI citation rows from an earlier evidence run.</span>
          </label>
          <label className="text-sm font-medium text-slate-700">Topic count
            <input type="number" min={1} max={20} className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2" value={topicCount} onChange={(e) => setTopicCount(Number(e.target.value))} />
          </label>
          <label className="text-sm font-medium text-slate-700">Queries per topic
            <input type="number" min={1} max={20} className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2" value={queriesPerTopic} onChange={(e) => setQueriesPerTopic(Number(e.target.value))} />
          </label>
          <label className="text-sm font-medium text-slate-700">Query limit
            <input type="number" min={1} max={100} className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2" value={queryLimit} onChange={(e) => setQueryLimit(Number(e.target.value))} />
          </label>
          <label className="text-sm font-medium text-slate-700">Mapped owned URLs per query
            <input type="number" min={1} max={10} className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2" value={maxOwnedPagesPerQuery} onChange={(e) => setMaxOwnedPagesPerQuery(Number(e.target.value))} />
            <span className="mt-1 block text-xs font-normal text-slate-500">Used only for query gap, CMS and opportunity mapping. It does not cap site-level GEO readiness scoring.</span>
          </label>
          <label className="text-sm font-medium text-slate-700">External citations per query
            <input type="number" min={1} max={10} className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2" value={maxExternalCitationsPerQuery} onChange={(e) => setMaxExternalCitationsPerQuery(Number(e.target.value))} />
          </label>
          <label className="text-sm font-medium text-slate-700">Max owned inventory URLs to GEO audit
            <input type="number" min={1} max={500} className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2" value={maxOwnedInventoryUrls} onChange={(e) => setMaxOwnedInventoryUrls(Number(e.target.value))} />
            <span className="mt-1 block text-xs font-normal text-slate-500">Site-level inventory sample from sitemap/robots. These pages are crawled and GEO scored even if not mapped to a query.</span>
          </label>
          <label className="text-sm font-medium text-slate-700">Max external URLs crawled
            <input type="number" min={1} max={500} className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2" value={maxExternalUrls} onChange={(e) => setMaxExternalUrls(Number(e.target.value))} />
            <span className="mt-1 block text-xs font-normal text-slate-500">Caps deduped external citation pages. 150 supports 50 queries × 3 citations.</span>
          </label>
          <label className="text-sm font-medium text-slate-700">Language
            <input className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2" value={language} onChange={(e) => setLanguage(e.target.value)} />
          </label>
          <label className="text-sm font-medium text-slate-700 md:col-span-2">Sitemap URL override (optional)
            <input className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2" value={sitemapUrl} onChange={(e) => setSitemapUrl(e.target.value)} placeholder="Leave blank to auto-discover via robots.txt and common sitemap paths" />
          </label>
          <label className="text-sm font-medium text-slate-700 md:col-span-3">Seed topics
            <textarea className="mt-1 min-h-20 w-full rounded-xl border border-slate-200 bg-white px-3 py-2" value={seedTopics} onChange={(e) => setSeedTopics(e.target.value)} placeholder="Optional; one topic per line or free text" />
          </label>
          <label className="text-sm font-medium text-slate-700 md:col-span-3">Portfolio goal
            <textarea className="mt-1 min-h-16 w-full rounded-xl border border-slate-200 bg-white px-3 py-2" value={portfolioGoal} onChange={(e) => setPortfolioGoal(e.target.value)} />
          </label>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-4">
          <label className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"><input type="checkbox" checked={enableSerpapi} onChange={(e) => setEnableSerpapi(e.target.checked)} /> Fresh AI citations / SerpAPI</label>
          <label className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"><input type="checkbox" checked={enableOwnedCrawl} onChange={(e) => setEnableOwnedCrawl(e.target.checked)} /> Crawl owned URLs</label>
          <label className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"><input type="checkbox" checked={enableExternalCrawl} onChange={(e) => setEnableExternalCrawl(e.target.checked)} /> Crawl external citations</label>
          <label className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"><input type="checkbox" checked={triggerAuditor} onChange={(e) => setTriggerAuditor(e.target.checked)} /> Trigger Bodhi auditor</label>
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-3">
          <button onClick={() => void onSubmit()} disabled={isSubmitting} className="inline-flex items-center gap-2 rounded-xl bg-slate-950 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">
            <PlayCircle size={16} /> {isSubmitting ? 'Starting...' : 'Start refresh'}
          </button>
          {refreshResult && <span className="text-sm font-medium text-emerald-700">{refreshResult}</span>}
          {error && <span className="text-sm font-medium text-red-700">{error}</span>}
        </div>
      </Card>
    </div>
  );
}
