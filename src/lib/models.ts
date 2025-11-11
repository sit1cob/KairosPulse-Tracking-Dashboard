import { ObjectId } from 'mongodb';

// Base interfaces matching your existing types
export interface StatusEntry {
  label: string;
  status: string;
  remarks: string;
  timestamp?: Date;
}

export interface TaskRecord {
  _id?: ObjectId;
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
  sheetKey: 'foundational' | 'koyfinScripts';
  createdAt?: Date;
  updatedAt?: Date;
}

export interface DashboardCollection {
  _id?: ObjectId;
  name: string;
  description?: string;
  tasks: TaskRecord[];
  createdAt?: Date;
  updatedAt?: Date;
}

// Validation functions
export function validateTaskRecord(data: any): data is Omit<TaskRecord, '_id' | 'createdAt' | 'updatedAt'> {
  return (
    typeof data.id === 'string' &&
    typeof data.notebook === 'string' &&
    typeof data.bucket === 'string' &&
    typeof data.automationStatus === 'string' &&
    typeof data.schedule === 'string' &&
    typeof data.estimatedRunTime === 'string' &&
    typeof data.days === 'string' &&
    typeof data.poc === 'string' &&
    Array.isArray(data.statuses) &&
    (data.sheetKey === 'foundational' || data.sheetKey === 'koyfinScripts')
  );
}

export function validateStatusEntry(data: any): data is StatusEntry {
  return (
    typeof data.label === 'string' &&
    typeof data.status === 'string' &&
    typeof data.remarks === 'string'
  );
}

// Collection names
export const COLLECTIONS = {
  TASKS: 'tasks',
  DASHBOARD_COLLECTIONS: 'dashboard_collections',
  STATUS_OVERRIDES: 'status_overrides',
} as const;
