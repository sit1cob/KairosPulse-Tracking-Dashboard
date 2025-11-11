import { NextRequest, NextResponse } from 'next/server';
import {
  readStatusOverrides,
  writeStatusOverrides,
  type StatusOverrideMap,
  STATUS_OVERRIDES_PATH,
} from '@/lib/loadExcel';

export async function GET() {
  const overrides = readStatusOverrides();
  return NextResponse.json(overrides);
}

export async function PATCH(request: NextRequest) {
  let payload: Partial<StatusOverrideMap> | undefined;

  try {
    payload = await request.json();
  } catch (error) {
    return NextResponse.json({ message: 'Invalid JSON payload' }, { status: 400 });
  }

  if (!payload || typeof payload !== 'object') {
    return NextResponse.json({ message: 'Payload must be an object' }, { status: 400 });
  }

  const existing = readStatusOverrides();
  const merged: StatusOverrideMap = { ...existing };

  for (const [key, value] of Object.entries(payload)) {
    if (!value) {
      delete merged[key];
      continue;
    }

    if (typeof value !== 'object' || typeof value.status !== 'string') {
      return NextResponse.json({ message: `Invalid override for ${key}` }, { status: 400 });
    }

    merged[key] = {
      ...merged[key],
      ...value,
      updatedAt: new Date().toISOString(),
    };
  }

  await writeStatusOverrides(merged);

  return NextResponse.json(merged);
}

export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json({ message: 'Missing id query parameter' }, { status: 400 });
  }

  const existing = readStatusOverrides();
  if (!(id in existing)) {
    return NextResponse.json(existing);
  }

  delete existing[id];
  await writeStatusOverrides(existing);

  return NextResponse.json(existing);
}
