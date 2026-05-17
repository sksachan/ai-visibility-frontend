import { useEffect, useState } from 'react';
import { PlayCircle, RefreshCcw } from 'lucide-react';
import { fetchRefreshStatus, refreshEvidence, type RunStatusSummary } from '../lib/api';
import { Card, SectionTitle } from './ui';

function statusText(status: RunStatusSummary | null) {
  if (!status) return 'Status not checked yet.';
  if (status.active) {
    const id = status.runId || status.jobId || 'refresh run';
    return `Refresh in progress: ${id}${status.status ? ` (${status.status})` : ''}. The dashboard will continue showing the last successful report until this completes.`;
  }
  if (status.latestSuccessfulRunId) return `Latest successful evidence/report run: ${status.latestSuccessfulRunId}.`;
  return 'No active refresh run detected.';
}

export function RefreshPanel({ brand, market }: { brand: string; market: string }) {
  const [domain, setDomain] = useState('https://www.nissan.co.jp');
  const [queryLimit, setQueryLimit] = useState(50);
  const [runMode, setRunMode] = useState('reuse_existing_evidence');
  const [queryPortfolioMode, setQueryPortfolioMode] = useState('reuse');
  const [queryPortfolioId, setQueryPortfolioId] = useState('');
  const [sitemapUrl, setSitemapUrl] = useState('https://www.nissan.co.jp/sitemap.xml');
  const [maxOwnedPagesPerQuery, setMaxOwnedPagesPerQuery] = useState(3);
  const [maxExternalCitationsPerQuery, setMaxExternalCitationsPerQuery] = useState(3);
  const [enableSerpapi, setEnableSerpapi] = useState(false);
  const [enableOwnedCrawl, setEnableOwnedCrawl] = useState(true);
  const [enableExternalCrawl, setEnableExternalCrawl] = useState(false);
  const [refreshResult, setRefreshResult] = useState<string | null>(null);
  const [status, setStatus] = useState<RunStatusSummary | null>(null);
  const [error, setError] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isChecking, setIsChecking] = useState(false);

  async function checkStatus() {
    setIsChecking(true);
    setError('');
    try {
      setStatus(await fetchRefreshStatus(brand, market));
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsChecking(false);
    }
  }

  useEffect(() => {
    const initial = window.setTimeout(() => void checkStatus(), 0);
    const timer = window.setInterval(() => void checkStatus(), 30000);
    return () => {
      window.clearTimeout(initial);
      window.clearInterval(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [brand, market]);

  async function onSubmit() {
    setIsSubmitting(true);
    setError('');
    setRefreshResult(null);
    try {
      const result = await refreshEvidence({
        brand,
        market,
        domain,
        runMode,
        queryPortfolioMode,
        queryPortfolioId: queryPortfolioId.trim() || undefined,
        sitemapUrl: sitemapUrl.trim() || undefined,
        queryLimit,
        maxOwnedPagesPerQuery,
        maxExternalCitationsPerQuery,
        enableSerpapi,
        enableOwnedCrawl,
        enableExternalCrawl
      });
      const id = result.evidenceRunId || result.runId || result.jobId || 'new refresh run';
      setRefreshResult(`Refresh evidence started: ${id}. Load latest will continue returning the last successful report until the new run completes and is promoted.`);
      await checkStatus();
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
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <p>{statusText(status)}</p>
            <button onClick={() => void checkStatus()} disabled={isChecking} className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 disabled:opacity-60">
              <RefreshCcw size={16} /> {isChecking ? 'Checking...' : 'Check status'}
            </button>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <label className="text-sm font-medium text-slate-700">Domain
            <input className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2" value={domain} onChange={(e) => setDomain(e.target.value)} />
          </label>
          <label className="text-sm font-medium text-slate-700">Run mode
            <select className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2" value={runMode} onChange={(e) => setRunMode(e.target.value)}>
              <option value="reuse_existing_evidence">Reuse existing evidence</option>
              <option value="fresh_mapping">Refresh mapping only</option>
              <option value="refresh_owned_pages">Refresh mapped owned URLs</option>
              <option value="refresh_external_pages">Refresh existing external top-3 pages</option>
              <option value="fresh_ai_citations">Fresh AI citations / SerpAPI</option>
              <option value="full_refresh">Full refresh</option>
            </select>
          </label>
          <label className="text-sm font-medium text-slate-700">Query portfolio mode
            <select className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2" value={queryPortfolioMode} onChange={(e) => setQueryPortfolioMode(e.target.value)}>
              <option value="reuse">Reuse latest portfolio</option>
              <option value="manual">Manual portfolio from evidence layer</option>
              <option value="synthetic">Synthetic DeepResearch portfolio</option>
            </select>
          </label>
          <label className="text-sm font-medium text-slate-700">Portfolio ID optional
            <input className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2" value={queryPortfolioId} onChange={(e) => setQueryPortfolioId(e.target.value)} placeholder="portfolio_id from Railway evidence layer" />
          </label>
          <label className="text-sm font-medium text-slate-700">Sitemap URL
            <input className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2" value={sitemapUrl} onChange={(e) => setSitemapUrl(e.target.value)} />
          </label>
          <label className="text-sm font-medium text-slate-700">Query limit
            <select className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2" value={queryLimit} onChange={(e) => setQueryLimit(Number(e.target.value))}>
              <option value={5}>5 queries smoke test</option>
              <option value={25}>25 queries</option>
              <option value={50}>50 queries</option>
              <option value={100}>100 queries</option>
            </select>
          </label>
          <label className="text-sm font-medium text-slate-700">Owned URLs per query
            <select className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2" value={maxOwnedPagesPerQuery} onChange={(e) => setMaxOwnedPagesPerQuery(Number(e.target.value))}>
              <option value={1}>1</option>
              <option value={3}>3</option>
              <option value={5}>5</option>
            </select>
          </label>
          <label className="text-sm font-medium text-slate-700">External citations per query
            <select className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2" value={maxExternalCitationsPerQuery} onChange={(e) => setMaxExternalCitationsPerQuery(Number(e.target.value))}>
              <option value={1}>1</option>
              <option value={3}>3</option>
              <option value={5}>5</option>
            </select>
          </label>
          <div className="rounded-xl border border-slate-200 bg-white p-3 text-sm text-slate-700">
            <p className="mb-2 font-semibold">Evidence operations</p>
            <label className="flex items-center gap-2"><input type="checkbox" checked={enableOwnedCrawl} onChange={(e) => setEnableOwnedCrawl(e.target.checked)} /> Refresh mapped owned URLs</label>
            <label className="mt-2 flex items-center gap-2"><input type="checkbox" checked={enableExternalCrawl} onChange={(e) => setEnableExternalCrawl(e.target.checked)} /> Refresh existing external top-3 pages</label>
            <label className="mt-2 flex items-center gap-2"><input type="checkbox" checked={enableSerpapi} onChange={(e) => setEnableSerpapi(e.target.checked)} /> Enable SerpAPI / fresh AI citations</label>
          </div>
          <div className="flex items-end md:col-span-3">
            <button onClick={onSubmit} disabled={isSubmitting} className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60 md:w-auto">
              <PlayCircle size={18} /> {isSubmitting ? 'Starting refresh...' : 'Start Refresh Evidence'}
            </button>
          </div>
        </div>

        {refreshResult && <p className="mt-4 rounded-xl bg-emerald-50 p-3 text-sm font-medium text-emerald-800">{refreshResult}</p>}
        {error && <p className="mt-4 rounded-xl bg-red-50 p-3 text-sm font-medium text-red-800">{error}</p>}
      </Card>

      <Card>
        <SectionTitle eyebrow="Report selection rule" title="Load latest remains last-successful only" />
        <p className="text-sm leading-6 text-slate-700">
          During a refresh, the dashboard deliberately does not switch to an in-progress or failed run. Use <span className="font-semibold">Load latest</span> after the refresh completes; it will return the newest successful report bundle only.
        </p>
      </Card>
    </div>
  );
}
