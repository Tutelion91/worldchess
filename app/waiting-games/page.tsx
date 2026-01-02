"use client";
import { useEffect, useState } from "react";
import { connectSocket, onMessage, requestGames } from "@/websocket";
import Link from "next/link";
import {
  MiniKit,
  Tokens,
  tokenToDecimals,
  type PayCommandInput,
} from "@worldcoin/minikit-js";

type WaitingGame = { id: string; timeControl: string; stake: number; };

export default function WaitingGamesPage() {
  const [games, setGames] = useState<WaitingGame[]>([]);
  const [joiningGameId, setJoiningGameId] = useState<string | null>(null);
  const [userAddress, setUserAddress] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    connectSocket();
    requestGames();

    // WebSocket-Updates
    const off = onMessage((msg) => {
      if (msg.type === "games-list") {
        setGames(msg.games as WaitingGame[]);
      }
      if (msg.type === "new-game") {
        setGames(prev => [...prev, msg.payload]);
      }
      if (msg.type === "game-started") {
        setGames(prev => prev.filter(g => g.id !== msg.gameId));
      }
    });
    return () => off();
  }, []);

  useEffect(() => {
    const stored = typeof window !== "undefined" ? localStorage.getItem("userAddress") : null;
    if (stored) {
      setUserAddress(stored);
    }
    (async () => {
      try {
        const info = await MiniKit.getUserInfo();
        const addr = (info as any)?.wallet_address || (info as any)?.walletAddress || null;
        if (addr) {
          localStorage.setItem("userAddress", addr);
          setUserAddress(addr);
          return;
        }
        const { finalPayload } = await MiniKit.commandsAsync.walletAuth({ nonce: crypto.randomUUID() });
        const payloadAddr = (finalPayload as any)?.address ?? (finalPayload as any)?.from ?? null;
        if (payloadAddr) {
          localStorage.setItem("userAddress", payloadAddr);
          setUserAddress(payloadAddr);
        }
      } catch (err) {
        console.error("[waiting-games] wallet lookup failed", err);
      }
    })();
  }, []);

  const handleJoin = async (game: WaitingGame) => {
    setError(null);
    setJoiningGameId(game.id);
    try {
      const reference = await fetch("/api/initiate-pay", { method: "POST" })
        .then((r) => r.json())
        .then((j) => j.id as string);
      if (!reference) {
        throw new Error("Konnte Zahlungsreferenz nicht abrufen.");
      }

      const payInput: PayCommandInput = {
        reference,
        to: process.env.NEXT_PUBLIC_PAY_TO!,
        tokens: [{ symbol: Tokens.WLD, token_amount: tokenToDecimals(game.stake, Tokens.WLD).toString() }],
        description: `Stake ${game.stake} WLD für Spiel ${game.id}`,
      };

      const { finalPayload } = await MiniKit.commandsAsync.pay(payInput);

      const payerAddr =
        (finalPayload as any)?.from ??
        (finalPayload as any)?.address ??
        userAddress;

      if (payerAddr) {
        localStorage.setItem("userAddress", payerAddr);
        setUserAddress(payerAddr);
      } else {
        throw new Error("Wallet-Adresse konnte nicht ermittelt werden.");
      }

      const confirmRes = await fetch("/api/confirm-payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(finalPayload),
      });
      const confirmJson = await confirmRes.json();
      if (!confirmRes.ok || !confirmJson?.success) {
        throw new Error(confirmJson?.error || "Zahlungsbestätigung fehlgeschlagen.");
      }

      const joinRes = await fetch("/api/join-game", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gameId: game.id, player2: payerAddr }),
      });
      const joinJson = await joinRes.json();
      if (!joinRes.ok || !joinJson?.success) {
        throw new Error(joinJson?.error || "Join fehlgeschlagen");
      }

      localStorage.setItem(`escrowJoined-${game.id}`, "true");

      window.location.href = `/waiting-room/${game.id}`;
    } catch (err: any) {
      console.error("[waiting-games] join failed", err);
      setError(err?.message || "Beitritt fehlgeschlagen. Bitte erneut versuchen.");
      setJoiningGameId(null);
    }
  };

  return (
    <div className="min-h-screen bg-blue-900 text-white p-8 flex flex-col items-center space-y-4">
      <h1 className="text-2xl font-bold">Wartende Spiele</h1>
      {error && <p className="text-red-300">{error}</p>}
      {games.length === 0 ? (
        <p>Keine Spiele verfügbar.</p>
      ) : (
        <ul className="space-y-2">
          {games.map(g => (
            <li key={g.id} className="flex items-center gap-4">
              <span className="flex-1">
                <strong>{g.timeControl}</strong> – {g.stake} WLD
              </span>
              <button
                className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded text-white"
                onClick={() => handleJoin(g)}
                disabled={joiningGameId === g.id}
              >
                {joiningGameId === g.id ? "Bitte warten..." : "Beitreten"}
              </button>
            </li>
          ))}
        </ul>
      )}
      <Link
        href="/"
        className="mt-6 px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded text-white font-semibold"
      >
        Zurück
      </Link>
    </div>
  );
}
