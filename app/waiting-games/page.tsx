"use client";
import { useEffect, useState } from "react";
import { connectSocket, onMessage, requestGames } from "@/websocket";
import { handleVerify } from "@/utils/verify";
import Link from "next/link";

type WaitingGame = { id: string; timeControl: string; stake: number; };

export default function WaitingGamesPage() {
  const [games, setGames] = useState<WaitingGame[]>([]);

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

  const handleJoin = async (g: WaitingGame) => {
    const verified = await handleVerify();
    if (verified) {
      window.location.href = `/waiting-room/${g.id}`;
    }
  };

  return (
    <div className="min-h-screen bg-blue-900 text-white p-8 flex flex-col items-center space-y-4">
      <h1 className="text-2xl font-bold">Wartende Spiele</h1>
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
              >
                Beitreten
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

