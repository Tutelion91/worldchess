"use client";

import { useEffect, useState } from "react";
import { onMessage, sendMessage } from "@/websocket";

type WaitingGame = {
  id: string;
  timeControl: string;
  stake: number;
};

export default function WaitingGamesPage() {
  const [games, setGames] = useState<WaitingGame[]>([]);

  useEffect(() => {
  fetch("http://localhost:3001/games")
      .then((res) => res.json())
      .then((data) => setGames(data))
      .catch((err) => console.error("Fehler beim Laden der Spiele:", err));

  // Nachrichten vom Server empfangen
  onMessage((msg) => {
    if (msg.type === "new-game") {
      setGames((prev) => [...prev, msg.payload]);
    }
    if (msg.type === "waiting-games") {
      setGames(msg.payload);
    }
  });

  // Direkt beim Start nach wartenden Spielen fragen
  sendMessage({ type: "get-waiting-games" });
}, []);

  const handleJoin = (selectedGame: WaitingGame) => {
    const existing = JSON.parse(localStorage.getItem("waitingGames") || "[]");

    // Entferne das Spiel aus der lokalen Warteliste
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

