import { NextResponse } from 'next/server';

export function rejectProductionDiagnostics() {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  return null;
}
