"use client";

import { useEffect, useState } from "react";

type WaitingGame = {
  id: string;
  timeControl: string;
  stake: number;
};

export default function WaitingGamesPage() {
  const [games, setGames] = useState<WaitingGame[]>([]);

  useEffect(() => {
    const raw = localStorage.getItem("waitingGames");
    if (raw) {
      setGames(JSON.parse(raw));
    }
  }, []);

  const handleJoin = (selectedGame: WaitingGame) => {
    const existing = JSON.parse(localStorage.getItem("waitingGames") || "[]");

    // Entferne das Spiel aus der Warteliste
    const updated = existing.filter((g: any) => g.id !== selectedGame.id);
    localStorage.setItem("waitingGames", JSON.stringify(updated));

    // Spielerfarben zufällig zuweisen
    const color = Math.random() < 0.5 ? "white" : "black";
    const gameData = {
      ...selectedGame,
      player1: color === "white" ? "you" : "opponent",
      player2: color === "white" ? "opponent" : "you",
      color,
    };

    // Spiel-Daten speichern
    localStorage.setItem(`game-${selectedGame.id}`, JSON.stringify(gameData));

    // Weiterleitung ins Spiel
    window.location.href = `/game/${selectedGame.id}`;
  };

  return (
    <div className="min-h-screen bg-blue-900 text-white p-8">
      <h1 className="text-2xl font-bold mb-6 text-center">Wartende Spiele</h1>

      {games.length === 0 ? (
        <p className="text-center text-gray-300">Keine Spiele verfügbar.</p>
      ) : (
        <ul className="space-y-4 max-w-md mx-auto">
          {games.map((game) => (
            <li key={game.id} className="p-4 bg-gray-800 rounded shadow">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-lg font-semibold">{game.timeControl}</p>
                  <p className="text-sm text-gray-300">{game.stake} WLD</p>
                </div>
                <button
                  className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded text-white font-semibold"
                  onClick={() => handleJoin(game)}
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

