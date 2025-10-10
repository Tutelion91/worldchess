import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  // Body parsen – es kann entweder { payload: {...} } oder {...} sein
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ success: false }, { status: 400 });
  }
  const payload = body.payload ?? body;

  // Prüfen, ob transaction_id und reference existieren
  if (!payload?.transaction_id || !payload?.reference) {
    return NextResponse.json({ success: false }, { status: 400 });
  }

  const appId = process.env.APP_ID;
  const key   = process.env.DEV_PORTAL_API_KEY;
  if (!appId || !key) {
    return NextResponse.json({ success: false }, { status: 500 });
  }

  try {
    const res = await fetch(
      `https://developer.worldcoin.org/api/v2/minikit/transaction/${payload.transaction_id}?app_id=${appId}`,
      { headers: { Authorization: `Bearer ${key}` } }
    );
    if (!res.ok) {
      return NextResponse.json({ success: false }, { status: res.status });
    }
    const tx = await res.json();
    // Erfolgreich, wenn die Referenz übereinstimmt und kein Fehlerstatus vorliegt
    if (tx?.reference === payload.reference && tx?.status !== "failed") {
      return NextResponse.json({ success: true });
    }
    return NextResponse.json({ success: false });
  } catch {
    return NextResponse.json({ success: false }, { status: 500 });
  }
}

