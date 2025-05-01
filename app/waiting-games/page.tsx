"use client";
import { useEffect, useState } from "react";
import { connectSocket, onMessage } from "@/websocket";

type WaitingGame = { id: string; timeControl: string; stake: number; };

export default function WaitingGamesPage() {
  const [games, setGames] = useState<WaitingGame[]>([]);

  useEffect(() => {
    // Initiale Liste via HTTP
    fetch("http://localhost:3001/games")
      .then(res => res.json())
      .then((data: WaitingGame[]) => setGames(data))
      .catch(console.error);

    // WebSocket-Updates
    connectSocket();
    const off = onMessage((msg) => {
      if (msg.type === "new-game") {
        setGames(prev => [...prev, msg.payload]);
      }
      if (msg.type === "game-started") {
        setGames(prev => prev.filter(g => g.id !== msg.gameId));
      }
    });
    return () => off();
  }, []);

  const handleJoin = (g: WaitingGame) => window.location.href = `/waiting-room/${g.id}`;

  return (
    <div>
      <h1>Wartende Spiele</h1>
      {games.length === 0 ? (
        <p>Keine Spiele verfügbar.</p>
      ) : (
        <ul>
          {games.map(g => (
            <li key={g.id}>
              <strong>{g.timeControl}</strong> – {g.stake} WLD
              <button onClick={() => handleJoin(g)}>Beitreten</button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

