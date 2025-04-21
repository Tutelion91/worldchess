"use client";

import { useEffect, useState } from "react";
import { connectSocket, onMessage, requestWaitingGames } from "@/websocket";

type WaitingGame = {
  id: string;
  timeControl: string;
  stake: number;
};

export default function WaitingGamesPage() {
  const [games, setGames] = useState<WaitingGame[]>([]);

  useEffect(() => {
    // 1) Socket aufbauen
    connectSocket();

    // 2) WS‑Handler registrieren
    onMessage((msg) => {
      if (msg.type === "waiting-games") {
        setGames(msg.payload);
      }
      if (msg.type === "new-game") {
        setGames((prev) => [...prev, msg.payload]);
      }
      if (msg.type === "game-started") {
        setGames((prev) => prev.filter((g) => g.id !== msg.gameId));
      }
    });

    // 3) initiale Liste anfragen
    requestWaitingGames();
  }, []);

  const handleJoin = (game: WaitingGame) => {
    window.location.href = `/waiting-room/${game.id}`;
  };

  return (
    <div className="min-h-screen bg-blue-900 text-white p-8">
      <h1 className="text-2xl font-bold mb-6 text-center">Wartende Spiele</h1>
      {games.length === 0 ? (
        <p className="text-center text-gray-300">Keine Spiele verfügbar.</p>
      ) : (
        <ul className="space-y-4 max-w-md mx-auto">
          {games.map((g) => (
            <li key={g.id} className="p-4 bg-gray-800 rounded shadow">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-lg font-semibold">{g.timeControl}</p>
                  <p className="text-sm text-gray-300">{g.stake} WLD</p>
                </div>
                <button
                  className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded text-white font-semibold"
                  onClick={() => handleJoin(g)}
                >
                  Beitreten
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

