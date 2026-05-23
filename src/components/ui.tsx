import { clsx } from 'clsx';
import { CheckCircle2, CircleDashed, XCircle, type LucideIcon } from 'lucide-react';
import type { ReactNode, ButtonHTMLAttributes } from 'react';

/* ── WorkspacePanel ──────────────────────────────────────────── */
export function WorkspacePanel({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <section className={clsx(
      'rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--bg-panel)] p-5 shadow-[var(--shadow-panel)]',
      className
    )}>
      {children}
    </section>
  );
}

/** Backward-compatible alias */
export const Card = WorkspacePanel;

/* ── SectionHeader ───────────────────────────────────────────── */
export function SectionHeader({ eyebrow, title, children }: { eyebrow?: string; title: string; children?: ReactNode }) {
  return (
    <div className="mb-4">
      {eyebrow && <p className="typo-meta text-[var(--text-muted)]">{eyebrow}</p>}
      <h2 className="typo-section tracking-tight text-[var(--text-primary)]">{title}</h2>
      {children && <p className="mt-1 max-w-3xl text-sm text-[var(--text-secondary)]">{children}</p>}
    </div>
  );
}

/** Backward-compatible alias */
export const SectionTitle = SectionHeader;

/* ── StatusPill ──────────────────────────────────────────────── */
const statusClasses: Record<string, string> = {
  owned_target_cited: 'status-owned-target',
  owned_ecosystem_cited: 'status-owned-eco',
  owned_domain_cited: 'status-owned-eco',
  external_led: 'status-external',
  competitor_led: 'status-competitor',
  not_observed: 'status-not-observed',
};

export function StatusPill({ status, label }: { status: string; label?: string }) {
  const cls = statusClasses[status] || 'status-not-observed';
  const text = label || status.replaceAll('_', ' ');
  return <span className={clsx('inline-flex rounded-full px-2.5 py-1 text-xs font-semibold', cls)}>{text}</span>;
}

/* ── MetricPill ──────────────────────────────────────────────── */
export function MetricPill({ label, value }: { label: string; value: string | number }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border-subtle)] bg-[var(--bg-card)] px-3 py-1 text-xs font-semibold text-[var(--text-secondary)]">
      <span className="text-[var(--text-primary)]">{value}</span> {label}
    </span>
  );
}

/* ── MetricCard ──────────────────────────────────────────────── */
export function MetricCard({ label, value, note }: { label: string; value: string | number; note?: string }) {
  return (
    <WorkspacePanel className="p-4">
      <div className="text-3xl font-semibold text-[var(--text-primary)]">{value}</div>
      <div className="mt-1 text-sm font-medium text-[var(--text-secondary)]">{label}</div>
      {note ? <div className="mt-2 text-xs leading-5 text-[var(--text-muted)]">{note}</div> : null}
    </WorkspacePanel>
  );
}

/* ── DarkButton ──────────────────────────────────────────────── */
export function DarkButton({ children, variant = 'default', className, ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'default' | 'primary' | 'ghost' }) {
  const base = 'inline-flex items-center justify-center gap-2 rounded-[var(--radius-sm)] px-3 py-2 text-sm font-semibold transition-colors disabled:opacity-50';
  const variants = {
    default: 'border border-[var(--border-subtle)] bg-[var(--bg-card)] text-[var(--text-primary)] hover:bg-[var(--bg-card-hover)] hover:border-[var(--border-strong)]',
    primary: 'bg-[var(--accent-blue)] text-white hover:brightness-110',
    ghost: 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-card)]',
  };
  return <button className={clsx(base, variants[variant], className)} {...props}>{children}</button>;
}

/* ── IconButton ───────────────────────────────────────────────── */
export function IconButton({ icon: Icon, label, ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { icon: LucideIcon; label: string }) {
  return (
    <button
      aria-label={label}
      title={label}
      className="inline-flex items-center justify-center rounded-[var(--radius-sm)] border border-[var(--border-subtle)] bg-[var(--bg-card)] p-2 text-[var(--text-secondary)] hover:bg-[var(--bg-card-hover)] hover:text-[var(--text-primary)] transition-colors disabled:opacity-50"
      {...props}
    >
      <Icon size={16} />
    </button>
  );
}

/* ── WorkflowStage ───────────────────────────────────────────── */
export function WorkflowStage({ label, state }: { label: string; state: 'pending' | 'active' | 'done' | 'failed' }) {
  const Icon = state === 'done' ? CheckCircle2 : state === 'failed' ? XCircle : CircleDashed;
  const colors = {
    pending: 'text-[var(--text-muted)] border-[var(--border-subtle)]',
    active: 'text-[var(--accent-blue)] border-[var(--accent-blue)] bg-[var(--accent-blue-soft)]',
    done: 'text-[var(--accent-success)] border-[var(--accent-success)] bg-[var(--accent-success-soft)]',
    failed: 'text-[var(--accent-danger)] border-red-500/20 bg-red-500/10',
  }[state];
  return (
    <div className={clsx('flex items-center gap-2 rounded-[var(--radius-sm)] border px-3 py-1.5 text-xs font-semibold', colors)}>
      <Icon size={14} /> {label}
    </div>
  );
}

/* ── Badge (backward-compatible) ─────────────────────────────── */
export function Badge({ children, tone = 'neutral' }: { children: ReactNode; tone?: 'neutral' | 'high' | 'medium' | 'low' }) {
  const classes = {
    neutral: 'bg-white/5 text-[var(--text-secondary)] ring-1 ring-white/10',
    high: 'bg-red-500/10 text-red-400 ring-1 ring-red-500/20',
    medium: 'bg-amber-500/10 text-amber-300 ring-1 ring-amber-500/20',
    low: 'bg-emerald-500/10 text-emerald-400 ring-1 ring-emerald-500/20',
  }[tone];
  return <span className={clsx('inline-flex rounded-full px-2.5 py-1 text-xs font-semibold', classes)}>{children}</span>;
}
