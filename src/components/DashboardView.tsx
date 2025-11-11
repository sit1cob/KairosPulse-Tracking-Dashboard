"use client";

import { Fragment, useEffect, useMemo, useState } from 'react';
import { Search, Filter, ListFilter, ChevronRight, ChevronDown } from "lucide-react";
import type { DashboardData, SheetKey, TaskRecord } from '@/lib/loadExcel';
import StatusBadge from './StatusBadge';

type DashboardViewProps = {
  data: DashboardData;
};

type StatusCategory = 'pass' | 'attention' | 'fail' | 'other';

type AutomationFilter = 'all' | 'yes' | 'no';

type StatusFilter = 'all' | StatusCategory;

type SheetTab = {
  key: SheetKey;
  label: string;
  description: string;
};

const SHEET_TABS: SheetTab[] = [
  {
    key: 'foundational',
    label: 'Foundational Data Loading',
    description: 'Scripts that power foundational data pipelines.',
  },
  {
    key: 'koyfinScripts',
    label: 'Koyfin Automated Scripts',
    description: 'Notebook automations and scheduling performance.',
  },
];

const STATUS_FILTER_OPTIONS: { value: StatusFilter; label: string }[] = [
  { value: 'all', label: 'All statuses' },
  { value: 'pass', label: 'Passing' },
  { value: 'attention', label: 'Needs attention' },
  { value: 'fail', label: 'Failing' },
  { value: 'other', label: 'Other' },
];

const AUTOMATION_FILTER_OPTIONS: { value: AutomationFilter; label: string }[] = [
  { value: 'all', label: 'Automation: all' },
  { value: 'yes', label: 'Automation: yes' },
  { value: 'no', label: 'Automation: no' },
];

type Metrics = {
  total: number;
  automated: number;
  manual: number;
  passCount: number;
  attentionCount: number;
  failCount: number;
  passRate: number;
  issueRate: number;
};

type BucketGroup = {
  bucket: string;
  records: TaskRecord[];
  metrics: Metrics;
};

