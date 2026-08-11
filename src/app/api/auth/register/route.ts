import { NextResponse } from 'next/server';

export async function POST() {
  return NextResponse.json(
    { error: 'Public registration is disabled. Please contact your Super Admin to receive a workspace account and PIN.' },
    { status: 403 }
  );
}
