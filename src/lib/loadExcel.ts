import fs from 'fs';
import { promises as fsPromises } from 'fs';
import path from 'path';
import * as XLSX from 'xlsx';

export type StatusEntry = {
  label: string;
  status: string;
  remarks: string;
};

export type TaskRecordBase = {
  id: string;
  notebook: string;
  bucket: string;
  automationStatus: string;
  schedule: string;
  estimatedRunTime: string;
  days: string;
  poc: string;
  statuses: StatusEntry[];
  latestStatus: StatusEntry | null;
  todayStatus: StatusEntry | null;
};

export type TaskRecord = TaskRecordBase;

export type SheetKey = 'foundational' | 'koyfinScripts';

type SheetConfig = {
  key: SheetKey;
  name: string;
};

export type DashboardData = Record<SheetKey, TaskRecord[]>;

const SHEETS: SheetConfig[] = [
  { key: 'foundational', name: 'FOUNDATIONAL DATA LOADING FOR K' },
  { key: 'koyfinScripts', name: 'Koyfin Automated Scripts' },
];

const BASE_COLUMN_COUNT = 7;

const WORKBOOK_RELATIVE_PATH = path.join(
  'src',
  'components',
  'Koyfin Dashboard and PA nbs Execution Details_Latest 1 - SriniK.xlsx',
);

const ROOT_FALLBACKS = [
  process.cwd(),
  path.join(process.cwd(), 'windsurf-dashboard'),
];

export const STATUS_OVERRIDES_PATH = path.join(process.cwd(), 'data', 'statusOverrides.json');

export type StatusOverrideValue = {
  status: string;
  remarks?: string;
  label?: string;
  updatedAt?: string;
};

export type StatusOverrideMap = Record<string, StatusOverrideValue>;

export function loadDashboardData(): DashboardData {
  const workbookPath = resolveWorkbookPath();

  if (!workbookPath) {
    console.warn('[loadDashboardData] Workbook not found. Returning empty dataset.');
    return createEmptyDashboard();
  }

  console.log('[loadDashboardData] Using workbook path:', workbookPath);

  const overrides = readStatusOverrides();

  let workbook: XLSX.WorkBook;
  try {
    const fileBuffer = fs.readFileSync(workbookPath);
    workbook = XLSX.read(fileBuffer, { type: 'buffer' });
  } catch (error) {
    console.error('[loadDashboardData] Failed to read workbook:', error);
    return createEmptyDashboard();
  }

  const result: Partial<DashboardData> = {};

  for (const sheet of SHEETS) {
    const worksheet = workbook.Sheets[sheet.name];
    if (!worksheet) {
      result[sheet.key] = [];
      continue;
    }

    const rows = XLSX.utils.sheet_to_json<unknown[]>(worksheet, {
      header: 1,
      blankrows: false,
      defval: '',
    });

    if (rows.length <= 1) {
      result[sheet.key] = [];
      continue;
    }

    const headers = (rows[0] ?? []).map((header) => normalizeHeader(header));

    const records: TaskRecord[] = [];

    for (let rowIndex = 1; rowIndex < rows.length; rowIndex += 1) {
      const row = rows[rowIndex] ?? [];
      if (!isMeaningfulRow(row)) {
        continue;
      }

      const record = buildRecord({
        row,
        headers,
        sheetKey: sheet.key,
        rowIndex: rowIndex - 1,
        overrides,
      });

      records.push(record);
    }

    result[sheet.key] = records;
  }

  return {
    foundational: result.foundational ?? [],
    koyfinScripts: result.koyfinScripts ?? [],
  };
}

function resolveWorkbookPath(): string | null {
  const candidates = ROOT_FALLBACKS.map((root) => path.join(root, WORKBOOK_RELATIVE_PATH));
  console.log('[loadDashboardData] Resolved workbook candidates:', candidates);

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      console.log('[loadDashboardData] Resolved workbook candidate:', candidate);
      return candidate;
    }

    console.warn('[loadDashboardData] Candidate not found:', candidate);
  }

  console.error('[loadDashboardData] Workbook path could not be resolved. Tried:', candidates);
  return null;
}

function createEmptyDashboard(): DashboardData {
  return {
    foundational: [],
    koyfinScripts: [],
  };
}