export default function DashboardView({ data }: DashboardViewProps) {
  const [activeSheet, setActiveSheet] = useState<SheetKey>('foundational');
  const [searchTerm, setSearchTerm] = useState('');
  const [automationFilter, setAutomationFilter] = useState<AutomationFilter>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [expandedBuckets, setExpandedBuckets] = useState<Record<string, boolean>>({});

  const records = data[activeSheet] ?? [];

  const metrics = useMemo(() => computeMetrics(records), [records]);

  const filteredRecords = useMemo(() => {
    return records.filter((record) => {
      if (!matchesSearch(record, searchTerm)) {
        return false;
      }

      if (!matchesAutomationFilter(record, automationFilter)) {
        return false;
      }

      if (!matchesStatusFilter(record, statusFilter)) {
        return false;
      }

      return true;
    });
  }, [records, searchTerm, automationFilter, statusFilter]);

  const activeTab = SHEET_TABS.find((tab) => tab.key === activeSheet);
  const isKoyfinView = activeSheet === 'koyfinScripts';

  const groupedBuckets = useMemo(() => {
    if (!isKoyfinView) {
      return [] as BucketGroup[];
    }

    const bucketMap = new Map<string, TaskRecord[]>();
    for (const record of filteredRecords) {
      const bucketName = record.bucket || 'Uncategorized';
      if (!bucketMap.has(bucketName)) {
        bucketMap.set(bucketName, []);
      }
      bucketMap.get(bucketName)!.push(record);
    }

    return Array.from(bucketMap.entries())
      .map(([bucket, bucketRecords]) => ({
        bucket,
        records: bucketRecords,
        metrics: computeMetrics(bucketRecords),
      }))
      .sort((a, b) => a.bucket.localeCompare(b.bucket));
  }, [filteredRecords, isKoyfinView]);

  useEffect(() => {
    if (!isKoyfinView) {
      setExpandedBuckets({});
      return;
    }

    setExpandedBuckets((prev) => {
      const next: Record<string, boolean> = {};
      for (const group of groupedBuckets) {
        if (prev[group.bucket]) {
          next[group.bucket] = true;
        }
      }
      return next;
    });
  }, [groupedBuckets, isKoyfinView]);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-gray-900">Koyfin Automation Dashboard</h1>
        <p className="mt-2 text-sm text-gray-600">
          Monitor automation coverage, recent status trends, and areas needing attention across foundational and Koyfin scripts.
        </p>
      </header>

      <section>
        <div className="flex flex-wrap gap-3">
          {SHEET_TABS.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveSheet(tab.key)}
              className={`rounded-lg border px-4 py-2 text-sm font-medium transition-colors ${
                activeSheet === tab.key
                  ? 'border-indigo-500 bg-indigo-50 text-indigo-600 shadow-sm'
                  : 'border-gray-200 bg-white text-gray-600 hover:border-indigo-200 hover:text-indigo-600'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
        {activeTab ? (
          <p className="mt-2 text-sm text-gray-500">{activeTab.description}</p>
        ) : null}
      </section>

      <section className="grid grid-cols-1 gap-4 lg:grid-cols-4">
        <StatCard
          title="Total Scripts"
          value={metrics.total.toLocaleString()}
          helper={`${metrics.automated.toLocaleString()} automated / ${metrics.manual.toLocaleString()} manual`}
        />
        <StatCard
          title="Automation Coverage"
          value={`${formatPercent(metrics.automated, metrics.total)}`}
          helper="Scripts with automation enabled"
        />
        <StatCard
          title="Passing"
          value={metrics.passCount.toLocaleString()}
          helper={`Pass rate ${metrics.passRate.toFixed(1)}%`}
        />
        <StatCard
          title="Needs Attention"
          value={(metrics.attentionCount + metrics.failCount).toLocaleString()}
          helper={`Issue rate ${metrics.issueRate.toFixed(1)}%`}
        />
      </section>

      <section className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="relative flex-1 md:max-w-md">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
            <input
              type="search"
              placeholder="Search by notebook, bucket, POC, or remarks"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              className="w-full rounded-lg border border-gray-200 bg-gray-50 py-2 pl-10 pr-4 text-sm text-gray-700 shadow-sm focus:border-indigo-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-200"
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Filter className="h-5 w-5 text-gray-400" />
            {STATUS_FILTER_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setStatusFilter(option.value)}
                className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                  statusFilter === option.value
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'bg-gray-100 text-gray-600 hover:bg-indigo-50 hover:text-indigo-600'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <ListFilter className="h-5 w-5 text-gray-400" />
            {AUTOMATION_FILTER_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setAutomationFilter(option.value)}
                className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                  automationFilter === option.value
                    ? 'bg-slate-900 text-white shadow-sm'
                    : 'bg-gray-100 text-gray-600 hover:bg-slate-200 hover:text-slate-900'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-6 overflow-hidden rounded-lg border border-gray-200">
          <div className="max-h-[520px] overflow-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <HeaderCell>Notebook</HeaderCell>
                  <HeaderCell>Bucket</HeaderCell>
                  <HeaderCell className="hidden lg:table-cell">Schedule</HeaderCell>
                  <HeaderCell className="hidden lg:table-cell">Estimated Run</HeaderCell>
                  <HeaderCell>Automation</HeaderCell>
                  <HeaderCell>Latest Status</HeaderCell>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {isKoyfinView ? (
                  groupedBuckets.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-10 text-center text-sm text-gray-500">
                        No scripts match the current filters. Try adjusting your search keywords or filters.
                      </td>
                    </tr>
                  ) : (
                    groupedBuckets.map((group) => {
                      const isExpanded = expandedBuckets[group.bucket] ?? false;
                      const toggle = () =>
                        setExpandedBuckets((prev) => ({
                          ...prev,
                          [group.bucket]: !isExpanded,
                        }));

                      const issueCount = group.metrics.attentionCount + group.metrics.failCount;

                      return (
                        <Fragment key={group.bucket}>
                          <tr className="bg-gray-50">
                            <td colSpan={6} className="px-4 py-3">
                              <button
                                type="button"
                                onClick={toggle}
                                className="flex w-full items-center justify-between text-left"
                              >
                                <div className="flex items-center gap-3">
                                  {isExpanded ? (
                                    <ChevronDown className="h-4 w-4 text-gray-500" />
                                  ) : (
                                    <ChevronRight className="h-4 w-4 text-gray-500" />
                                  )}
                                  <span className="text-sm font-semibold text-gray-900">{group.bucket}</span>
                                  <span className="text-xs font-medium text-gray-500">
                                    {group.records.length} scripts · {group.metrics.passCount} passing · {issueCount}{' '}
                                    needing attention · {group.metrics.automated} automated
                                  </span>
                                </div>
                                <span className="text-xs uppercase tracking-wide text-gray-400">
                                  {isExpanded ? 'Hide' : 'Show'} details
                                </span>
                              </button>
                            </td>
                          </tr>
                          {isExpanded
                            ? group.records.map((record: TaskRecord) => (
                                <TaskRow key={record.id} record={record} nested />
                              ))
                            : null}
                        </Fragment>
                      );
                    })
                  )
                ) : filteredRecords.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-10 text-center text-sm text-gray-500">
                      No scripts match the current filters. Try adjusting your search keywords or filters.
                    </td>
                  </tr>
                ) : (
                  filteredRecords.map((record) => <TaskRow key={record.id} record={record} />)
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </div>
  );
}

type StatCardProps = {
  title: string;
  value: string;
  helper?: string;
};

function StatCard({ title, value, helper }: StatCardProps) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">{title}</p>
      <p className="mt-2 text-2xl font-bold text-gray-900">{value}</p>
      {helper ? <p className="mt-1 text-xs text-gray-500">{helper}</p> : null}
    </div>
  );
}

type HeaderCellProps = {
  children: React.ReactNode;
  className?: string;
};

function HeaderCell({ children, className = '' }: HeaderCellProps) {
  return (
    <th scope="col" className={`px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 ${className}`}>
      {children}
    </th>
  );
}

type TaskRowProps = {
  record: TaskRecord;
  nested?: boolean;
};

function TaskRow({ record, nested = false }: TaskRowProps) {
  const statusSource = record.todayStatus;
  const latestLabel = statusSource?.label ?? 'Status for Today';
  const latestStatusValue = statusSource?.status ?? 'Pass';
  const latestRemarks = statusSource?.remarks ?? '';

  return (
    <tr className="group align-top">
      <td className={`px-4 py-4${nested ? ' pl-10' : ''}`}>
        <div className="flex flex-col">
          <span className="text-sm font-semibold text-gray-900">{record.notebook || 'Untitled notebook'}</span>
          {latestRemarks ? (
            <span className="mt-1 text-xs text-gray-500">{latestRemarks}</span>
          ) : null}
          <Timeline statuses={record.statuses.slice(-10)} />
        </div>
      </td>
      <td className="px-4 py-4 text-sm text-gray-600">{nested ? '—' : record.bucket || '—'}</td>
      <td className="hidden px-4 py-4 text-sm text-gray-600 lg:table-cell">{record.schedule || '—'}</td>
      <td className="hidden px-4 py-4 text-sm text-gray-600 lg:table-cell">{record.estimatedRunTime || '—'}</td>
      <td className="px-4 py-4 text-sm text-gray-600">{formatAutomation(record.automationStatus)}</td>
      <td className="px-4 py-4 text-sm text-gray-600">
        <div className="flex flex-col items-start gap-1">
          <span className="text-xs font-medium text-gray-500">{latestLabel}</span>
          <StatusBadge value={latestStatusValue} />
        </div>
      </td>
    </tr>
  );
}

type TimelineProps = {
  statuses: TaskRecord['statuses'];
};

function Timeline({ statuses }: TimelineProps) {
  if (!statuses || statuses.length === 0) {
    return null;
  }

  const reversed = [...statuses].reverse();

  return (
    <details className="mt-3 overflow-hidden rounded-lg border border-gray-100 bg-gray-50 text-xs text-gray-600">
      <summary className="cursor-pointer select-none bg-gray-100 px-3 py-2 font-medium text-gray-700">
        Status history ({statuses.length})
      </summary>
      <div className="max-h-60 space-y-2 overflow-auto p-3">
        {reversed.map((entry, index) => (
          <div key={`${entry.label}-${index}`} className="flex items-start justify-between gap-3">
            <div>
              <p className="font-medium text-gray-700">{entry.label}</p>
              {entry.remarks ? <p className="text-gray-500">{entry.remarks}</p> : null}
            </div>
            <StatusBadge value={entry.status} />
          </div>
        ))}
      </div>
    </details>
  );
}

function computeMetrics(records: TaskRecord[]): Metrics {
  const metrics: Metrics = {
    total: records.length,
    automated: 0,
    manual: 0,
    passCount: 0,
    attentionCount: 0,
    failCount: 0,
    passRate: 0,
    issueRate: 0,
  };

  if (records.length === 0) {
    return metrics;
  }

  for (const record of records) {
    const automation = record.automationStatus.toLowerCase();
    if (automation === 'yes') {
      metrics.automated += 1;
    } else if (automation === 'no') {
      metrics.manual += 1;
    }
 

    const statusValue = record.todayStatus?.status ?? record.latestStatus?.status ?? 'Pass';
    const category = categorizeStatus(statusValue);
    console.log(`📌 Status Category: ${category} | Status Value: ${statusValue} | Notebook: ${record.notebook}`, record);
    if (category === 'pass') {
      // Extract sheet info from record ID (format: sheetKey-rowIndex-notebook)
      const sheetKey = record.id.split('-')[0];
      const sheetName = sheetKey === 'foundational' ? 'FOUNDATIONAL DATA LOADING FOR K' : 'Koyfin Automated Scripts';
      
      console.log('📝 PASS ROW DETAILS:', {
        rowNumber: metrics.passCount + 1,
        sheetTab: sheetName,
        sheetKey: sheetKey,
        id: record.id,
        notebook: record.notebook,
        bucket: record.bucket,
        automationStatus: record.automationStatus,
        schedule: record.schedule,
        poc: record.poc,
        statusUsed: statusValue,
        todayStatus: record.todayStatus?.status || 'N/A',
        latestStatus: record.latestStatus?.status || 'N/A',
        allStatuses: record.statuses.map(s => `${s.label}: ${s.status}`).join(', ')
      });
      metrics.passCount += 1;
    } else if (category === 'attention') {
      metrics.attentionCount += 1;
    } else if (category === 'fail') {
      metrics.failCount += 1;
    }
  }

  metrics.passRate = (metrics.passCount / records.length) * 100;
  metrics.issueRate = ((metrics.attentionCount + metrics.failCount) / records.length) * 100;

  console.log('📊 PASS RATE CALCULATION:', {
    totalRecords: records.length,
    passCount: metrics.passCount,
    attentionCount: metrics.attentionCount,
    failCount: metrics.failCount,
    passRate: `${metrics.passRate.toFixed(1)}%`,
    issueRate: `${metrics.issueRate.toFixed(1)}%`
  });

  return metrics;
}

function matchesSearch(record: TaskRecord, term: string): boolean {
  if (!term.trim()) {
    return true;
  }

  const target = term.trim().toLowerCase();

  return [
    record.notebook,
    record.bucket,
    record.poc,
    record.automationStatus,
    record.todayStatus?.status,
    record.todayStatus?.remarks,
    record.latestStatus?.status,
    record.latestStatus?.remarks,
  ]
    .filter(Boolean)
    .some((value) => value!.toLowerCase().includes(target));
}

function matchesAutomationFilter(record: TaskRecord, filter: AutomationFilter): boolean {
  if (filter === 'all') {
    return true;
  }

  const normalized = record.automationStatus.toLowerCase();

  if (filter === 'yes') {
    return normalized === 'yes';
  }

  if (filter === 'no') {
    return normalized === 'no' || normalized === 'manual';
  }

  return true;
}

function matchesStatusFilter(record: TaskRecord, filter: StatusFilter): boolean {
  if (filter === 'all') {
    return true;
  }

  // Use the same logic as metrics calculation - default to 'Pass' if no status
  const statusValue = record.todayStatus?.status ?? record.latestStatus?.status ?? 'Pass';
  const category = categorizeStatus(statusValue);
  return category === filter;
}

function categorizeStatus(value: string): StatusCategory {
  const normalized = value.toLowerCase().trim();

  if (!normalized) {
    return 'other';
  }

  // Check for Pass statuses: Pass, Completed, Rerun completed
  if (
    normalized === 'pass' ||
    normalized === 'completed' ||
    normalized === 'rerun completed' ||
    normalized.includes('success')
  ) {
    console.log('🟢 PASS STATUS FOUND:', {
      originalValue: value,
      normalizedValue: normalized,
      category: 'pass'
    });
    return 'pass';
  }

  // Check for Fail statuses: Fail, Failed, Rerun failed
  if (
    normalized === 'fail' ||
    normalized === 'failed' ||
    normalized === 'rerun failed' ||
    normalized.includes('error') ||
    normalized.includes('blocked')
  ) {
    return 'fail';
  }

  // Check for Attention statuses: Running, In Progress, Rerun started
  if (
    normalized === 'running' ||
    normalized === 'in progress' ||
    normalized === 'rerun started' ||
    normalized.includes('queued') ||
    normalized.includes('pending')
  ) {
    return 'attention';
  }

  return 'other';
}

function formatAutomation(value: string): string {
  if (!value.trim()) {
    return '—';
  }

  const normalized = value.trim().toLowerCase();
  if (normalized === 'yes') {
    return 'Yes';
  }

  if (normalized === 'no') {
    return 'No';
  }

  return value;
}

function formatPercent(part: number, total: number): string {
  if (total === 0) {
    return '0%';
  }

  return `${((part / total) * 100).toFixed(1)}%`;
}
