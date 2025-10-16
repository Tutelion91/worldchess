"use client";

import { useState, useEffect } from "react";
import { connectSocket, sendMessage, onMessage } from "@/websocket";
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { MiniKit, tokenToDecimals, Tokens, PayCommandInput } from "@worldcoin/minikit-js";

export default function CreateGamePage() {
  const [timeControl, setTimeControl] = useState("15+10");
  const [stake, setStake] = useState(1);
  const router = useRouter();
  // A1) Component‑Mount: WS‑Verbindung anstoßen
  useEffect(() => {
    console.log("[create-game] Mount → connectSocket()");
    connectSocket();
    const offMsg = onMessage((msg) => {
      if (msg.type === "new-game-ack") {
        console.log("[create-game] Bestätigung vom Server erhalten, Weiterleitung...");
        router.push(`/waiting-room/${msg.gameId}`);
      }
    });
    return () => {
      offMsg();
    };
  }, [router]);

  const handleCreate = async () => {
    const newGame = {
      id: crypto.randomUUID(),
      timeControl,
      stake,
    };

    console.log("[create-game] Button geklickt, newGame:", newGame);

    // optional: localStorage
    const existing = JSON.parse(localStorage.getItem("waitingGames") || "[]");
    localStorage.setItem("waitingGames", JSON.stringify([...existing, newGame]));

    const payStake = async () => {
      const key = `stakePaid-${newGame.id}`;
      if (typeof window === "undefined") {
        return false;
      }
      if (localStorage.getItem(key)) {
        return true;
      }

      const res = await fetch('/api/initiate-pay', { method: 'POST' });
      const { id: reference } = await res.json();

      const payload: PayCommandInput = {
        reference,
        to: process.env.NEXT_PUBLIC_PAY_TO!,
        tokens: [
          {
            symbol: Tokens.WLD,
            token_amount: tokenToDecimals(newGame.stake, Tokens.WLD).toString(),
          },
        ],
        description: `Stake payment for game ${newGame.id}`,
      };

      if (!MiniKit.isInstalled()) {
        return false;
      }

      const { finalPayload } = await MiniKit.commandsAsync.pay(payload);
      if ('from' in finalPayload && finalPayload.from) {
        try {
          localStorage.setItem("userAddress", finalPayload.from);
        } catch {}
      }

      const confirmRes = await fetch('/api/confirm-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ payload: finalPayload }),
      });
      const { success } = await confirmRes.json();
      if (!success) {
        alert('Payment failed. Bitte erneut versuchen.');
        return false;
      }

      localStorage.setItem(key, 'true');
      return true;

    };

    const paid = await payStake();
    if (!paid) {
      return;
    }

    const hostAddress = localStorage.getItem("userAddress");
    if (!hostAddress) {
      alert('Wallet address nicht gefunden. Bitte erneut versuchen.');
      return;
    }

    // A2) WS‑Nachricht senden
    console.log("[create-game] sende WS new-game");
    sendMessage({ type: "new-game", payload: { ...newGame, hostAddress } });

    // A3) Weiterleitung
//    window.location.href = `/waiting-room/${newGame.id}`;
  };

  return (
    <div className="min-h-screen bg-blue-900 text-white p-8 flex flex-col items-center space-y-8">
      <h1 className="text-2xl font-bold">Spiel erstellen</h1>

      {/* Zeitkontrolle */}
      <div className="space-y-2">
        <p className="text-lg font-semibold">Zeitmodus:</p>
        <div className="flex gap-4">
          <button
            className={`px-4 py-2 rounded ${
              timeControl === "15+10" ? "bg-blue-600" : "bg-gray-700"
            }`}
            onClick={() => setTimeControl("15+10")}
          >
            15 + 10
          </button>
          <button
            className={`px-4 py-2 rounded ${
              timeControl === "3+2" ? "bg-blue-600" : "bg-gray-700"
            }`}
            onClick={() => setTimeControl("3+2")}
          >
            3 + 2
          </button>
        </div>
      </div>

      {/* Einsatz */}
      <div className="space-y-2 w-full max-w-xs">
        <label htmlFor="stake" className="text-lg font-semibold">
          WLD-Einsatz: {stake}
        </label>
        <input
          type="range"
          id="stake"
          min={0.5}
          max={10}
          step={0.5}
          value={stake}
          onChange={(e) => setStake(parseFloat(e.target.value))}
          className="w-full"
        />
      </div>

      {/* Button */}
      <button
        onClick={handleCreate}
        className="mt-4 px-6 py-3 bg-green-600 hover:bg-green-700 rounded text-white font-semibold"
      >
        Spiel erstellen
      </button>
      <Link
        href="/"
        className="px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded text-white font-semibold"
      >
        Zurück
      </Link>
    </div>
  );
}

