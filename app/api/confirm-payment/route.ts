import { NextRequest, NextResponse } from "next/server";

/** kleines Helper: erstes definiertes Feld nehmen */
function firstDefined<T>(...vals: (T | undefined | null)[]): T | undefined {
  for (const v of vals) if (v !== undefined && v !== null) return v as T;
  return undefined;
}

/** kurze Wartefunktion für Retry */
const sleep = (ms: number) => new Promise(res => setTimeout(res, ms));

export async function POST(req: NextRequest) {
  console.log("[confirm-payment] called");

  // 1) Body parsen (raw oder { payload })
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
  const payTo = process.env.NEXT_PUBLIC_PAY_TO; // optional

  console.log("[confirm-payment] config:", {
    appId_preview: appId ? appId.slice(0, 6) + "..." : "MISSING",
    key_present: !!key,
    payTo: payTo || "not set",
  });

  if (!appId || !key) {
    console.error("[confirm-payment] missing APP_ID or DEV_PORTAL_API_KEY");
    return NextResponse.json({ success: false }, { status: 500 });
  }

  // 2) Bis zu 3 Versuche, falls die Dev-API den Status leicht verzögert liefert
  const url = `https://developer.worldcoin.org/api/v2/minikit/transaction/${txId}?app_id=${appId}`;

  let tx: any | null = null;
  for (let attempt = 1; attempt <= 3; attempt++) {
    console.log(`[confirm-payment] GET (try ${attempt})`, url);
    try {
      const res = await fetch(url, { headers: { Authorization: `Bearer ${key}` } });
      console.log("[confirm-payment] devapi status:", res.status);

      if (!res.ok) {
        const text = await res.text();
        console.error("[confirm-payment] devapi error body:", text);
        // Kein Retry bei 4xx
        if (res.status >= 400 && res.status < 500) {
          return NextResponse.json({ success: false }, { status: res.status });
        }
      } else {
        tx = await res.json();
        console.log("[confirm-payment] devapi full tx:", JSON.stringify(tx, null, 2));
        // wenn irgendwas Sinnvolles da ist, aus der Schleife raus
        if (tx) break;
      }
    } catch (e) {
      console.error("[confirm-payment] fetch exception:", e);
      // bei Netzwerkfehler 1x kurz warten und nochmal probieren
    }
    await sleep(600);
  }

  if (!tx) {
    console.error("[confirm-payment] devapi returned no json");
    return NextResponse.json({ success: false }, { status: 502 });
  }

  // 3) Felder robust „normalisieren“
  //   Manche Antworten geben 'status', manche 'transaction_status', manche schachteln es.
  const refApi = firstDefined<string>(
    tx?.reference,
    tx?.transaction?.reference,
    tx?.data?.reference
  );

  const statusRaw = firstDefined<string | boolean>(
    tx?.status,
    tx?.transaction_status,
    tx?.transaction?.status,
    tx?.transaction?.transaction_status,
    tx?.data?.status,
    tx?.result?.status
  );

  const toApi = firstDefined<string>(
    tx?.to,
    tx?.transaction?.to,
    tx?.transfer?.to,
    tx?.data?.to
  );

  console.log("[confirm-payment] normalized:", {
    refApi,
    statusRaw,
    toApi,
  });

  // 4) Checks
  const refOk = refApi === reference;

  // status normalisieren:
  // - Wenn String: success/succeeded/completed/confirmed/paid => OK
  // - "failed"/"error"/"reverted"/"cancelled"/"canceled"/"refunded" => FAIL
  // - Wenn bool true => OK; bool false => FAIL
  let statusOk = true; // falls das Feld gar nicht geliefert wird, nicht blockieren
  if (typeof statusRaw === "string") {
    const s = statusRaw.toLowerCase();
    const okSet = new Set(["success", "succeeded", "completed", "confirmed", "paid"]);
    const badSet = new Set(["failed", "error", "reverted", "cancelled", "canceled", "refunded"]);
    statusOk = okSet.has(s) || !badSet.has(s);
  } else if (typeof statusRaw === "boolean") {
    statusOk = statusRaw === true;
  }

  // 'to' prüfen nur, wenn die Dev-API überhaupt eins liefert UND wir payTo gesetzt haben
  const toOk =
    !payTo || !toApi
      ? true
      : String(toApi).toLowerCase() === String(payTo).toLowerCase();

  console.log("[confirm-payment] checks:", { refOk, statusOk, toOk });

  if (refOk && statusOk && toOk) {
    console.log("[confirm-payment] SUCCESS");
    return NextResponse.json({ success: true });
  }

  console.error("[confirm-payment] FAIL (refOk/statusOk/toOk did not all pass)");
  return NextResponse.json({ success: false });
}

