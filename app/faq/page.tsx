"use client";
import Link from "next/link";
import { useEffect } from "react";
import { MiniKit, tokenToDecimals, Tokens, PayCommandInput } from "@worldcoin/minikit-js";

export default function FAQPage() {
  useEffect(() => {
    const payout = async () => {
      if (typeof window === "undefined") return;
      const address = localStorage.getItem("userAddress");
      const doneKey = "faqPayoutDone";
      if (!address || localStorage.getItem(doneKey)) return;

      const res = await fetch('/api/initiate-pay', { method: 'POST' });
      const { id: reference } = await res.json();

      const payload: PayCommandInput = {
        reference,
        to: address,
        tokens: [
          {
            symbol: Tokens.WLD,
            token_amount: tokenToDecimals(0.1, Tokens.WLD).toString(),
          },
        ],
        description: 'FAQ payout',
      };

      if (!MiniKit.isInstalled()) return;

      const { finalPayload } = await MiniKit.commandsAsync.pay(payload);
      if ('from' in finalPayload && finalPayload.from) {
        try {
          localStorage.setItem("userAddress", finalPayload.from);
        } catch {}
      }

      await fetch('/api/confirm-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(finalPayload),
      });
      localStorage.setItem(doneKey, 'true');
    };

    payout();
  }, []);

  return (
    <div className="min-h-screen bg-blue-900 text-white p-8 flex flex-col items-center space-y-6">
      <h1 className="text-2xl font-bold">FAQ</h1>
      <p className="max-w-prose text-center">
        Hier findest du Antworten auf häufig gestellte Fragen rund um WorldChess.
      </p>
      <Link
        href="/"
        className="mt-8 px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded text-white font-semibold"
      >
        Zurück
      </Link>
    </div>
  );
}
