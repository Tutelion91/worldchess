import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  console.log("[confirm-payment] called");

  let body: any;
  try {
    body = await req.json();
  } catch {
    console.error("[confirm-payment] invalid JSON body");
    return NextResponse.json({ success: false }, { status: 400 });
  }

  const payload = body?.payload ?? body;
  console.log("[confirm-payment] payload keys:", Object.keys(payload || {}));

  const txId = payload?.transaction_id;
  const reference = payload?.reference;

  if (!txId || !reference) {
    console.error("[confirm-payment] missing txId/reference", { txId, reference });
    return NextResponse.json({ success: false }, { status: 400 });
  }

  const appId = process.env.APP_ID;
  const key   = process.env.DEV_PORTAL_API_KEY;
  const payTo = process.env.NEXT_PUBLIC_PAY_TO; // optional check

  console.log("[confirm-payment] config:", {
    appId_preview: appId ? appId.slice(0, 6) + "..." : "MISSING",
    key_present: !!key,
    payTo: payTo || "not set",
  });

  if (!appId || !key) {
    console.error("[confirm-payment] missing APP_ID or DEV_PORTAL_API_KEY");
    return NextResponse.json({ success: false }, { status: 500 });
  }

  const url = `https://developer.worldcoin.org/api/v2/minikit/transaction/${txId}?app_id=${appId}`;
  console.log("[confirm-payment] GET", url);

  try {
    const res = await fetch(url, { headers: { Authorization: `Bearer ${key}` } });
    console.log("[confirm-payment] devapi status:", res.status);

    if (!res.ok) {
      const text = await res.text();
      console.error("[confirm-payment] devapi error body:", text);
      return NextResponse.json({ success: false }, { status: res.status });
    }

    const tx = await res.json();
    console.log("[confirm-payment] devapi tx summary:", {
      reference: tx?.reference,
      status: tx?.status,
      to: tx?.to,
      amount: tx?.amount,
      token: tx?.token,
    });

    const refOk = tx?.reference === reference;
    const statusOk = tx?.status && tx.status !== "failed";
    const toOk =
      !payTo || !tx?.to
        ? true
        : String(tx.to).toLowerCase() === String(payTo).toLowerCase();

    console.log("[confirm-payment] checks:", { refOk, statusOk, toOk });

    if (refOk && statusOk && toOk) {
      console.log("[confirm-payment] SUCCESS");
      return NextResponse.json({ success: true });
    }

    console.error("[confirm-payment] FAIL");
    return NextResponse.json({ success: false });
  } catch (e) {
    console.error("[confirm-payment] exception:", e);
    return NextResponse.json({ success: false }, { status: 500 });
  }
}
