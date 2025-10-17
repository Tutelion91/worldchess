import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  // Eingehenden Body lesen – es kann { payload: {...} } oder {...} sein
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ success: false }, { status: 400 });
  }
  const payload = body.payload ?? body;

  // Transaktions-ID und Referenz aus beiden möglichen Schreibweisen ziehen
  const transactionId = payload.transaction_id ?? payload.transactionId;
  const reference     = payload.reference      ?? payload.referenceId;

  if (!transactionId || !reference) {
    return NextResponse.json({ success: false }, { status: 400 });
  }

  const appId = process.env.APP_ID;
  const key   = process.env.DEV_PORTAL_API_KEY;
  if (!appId || !key) {
    return NextResponse.json({ success: false }, { status: 500 });
  }

  try {
    // Laut Worldcoin-Dokumentation muss type=pay mitgegeben werden,
    // sonst liefert die API einen 400-Fehler.
    const query = new URLSearchParams({
      app_id: appId,
      type: 'pay',
    });
    const url = `https://developer.worldcoin.org/api/v2/minikit/transaction/${transactionId}?${query.toString()}`;

    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${key}` },
    });
    if (!res.ok) {
      return NextResponse.json({ success: false }, { status: res.status });
    }

    const tx = await res.json();
    // Erfolg nur, wenn Referenz übereinstimmt und kein Fehlerstatus vorliegt
    if (tx?.reference === reference && tx?.status !== 'failed') {
      return NextResponse.json({ success: true });
    }
    return NextResponse.json({ success: false });
  } catch {
    return NextResponse.json({ success: false }, { status: 500 });
  }
}