export function readStatusOverrides(): StatusOverrideMap {
  try {
    if (!fs.existsSync(STATUS_OVERRIDES_PATH)) {
      return {};
    }

    const raw = fs.readFileSync(STATUS_OVERRIDES_PATH, 'utf-8');
    const parsed = JSON.parse(raw) as StatusOverrideMap;
    return parsed ?? {};
  } catch (error) {
    console.error('[loadDashboardData] Failed to read status overrides:', error);
    return {};
  }
}

export async function writeStatusOverrides(map: StatusOverrideMap): Promise<void> {
  try {
    await fsPromises.mkdir(path.dirname(STATUS_OVERRIDES_PATH), { recursive: true });
    await fsPromises.writeFile(STATUS_OVERRIDES_PATH, JSON.stringify(map, null, 2), 'utf-8');
  } catch (error) {
    console.error('[loadDashboardData] Failed to write status overrides:', error);
    throw error;
  }
}

type BuildRecordOptions = {
  row: unknown[];
  headers: string[];
  sheetKey: SheetKey;
  rowIndex: number;
  overrides: StatusOverrideMap;
};

function buildRecord({ row, headers, sheetKey, rowIndex, overrides }: BuildRecordOptions): TaskRecord {
  const notebook = toStringValue(row[0]);
  const bucket = toStringValue(row[1]);
  const automationStatus = toStringValue(row[2]);
  const schedule = toStringValue(row[3]);
  const estimatedRunTime = toStringValue(row[4]);
  const days = toStringValue(row[5]);
  const poc = toStringValue(row[6]);

  const id = createId(sheetKey, rowIndex, notebook);
  const statuses = collectStatuses(row, headers);
  let todayStatus = findStatusForToday(statuses);
  let latestStatus = selectLatestStatus(statuses, todayStatus);

  // Only apply override if there's no existing todayStatus from Excel
  const override = overrides[id];
  if (override && !todayStatus) {
    const overrideEntry: StatusEntry = {
      label: override.label ?? 'Manual Override',
      status: override.status,
      remarks: override.remarks ?? '',
    };

    statuses.push(overrideEntry);
    todayStatus = overrideEntry;
    latestStatus = overrideEntry;
  }

  return {
    id,
    notebook,
    bucket,
    automationStatus,
    schedule,
    estimatedRunTime,
    days,
    poc,
    statuses,
    latestStatus,
    todayStatus,
  };
}

function collectStatuses(row: unknown[], headers: string[]): StatusEntry[] {
  const entries: StatusEntry[] = [];
  const consumed = new Set<number>();

  for (let columnIndex = BASE_COLUMN_COUNT; columnIndex < headers.length; columnIndex += 1) {
    if (consumed.has(columnIndex)) {
      continue;
    }

    const header = headers[columnIndex];
    if (!isStatusHeader(header)) {
      continue;
    }

    const statusValue = toStringValue(row[columnIndex]);
    const remarksIndex = findRemarksIndex(headers, columnIndex, consumed);
    const remarksValue = remarksIndex === -1 ? '' : toStringValue(row[remarksIndex]);

    if (!statusValue && !remarksValue) {
      consumed.add(columnIndex);
      if (remarksIndex !== -1) {
        consumed.add(remarksIndex);
      }
      continue;
    }

    entries.push({
      label: formatStatusLabel(header),
      status: statusValue,
      remarks: remarksValue,
    });

    consumed.add(columnIndex);
    if (remarksIndex !== -1) {
      consumed.add(remarksIndex);
    }
  }

  return entries;
}

function selectLatestStatus(statuses: StatusEntry[], todayStatus: StatusEntry | null): StatusEntry | null {
  if (!statuses || statuses.length === 0) {
    return null;
  }

  if (todayStatus) {
    return todayStatus;
  }

  return [...statuses].reverse().find((entry) => entry.status.trim().length > 0) ?? null;
}

function findStatusForToday(statuses: StatusEntry[]): StatusEntry | null {
  const today = new Date();
  console.log(`🗓️  Looking for today's status: Day=${today.getDate()}, Month=${today.getMonth()} (${today.toDateString()})`);

  for (const entry of statuses) {
    if (!entry.label) {
      continue;
    }

    const parsed = extractStatusDate(entry.label);
    if (!parsed) {
      continue;
    }

    console.log(`🔍 Checking entry: label="${entry.label}", parsed day=${parsed.day}, month=${parsed.month}, matches=${parsed.day === today.getDate() && parsed.month === today.getMonth()}`);

    if (parsed.day === today.getDate() && parsed.month === today.getMonth()) {
      if (entry.status.trim().length > 0 || entry.remarks.trim().length > 0) {
        console.log(`✅ Found today's status: ${entry.status}`);
        return entry;
      }
    }
  }

  console.log(`❌ No status found for today`);
  return null;
}

