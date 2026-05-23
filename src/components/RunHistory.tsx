import { useCallback, useEffect, useState } from 'react';
import { WorkspacePanel, SectionHeader, DarkButton, StatusPill } from './ui';
import { fetchReportHistory, fetchReportByRunId, type ReportHistoryRun } from '../lib/api';
import type { ReportBundle } from '../types/report';

export function RunHistory({ brand, market, onLoad }: { brand: string; market: string; onLoad: (report: ReportBundle, row: ReportHistoryRun) => void }) {
  const [rows, setRows] = useState<ReportHistoryRun[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showAllBrands, setShowAllBrands] = useState(true);

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try { setRows(await fetchReportHistory(showAllBrands ? '' : brand, showAllBrands ? '' : market)); }
    catch (err) { setError(err instanceof Error ? err.message : String(err)); }
    finally { setLoading(false); }
  }, [brand, market, showAllBrands]);

  async function loadRun(row: ReportHistoryRun) {
    setLoading(true); setError('');
    try { onLoad(await fetchReportByRunId(row.run_id), row); }
    catch (err) { setError(err instanceof Error ? err.message : String(err)); }
    finally { setLoading(false); }
  }

  useEffect(() => { void Promise.resolve().then(load); }, [load]);

  return (
    <WorkspacePanel>
      <SectionHeader eyebrow="Previous successful runs" title="Load a prior dashboard-ready report">
        Select a previous run using lightweight analytics. Only dashboard-ready successful runs are listed.
      </SectionHeader>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <label className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
          <input type="checkbox" checked={showAllBrands} onChange={(e) => setShowAllBrands(e.target.checked)} className="accent-[var(--accent-blue)]" /> Show all brands & markets
        </label>
        <DarkButton onClick={() => void load()}>{loading ? 'Refreshing…' : 'Refresh list'}</DarkButton>
      </div>
      {error && <p className="mb-3 rounded-[var(--radius-sm)] border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-400">{error}</p>}
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="text-left">
              <th className="typo-meta px-3 py-3 text-[var(--text-muted)]">Run</th>
              <th className="typo-meta px-3 py-3 text-[var(--text-muted)]">Queries</th>
              <th className="typo-meta px-3 py-3 text-[var(--text-muted)]">Citations</th>
              <th className="typo-meta px-3 py-3 text-[var(--text-muted)]">Owned scored</th>
              <th className="typo-meta px-3 py-3 text-[var(--text-muted)]">External</th>
              <th className="typo-meta px-3 py-3 text-[var(--text-muted)]">Crawl</th>
              <th className="typo-meta px-3 py-3 text-[var(--text-muted)]">Mode</th>
              <th className="typo-meta px-3 py-3 text-[var(--text-muted)]">Action</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.run_id} className="align-top">
                <td className="px-3 py-4">
                  <p className="font-mono text-xs text-[var(--text-primary)]">{row.run_id}</p>
                  <p className="mt-1 text-xs text-[var(--text-muted)]">{formatEpoch(row.completed_at_epoch || row.created_at_epoch)}</p>
                  {showAllBrands && row.brand && <p className="mt-1 text-xs font-semibold text-[var(--accent-blue)]">{row.brand} / {row.market}</p>}
                </td>
                <td className="px-3 py-4 text-[var(--text-secondary)]">{row.query_count ?? '—'}</td>
                <td className="px-3 py-4 text-[var(--text-secondary)]">{row.citation_count ?? '—'}</td>
                <td className="px-3 py-4 text-[var(--text-secondary)]">{row.owned_pages_scoreable ?? row.owned_inventory_selected ?? '—'}</td>
                <td className="px-3 py-4 text-[var(--text-secondary)]">{row.external_pages_scoreable ?? '—'}</td>
                <td className="px-3 py-4 text-[var(--text-secondary)]">{row.crawl_success_rate != null ? `${Math.round(Number(row.crawl_success_rate) * 100)}%` : '—'}</td>
                <td className="px-3 py-4 text-xs text-[var(--text-muted)]">{row.serpapi_enabled ? 'Fresh SerpAPI' : row.source_run_id ? 'Citation reuse' : 'No AI refresh'}</td>
                <td className="px-3 py-4">
                  <DarkButton variant="primary" onClick={() => void loadRun(row)}>Load</DarkButton>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!rows.length && !loading && <p className="text-sm text-[var(--text-muted)]">No previous successful reports found.</p>}
    </WorkspacePanel>
  );
}

function formatEpoch(value?: number) {
  if (!value) return 'Date not supplied';
  return new Date(value * 1000).toLocaleString();
}
