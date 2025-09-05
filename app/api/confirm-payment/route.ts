import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const { payload } = await req.json();
  const appId = process.env.APP_ID;
  const key   = process.env.DEV_PORTAL_API_KEY;
  if (!appId || !key) {
    return NextResponse.json({ success: false }, { status: 500 });
  }

  const res = await fetch(
    `https://developer.worldcoin.org/api/v2/minikit/transaction/${payload.transaction_id}?app_id=${appId}`,
    { headers: { Authorization: `Bearer ${key}` } }
  );
  const tx = await res.json();
  if (tx.reference === payload.reference && tx.status !== 'failed') {
    return NextResponse.json({ success: true });
  }
  return NextResponse.json({ success: false });
}