const MONTH_LOOKUP: Record<string, number> = {
  jan: 0,
  january: 0,
  feb: 1,
  february: 1,
  mar: 2,
  march: 2,
  apr: 3,
  april: 3,
  may: 4,
  jun: 5,
  june: 5,
  jul: 6,
  july: 6,
  aug: 7,
  august: 7,
  sep: 8,
  sept: 8,
  september: 8,
  oct: 9,
  october: 9,
  nov: 10,
  november: 10,
  dec: 11,
  december: 11,
};

function extractStatusDate(label: string): { day: number; month: number } | null {
  const normalized = label.toLowerCase();

  const cleaned = normalized
    .replace(/_/g, ' ')
    .replace(/status|remarks|updated|after|re-run|rerun|re run|latest|history|bucket|automation/gi, ' ')
    .replace(/\b(\d+)(st|nd|rd|th)\b/g, '$1')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

  if (!cleaned) {
    return null;
  }

  const parts = cleaned.split(' ').filter(Boolean);
  if (parts.length === 0) {
    return null;
  }

  let day: number | null = null;
  let month: number | null = null;
  const digits: number[] = [];

  for (const part of parts) {
    if (MONTH_LOOKUP[part] !== undefined) {
      month = MONTH_LOOKUP[part];
      continue;
    }

    if (/^\d+$/.test(part)) {
      const value = parseInt(part, 10);
      digits.push(value);

      if (value >= 1 && value <= 31) {
        if (day === null) {
          day = value;
          continue;
        }
      }

      if (value >= 1 && value <= 12 && month === null) {
        month = value - 1;
        continue;
      }
    }
  }

  if ((day === null || month === null) && digits.length >= 2) {
    if (day === null) {
      day = digits[0];
    }
    if (month === null && digits[1] >= 1 && digits[1] <= 12) {
      month = digits[1] - 1;
    }
  }

  if (day === null || month === null) {
    return null;
  }

  return { day, month };
}

function findRemarksIndex(headers: string[], statusColumnIndex: number, consumed: Set<number>): number {
  const targetSuffix = extractSuffix(headers[statusColumnIndex]);

  for (let columnIndex = statusColumnIndex + 1; columnIndex < headers.length; columnIndex += 1) {
    if (consumed.has(columnIndex)) {
      continue;
    }

    const header = headers[columnIndex];
    if (!isRemarksHeader(header)) {
      continue;
    }

    const remarksSuffix = extractSuffix(header);
    if (remarksSuffix === targetSuffix || (!remarksSuffix && !targetSuffix)) {
      return columnIndex;
    }
  }

  return -1;
}

function normalizeHeader(header: unknown): string {
  if (typeof header === 'string') {
    return header.trim();
  }

  if (header == null) {
    return '';
  }

  return String(header).trim();
}

function toStringValue(value: unknown): string {
  if (typeof value === 'string') {
    return value.trim();
  }

  if (typeof value === 'number') {
    return Number.isFinite(value) ? String(value) : '';
  }

  if (value == null) {
    return '';
  }

  return String(value).trim();
}

function isMeaningfulRow(row: unknown[]): boolean {
  return row.some((cell) => toStringValue(cell).length > 0);
}

function isStatusHeader(header: string): boolean {
  if (!header) {
    return false;
  }

  const lower = header.toLowerCase();
  if (lower.includes('automation status')) {
    return false;
  }

  return lower.includes('status');
}

function isRemarksHeader(header: string): boolean {
  return Boolean(header && header.toLowerCase().includes('remark'));
}

function extractSuffix(header: string): string {
  return header
    .toLowerCase()
    .replace(/status|remarks|updated|after|re-run|rerun|re run/gi, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function formatStatusLabel(header: string): string {
  const cleaned = header.replace(/_/g, ' ').replace(/\s+/g, ' ').trim();
  const result = toTitleCase(cleaned);
  console.log(`📋 Format Label: "${header}" → "${result}"`);
  return result;
}

function toTitleCase(value: string): string {
  return value
    .split(' ')
    .filter((segment) => segment.length > 0)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1).toLowerCase())
    .join(' ');
}

function createId(sheetKey: SheetKey, rowIndex: number, notebook: string): string {
  const base = notebook
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-');

  return `${sheetKey}-${rowIndex}-${base || 'item'}`;
}
