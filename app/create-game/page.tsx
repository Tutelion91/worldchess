"use client";

import { useState } from "react";

export default function CreateGamePage() {
  const [timeControl, setTimeControl] = useState("15+10");
  const [stake, setStake] = useState(1);

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
          min={0}
          max={10}
          step={0.1}
          value={stake}
          onChange={(e) => setStake(parseFloat(e.target.value))}
          className="w-full"
        />
      </div>

      {/* Button */}
      <button
        onClick={() => {
          const newGame = {id: crypto.randomUUID(),timeControl,stake,};

const existing = JSON.parse(localStorage.getItem("waitingGames") || "[]");
localStorage.setItem("waitingGames", JSON.stringify([...existing, newGame]));

// Weiterleitung
window.location.href = `/waiting-room/${newGame.id}`;
        }}
        className="mt-4 px-6 py-3 bg-green-600 hover:bg-green-700 rounded text-white font-semibold"
      >
        Spiel erstellen
      </button>
    </div>
  );
}

