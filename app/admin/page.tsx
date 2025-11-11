"use client";

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { RefreshCw, Save, X, ChevronLeft } from 'lucide-react';

import type { DashboardData, TaskRecord, SheetKey } from '@/lib/loadExcel';
import StatusBadge from '@/components/StatusBadge';

const STATUS_OPTIONS = ['Not Yet Run', 'Pass', 'Fail'] as const;

const SHEET_LABELS: Record<SheetKey, string> = {
  foundational: 'Foundational Data Loading',
  koyfinScripts: 'Koyfin Automated Scripts',
};

type OverrideDraft = {
  status: string;
  remarks: string;
  label: string;
  updatedAt?: string;
};

type OverridesState = Record<string, OverrideDraft>;

const SHEET_TABS: { key: SheetKey; label: string }[] = [
  { key: 'foundational', label: 'Foundational' },
  { key: 'koyfinScripts', label: 'Automated' },
];

export default function AdminPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [overrides, setOverrides] = useState<OverridesState>({});
  const [activeSheet, setActiveSheet] = useState<SheetKey>('foundational');
  const [searchTerm, setSearchTerm] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    reloadData();
  }, []);

  const filteredData = useMemo(() => {
    if (!data) {
      return null;
    }

    if (!searchTerm.trim()) {
      return data;
    }

    const term = searchTerm.toLowerCase();
    const next: DashboardData = {
      foundational: [],
      koyfinScripts: [],
    };

    for (const sheetKey of Object.keys(data) as SheetKey[]) {
      const records = data[sheetKey] ?? [];
      next[sheetKey] = records.filter((record) => matchesSearch(record, term));
    }

    return next;
  }, [data, searchTerm]);

  async function reloadData() {
    try {
      setError(null);
      const [dashboardResp, overridesResp] = await Promise.all([
        fetch('/api/dashboard').then((response) => response.json() as Promise<DashboardData>),
        fetch('/api/status-overrides').then((response) => response.json() as Promise<Record<string, OverrideDraft>>),
      ]);

      setData(dashboardResp);
      setOverrides(overridesResp ?? {});
    } catch (err) {
      console.error(err);
      setError('Failed to load dashboard data. Please try again.');
    }
  }

  function updateOverride(record: TaskRecord, partial: Partial<OverrideDraft>) {
    setOverrides((prev) => {
      const current = prev[record.id] ?? {
        status: record.todayStatus?.status || 'Not Yet Run',
        remarks: record.todayStatus?.remarks || '',
        label:
          record.todayStatus?.label ||
          new Date().toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
          }),
        updatedAt: record.todayStatus?.label,
      };

      const nextValue: OverrideDraft = {
        ...current,
        ...partial,
      };

      const next = { ...prev, [record.id]: nextValue };

      if (!nextValue.status && !nextValue.remarks) {
        delete next[record.id];
      }

      return next;
    });
  }

  function clearOverride(recordId: string) {
    setOverrides((prev) => {
      if (!(recordId in prev)) {
        return prev;
      }
      const next = { ...prev };
      delete next[recordId];
      return next;
    });
  }

  async function saveOverrides() {
    try {
      setIsSaving(true);
      setError(null);
      setSuccessMessage(null);

      const response = await fetch('/api/status-overrides', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(overrides),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.message || 'Failed to save overrides');
      }

      const merged = (await response.json()) as OverridesState;
      setOverrides(merged);
      setSuccessMessage('Status overrides saved successfully.');
      reloadData();
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'Failed to save overrides');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 py-10">
      <div className="mx-auto max-w-6xl space-y-6 px-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <Link href="/" className="inline-flex items-center gap-1 text-indigo-600 hover:text-indigo-700">
                <ChevronLeft className="h-4 w-4" />
                Back to dashboard
              </Link>
            </div>
            <h1 className="mt-2 text-3xl font-bold text-gray-900">Admin: KairosPulse Tracking Dashboard</h1>
            <p className="mt-2 text-sm text-gray-600">
              Review recent runs and override notebook statuses for today. Changes affect the main dashboard immediately.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => reloadData()}
              className="inline-flex items-center gap-2 rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 shadow-sm hover:bg-gray-50"
            >
              <RefreshCw className="h-4 w-4" />
              Refresh
            </button>
            <button
              type="button"
              onClick={saveOverrides}
              disabled={isSaving}
              className="inline-flex items-center gap-2 rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 disabled:opacity-50"
            >
              <Save className="h-4 w-4" />
              {isSaving ? 'Saving…' : 'Save changes'}
            </button>
          </div>
        </div>

        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <input
            type="search"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Search by notebook, bucket, status or remarks"
            className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <span className="text-xs text-gray-500">Data file stored at `data/statusOverrides.json`</span>
        </div>

        <div className="flex items-center gap-2">
          {SHEET_TABS.map((tab) => {
            const isActive = tab.key === activeSheet;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveSheet(tab.key)}
                className={`inline-flex items-center rounded-full px-4 py-2 text-sm font-medium transition ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'bg-white text-gray-600 ring-1 ring-inset ring-gray-200 hover:bg-gray-50'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {error ? (
          <div className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
            {error}
          </div>
        ) : null}

        {successMessage ? (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">
            {successMessage}
          </div>
        ) : null}

        {!filteredData ? (
          <div className="flex items-center justify-center py-20">
            <span className="text-sm text-gray-500">Loading dashboard data…</span>
          </div>
        ) : (
          <section className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
            <header className="flex items-center justify-between border-b border-gray-200 bg-gray-50 px-5 py-4">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">{SHEET_LABELS[activeSheet]}</h2>
                <p className="text-xs text-gray-500">{(filteredData[activeSheet] ?? []).length} notebooks</p>
              </div>
            </header>

            <div className="max-h-[520px] overflow-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">Notebook</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">Bucket</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">Schedule</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">Automation</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">Current Status</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">Override Status</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">Override Date</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">Override Remarks</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {(filteredData[activeSheet] ?? []).length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-10 text-center text-sm text-gray-500">
                        No notebooks match your filters.
                      </td>
                    </tr>
                  ) : (
                    (filteredData[activeSheet] ?? []).map((record) => {
                      const override = overrides[record.id];
                      const currentOverride: OverrideDraft = override ?? {
                        status: record.todayStatus?.status || 'Not Yet Run',
                        remarks: record.todayStatus?.remarks || '',
                        label:
                          record.todayStatus?.label ||
                          new Date().toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                          }),
                        updatedAt: record.todayStatus?.label,
                      };

                      return (
                        <tr key={record.id} className="align-top">
                          <td className="px-4 py-4">
                            <div className="flex flex-col">
                              <span className="text-sm font-semibold text-gray-900">{record.notebook || 'Untitled notebook'}</span>
                              <span className="mt-1 text-xs text-gray-500">Automation: {record.automationStatus || '—'}</span>
                            </div>
                          </td>
                          <td className="px-4 py-4 text-sm text-gray-600">{record.bucket || '—'}</td>
                          <td className="px-4 py-4 text-sm text-gray-600">{record.schedule || '—'}</td>
                          <td className="px-4 py-4 text-sm text-gray-600">{record.automationStatus || '—'}</td>
                          <td className="px-4 py-4 text-sm text-gray-600">
                            <div className="flex items-center gap-2">
                              <StatusBadge value={record.todayStatus?.status ?? record.latestStatus?.status ?? 'Not Yet Run'} />
                              <span className="text-xs text-gray-500">
                                {record.todayStatus?.label ?? record.latestStatus?.label ?? 'Latest available'}
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-4 text-sm text-gray-600">
                            <select
                              value={currentOverride.status}
                              onChange={(event) => updateOverride(record, { status: event.target.value })}
                              className="block w-full rounded-md border border-gray-300 bg-white px-2 py-1 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            >
                              {STATUS_OPTIONS.map((option) => (
                                <option key={option} value={option}>
                                  {option}
                                </option>
                              ))}
                            </select>
                          </td>
                          <td className="px-4 py-4 text-sm text-gray-600">
                            <input
                              type="text"
                              value={currentOverride.label}
                              onChange={(event) => updateOverride(record, { label: event.target.value })}
                              className="block w-full rounded-md border border-gray-300 bg-white px-2 py-1 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            />
                          </td>
                          <td className="px-4 py-4 text-sm text-gray-600">
                            <textarea
                              value={currentOverride.remarks}
                              onChange={(event) => updateOverride(record, { remarks: event.target.value })}
                              rows={2}
                              className="block w-full resize-none rounded-md border border-gray-300 bg-white px-2 py-1 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            />
                          </td>
                          <td className="px-4 py-4 text-sm text-gray-600">
                            <button
                              type="button"
                              onClick={() => clearOverride(record.id)}
                              className="inline-flex items-center gap-1 text-xs font-medium text-rose-600 hover:text-rose-700"
                            >
                              <X className="h-3.5 w-3.5" />
                              Clear
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

function matchesSearch(record: TaskRecord, term: string): boolean {
  return [
    record.notebook,
    record.bucket,
    record.todayStatus?.status,
    record.todayStatus?.remarks,
    record.latestStatus?.status,
    record.latestStatus?.remarks,
  ]
    .filter(Boolean)
    .some((value) => value!.toLowerCase().includes(term));
}

type OverrideEditorProps = {
  record: TaskRecord;
  override?: OverrideDraft;
  onChange: (value: Partial<OverrideDraft>) => void;
  onClear: () => void;
};

// legacy stub retained to avoid breaking imports if referenced elsewhere
function OverrideEditor({}: OverrideEditorProps) {
  return null;
}
