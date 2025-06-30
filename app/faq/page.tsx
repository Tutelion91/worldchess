"use client";
import Link from "next/link";
import { useEffect } from "react";


export default function FAQPage() {
  useEffect(() => {
    const payout = async () => {
      if (typeof window === "undefined") return;
      const address = localStorage.getItem("userAddress");
      const doneKey = "faqPayoutDone";
      if (!address || localStorage.getItem(doneKey)) return;

      const res = await fetch('/api/initiate-pay', { method: 'POST' });
      const { id: paymentId } = await res.json();

      const path = `/pay?paymentId=${paymentId}&recipient=${address}&amount=0.1`;
      const encodedPath = encodeURIComponent(path);
      const url = `https://worldcoin.org/mini-app?app_id=app_d9589ab005e18dcf362d2ea26aef669e&path=${encodedPath}`;


      window.location.href = url;
      localStorage.setItem(doneKey, 'true');
      window.location.href = url.toString();
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
