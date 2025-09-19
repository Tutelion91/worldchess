"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  MiniKit,
  tokenToDecimals,
  Tokens,
  type PayCommandInput,
} from "@worldcoin/minikit-js";

const PAY_TO = process.env.NEXT_PUBLIC_PAY_TO!;

export default function FAQPage() {
  const [userAddress, setUserAddress] = useState<string | null>(null);
  const [loadingAddress, setLoadingAddress] = useState(true);
  const [isVerified, setIsVerified] = useState(false);
  const [claimed, setClaimed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Adresse laden
  useEffect(() => {
    const fetchAddress = async () => {
      try {
        if (typeof window !== "undefined") {
          if (localStorage.getItem("worldIdVerified") === "true") {
            setIsVerified(true);
          }
          if (localStorage.getItem("wldPayoutDone") === "true") {
            setClaimed(true);
          }
        }
        const info = await MiniKit.getUserInfo();
   let addr = (info as any).wallet_address || (info as any).walletAddress;
      // Wenn keine Adresse vorhanden ist, fordere sie aktiv an
      if (!addr) {
        const { finalPayload: walletPayload } = await MiniKit.commandsAsync.walletAuth({ nonce: crypto.randomUUID() });
        if ((walletPayload as any).status === 'success' && (walletPayload as any).address) {
          addr = (walletPayload as any).address;
        }
      }
      if (addr) {
        localStorage.setItem("userAddress", addr);
        setUserAddress(addr);
      }
      } catch (err) {
        console.error("Nutzerinfo konnte nicht geladen werden", err);
      } finally {
        setLoadingAddress(false);
      }
    };
    fetchAddress();
  }, []);

  // Zahlung anstoßen
  const handlePayToMetamask = async () => {
    try {
      // 1) Referenz vom Backend holen
      const initRes = await fetch("/api/initiate-payment", { method: "POST" });
      const { id: reference } = await initRes.json();

      // 2) payload bauen (0.3 WLD)
      const input: PayCommandInput = {
        reference,
        to: PAY_TO,
        tokens: [
          {
            symbol: Tokens.WLD,
            token_amount: tokenToDecimals(0.3, Tokens.WLD).toString(),
          },
        ],
        description: "Send 0.3 WLD to my MetaMask wallet",
      };

      // 3) Zahlung ausführen
      const { finalPayload } = await MiniKit.commandsAsync.pay(input);

      // 4) optional: Bestätigung beim Backend
      await fetch("/api/confirm-payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ payload: finalPayload }),
      });

      setSuccess(true);
    } catch (e: any) {
      setError(e?.message ?? "Zahlung fehlgeschlagen");
    }
  };

  return (
    <main className="p-6 text-white">
      <h1 className="text-2xl font-bold mb-4">FAQ</h1>

      <button
        onClick={handlePayToMetamask}
        className="mb-4 px-6 py-2 bg-green-600 hover:bg-green-700 rounded disabled:opacity-50"
        disabled={!userAddress}
      >
        0,3 WLD an meine MetaMask senden
      </button>

      {loadingAddress ? (
        <p>Lade Nutzeradresse…</p>
      ) : (
        <>
          {success && <p className="text-green-400 mb-2">Auszahlung erfolgreich!</p>}
          {error && <p className="text-red-400 mb-2">{error}</p>}
          {!isVerified && <p>Bitte einloggen oder verifizieren.</p>}
          {!userAddress && !error && <p>Nutzeradresse konnte nicht geladen werden.</p>}
        </>
      )}

      <Link
        href="/"
        className="mt-8 px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded text-white font-semibold inline-block"
      >
        Zurück
      </Link>
    </main>
  );
}

