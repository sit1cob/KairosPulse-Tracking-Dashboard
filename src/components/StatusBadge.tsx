type StatusBadgeProps = {
  value: string;
};

type Variant = 'default' | 'success' | 'warning' | 'danger';

const VARIANT_STYLES: Record<Variant, string> = {
  default: 'bg-slate-100 text-slate-700 ring-slate-200',
  success: 'bg-emerald-100 text-emerald-700 ring-emerald-200',
  warning: 'bg-amber-100 text-amber-700 ring-amber-200',
  danger: 'bg-rose-100 text-rose-700 ring-rose-200',
};

export default function StatusBadge({ value }: StatusBadgeProps) {
  const variant = pickVariant(value);
  const label = formatLabel(value);

  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${VARIANT_STYLES[variant]}`}>
      {label}
    </span>
  );
}

function pickVariant(value: string): Variant {
  const normalized = (value || '').toLowerCase();

  if (!normalized) {
    return 'default';
  }

  if (
    normalized.includes('pass') ||
    normalized.includes('success') ||
    normalized.includes('completed') ||
    normalized.includes('ok')
  ) {
    return 'success';
  }

  if (
    normalized.includes('in progress') ||
    normalized.includes('pending') ||
    normalized.includes('running') ||
    normalized.includes('queued') ||
    normalized.includes('started')
  ) {
    return 'warning';
  }

  if (
    normalized.includes('fail') ||
    normalized.includes('error') ||
    normalized.includes('blocked') ||
    normalized.includes('halt')
  ) {
    return 'danger';
  }

  return 'default';
}

function formatLabel(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) {
    return 'No Status';
  }

  return trimmed
    .split(/\s+/)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1).toLowerCase())
    .join(' ');
}
