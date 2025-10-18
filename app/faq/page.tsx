"use client";

import { useEffect, useState } from "react";
import {
  MiniKit,
  tokenToDecimals,
  Tokens,
  type PayCommandInput,
} from "@worldcoin/minikit-js";

const PAY_TO = process.env.NEXT_PUBLIC_PAY_TO!; // Escrow Contract

export default function FAQPage() {
  const [userAddress, setUserAddress] = useState<string | null>(null);
  const [gameId, setGameId] = useState("");
  const [status, setStatus] = useState("");
  const [player2Override, setPlayer2Override] = useState(""); // optional zweite Adresse (z. B. MetaMask)

  // Wallet-Adresse laden (MiniKit) + fallback walletAuth
  useEffect(() => {
    (async () => {
      try {
        const info = await MiniKit.getUserInfo();
        let addr =
          (info as any)?.wallet_address || (info as any)?.walletAddress || null;

        if (!addr) {
          const { finalPayload } = await MiniKit.commandsAsync.walletAuth({
            nonce: crypto.randomUUID(),
          });
          if ((finalPayload as any)?.status === "success") {
            addr = (finalPayload as any)?.address ?? null;
          }
        }
        if (addr) {
          localStorage.setItem("userAddress", addr);
          setUserAddress(addr);
        }
      } catch (e) {
        console.error(e);
      }
    })();
  }, []);

  // 0,3 WLD zahlen + Backend verifizieren lassen

const pay = async (amountWLD: number) => {
  setStatus("Starte Zahlung ...");

  // A) initiate-pay
  console.log("[FAQ/pay] STEP A: POST /api/initiate-pay");
  const initRes = await fetch("/api/initiate-pay", { method: "POST" });
  const initText = await initRes.text();
  console.log("[FAQ/pay] /api/initiate-pay raw response:", initText);
  let initJson: any;
  try {
    initJson = JSON.parse(initText);
  } catch (e) {
    throw new Error("initiate-pay: invalid JSON");
  }
  const reference = initJson?.id;
  console.log("[FAQ/pay] reference =", reference, "PAY_TO =", PAY_TO);

  if (!reference) {
    throw new Error("initiate-pay: missing reference id");
  }

  // B) MiniKit pay
  console.log("[FAQ/pay] STEP B: MiniKit.commandsAsync.pay()");
  const input: PayCommandInput = {
    reference,
    to: PAY_TO,
    tokens: [
      {
        symbol: Tokens.WLD,
        token_amount: tokenToDecimals(amountWLD, Tokens.WLD).toString(),
      },
    ],
    description: `Worldchess Test Stake ${amountWLD} WLD`,
  };

  const { finalPayload } = await MiniKit.commandsAsync.pay(input);
  console.log("[FAQ/pay] finalPayload from MiniKit:", finalPayload);

  // C) confirm-payment
  console.log("[FAQ/pay] STEP C: POST /api/confirm-payment");
  const confirmRes = await fetch("/api/confirm-payment", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    // send raw finalPayload (the route supports both {payload} and raw)
    body: JSON.stringify(finalPayload),
  });
  const confirmText = await confirmRes.text();
  console.log("[FAQ/pay] /api/confirm-payment raw response:", confirmText);
  let confirmJson: any;
  try {
    confirmJson = JSON.parse(confirmText);
  } catch (e) {
    throw new Error("confirm-payment: invalid JSON response");
  }

  if (!confirmJson?.success) {
    console.error("[FAQ/pay] confirm FAILED");
    throw new Error("Payment verification failed");
  }

  console.log("[FAQ/pay] confirm SUCCESS");
};

  const requireAddrAndId = () => {
    if (!userAddress) {
      setStatus("Keine Wallet-Adresse gefunden (MiniKit).");
      return false;
    }
    if (!gameId) {
      setStatus("Bitte eine Game-ID eingeben.");
      return false;
    }
    return true;
  };

  // Host zahlt 0,3 WLD und legt GameRecord im Escrow an
  const handleCreate = async () => {
    if (!requireAddrAndId()) return;
    try {
      await pay(0.3);
      setStatus("Zahlung Host ok. Erzeuge GameRecord im Escrow...");
      const r = await fetch("/api/create-game", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gameId, stakeWLD: 0.3, player1: userAddress }),
      });
      const j = await r.json();
      if (!j.success) throw new Error(j.error || "create-game failed");
      setStatus("GameRecord erstellt.");
    } catch (e: any) {
      setStatus(e?.message || "Fehler bei Create");
    }
  };

  // Joiner zahlt 0,3 WLD und markiert Join im Escrow
  const handleJoin = async () => {
    if (!requireAddrAndId()) return;
    try {
      await pay(0.3);
      setStatus("Zahlung Spieler 2 ok. Markiere Join im Escrow...");
      const r = await fetch("/api/join-game", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ gameId, player2: userAddress }),
      });
      const j = await r.json();
      if (!j.success) throw new Error(j.error || "join-game failed");
      setStatus("Join markiert.");
    } catch (e: any) {
      setStatus(e?.message || "Fehler bei Join");
    }
  };

  // NEU: Join nur markieren (ohne zweite Zahlung) – für Tests mit MetaMask-Adresse
  const handleJoinMarkOnly = async () => {
    if (!requireAddrAndId()) return;
    const p2 = player2Override.trim();
    if (!/^0x[0-9a-fA-F]{40}$/.test(p2)) {
      setStatus("Bitte eine gültige Player-2-Adresse eingeben");
      return;
    }
    try {
      setStatus("Markiere Join im Escrow (ohne Zahlung) …");
      const r = await fetch("/api/join-game", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gameId, player2: p2 }),
      });
      const j = await r.json();
      if (!j.success) throw new Error(j.error || "join-game failed");
      setStatus("Join markiert (ohne Zahlung).");
    } catch (e: any) {
      setStatus(e?.message || "Fehler bei Join ohne Zahlung");
    }
  };

  // NEU: Zweiten Stake einzahlen (Extra-Deposit)
  const handleExtraStake = async () => {
    if (!gameId) {
      setStatus("Bitte eine Game-ID eingeben.");
      return;
    }
    try {
      await pay(0.3);
      setStatus("Zweite Zahlung ok.");
    } catch (e: any) {
      setStatus(e?.message || "Fehler bei zweiter Zahlung");
    }
  };

  // Auszahlen: Spieler 1 gewinnt
  const handleSettleP1 = async () => {
    if (!gameId) {
      setStatus("Bitte eine Game-ID eingeben.");
      return;
    }
    try {
      setStatus("Settle: Spieler 1 ...");
      const r = await fetch("/api/settle-game", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gameId, winner: "p1" }),
      });
      const j = await r.json();
      if (!j.success) throw new Error(j.error || "settle-game failed");
      setStatus("Ausgezahlt an Spieler 1.");
    } catch (e: any) {
      setStatus(e?.message || "Fehler bei Settle P1");
    }
  };

  // Auszahlen: Spieler 2 gewinnt
  const handleSettleP2 = async () => {
    if (!gameId) {
      setStatus("Bitte eine Game-ID eingeben.");
      return;
    }
    try {
      setStatus("Settle: Spieler 2 ...");
      const r = await fetch("/api/settle-game", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gameId, winner: "p2" }),
      });
      const j = await r.json();
      if (!j.success) throw new Error(j.error || "settle-game failed");
      setStatus("Ausgezahlt an Spieler 2.");
    } catch (e: any) {
      setStatus(e?.message || "Fehler bei Settle P2");
    }
  };

  // Unentschieden
  const handleDraw = async () => {
    if (!gameId) {
      setStatus("Bitte eine Game-ID eingeben.");
      return;
    }
    try {
      setStatus("Settle: Unentschieden ...");
      const r = await fetch("/api/settle-draw", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gameId }),
      });
      const j = await r.json();
      if (!j.success) throw new Error(j.error || "settle-draw failed");
      setStatus("Unentschieden ausgezahlt.");
    } catch (e: any) {
      setStatus(e?.message || "Fehler bei Draw");
    }
  };

  return (
    <main className="p-4 space-y-3">
      <h1 className="text-xl font-bold">FAQ • Escrow Schnelltest</h1>
      <div>Escrow Contract: {PAY_TO}</div>
      <div>Deine Wallet: {userAddress ?? "lädt ..."}</div>

      <input
        className="border p-2 w-full"
        placeholder="Game-ID (frei wählbar)"
        value={gameId}
        onChange={(e) => setGameId(e.target.value)}
      />

      {/* Optional: zweite Adresse für Join ohne Zahlung */}
      <input
        className="border p-2 w-full"
        placeholder="(optional) Player-2-Adresse (0x...)"
        value={player2Override}
        onChange={(e) => setPlayer2Override(e.target.value)}
      />

      <div className="flex flex-wrap gap-2">
        <button onClick={handleCreate} className="px-3 py-2 border rounded">
          Host: 0,3 WLD zahlen & GameRecord anlegen
        </button>
        <button onClick={handleJoin} className="px-3 py-2 border rounded">
          Joiner: 0,3 WLD zahlen & Join markieren
        </button>
        <button onClick={handleJoinMarkOnly} className="px-3 py-2 border rounded">
          Nur Join markieren (ohne Zahlung)
        </button>
        <button onClick={handleExtraStake} className="px-3 py-2 border rounded">
          Extra Stake zahlen
        </button>
        <button onClick={handleSettleP1} className="px-3 py-2 border rounded">
          Settle: Spieler 1 gewinnt
        </button>
        <button onClick={handleSettleP2} className="px-3 py-2 border rounded">
          Settle: Spieler 2 gewinnt
        </button>
        <button onClick={handleDraw} className="px-3 py-2 border rounded">
          Settle: Unentschieden
        </button>
      </div>

      <div className="text-sm text-gray-600">{status}</div>
    </main>
  );
}

