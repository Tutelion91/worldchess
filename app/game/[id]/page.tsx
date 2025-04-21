"use client";
import { connectToGame, sendMove, setGameId } from "@/src/websocket";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import App from "../../../src/App";

export default function GamePage() {
  const params = useParams();
  const id = params?.id as string;

  const [game, setGame] = useState<any>(null);

  useEffect(() => {
    connectToGame(id);
    const stored = localStorage.getItem(`game-${id}`);
    if (stored) {
      const data = JSON.parse(stored);
      setGame(data);

      if (data.player1 === "you") {
        localStorage.setItem("worldchess-role", "player1");
        localStorage.setItem("worldchess-color", data.color);
      } else {
        localStorage.setItem("worldchess-role", "player2");
        localStorage.setItem(
          "worldchess-color",
          data.color === "white" ? "black" : "white"
        );
      }
    }
  }, [id]);


if (!game) {
  return (
    <div className="min-h-screen bg-blue-900 text-white flex items-center justify-center">
      <p className="text-xl">Spiel wird geladen...</p>
    </div>
  );
}

return (
  <div className="min-h-screen bg-blue-900 text-white p-6 space-y-6">
    <h1 className="text-2xl font-bold text-center">Spiel #{id}</h1>
    <div className="flex justify-between max-w-md mx-auto">
      <div>
        <p className="text-lg font-semibold">{game.player1}</p>
        <p className="text-sm text-gray-300">Zeit: 15:00</p>
      </div>
      <div className="text-center">
        <p className="text-lg">vs</p>
      </div>
      <div>
        <p className="text-lg font-semibold">{game.player2}</p>
        <p className="text-sm text-gray-300">Zeit: 15:00</p>
      </div>
    </div>
    <p className="text-center">Einsatz: {game.stake} WLD</p>

    {/* Das eigentliche Spiel */}
    <App />
  </div>
);
}
