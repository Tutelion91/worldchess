"use client";
import {
  connectSocket,
  connectToGame,
  onMessage,
  sendMove,
  setGameId
} from "@/websocket";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import App from "../../../src/App";


//type Game = {
//  id: string;
//  player1: string;
//  player2: string;
//  stake: number;
//  started: boolean;
//};

export default function GamePage() {
  const { id } = useParams() as { id: string };
  const [game, setGame] = useState<Game | null>(null);

  useEffect(() => {
    // 1) WS initial aufbauen und Listener ANMELDEN
    console.log("Current game state:", game);
    connectSocket();
    const offMsg = onMessage((data: any) => {
      console.log("[WS] received:", data);

      if (data.type === "start") {
        // payload enthält: id, player1, player2, stake, started
        console.log("Start event received with payload:", data.payload);
        setGame(data.payload );
      }

      // Move-Events direkt ans Referee/Board weiterleiten
      if (data.type === "move") {
        // sendMove fürs lokale Update ignorieren (Referee nutzt onMove)
      }
            if (data.type === "player") {
        console.log("[WS] player info received:", data.payload);
        setPlayer(data.payload);
      }
            if (data.type === "error") {
        console.error("[WS] error received:", data.message);
        setError(data.message);
      }
    });

    // 2) Direkt beim Mount initial per HTTP holen, falls man
    //    als Ersteller schon alle Daten hat
    fetch("http://localhost:3001/games")
      .then(res => res.json())
      .then((list: Game[]) => {
        const found = list.find(g => g.id === id);
        if (found) setGame(found);
      })
      .catch(console.error);

    // 3) Spiel joinen
    connectToGame(id);
    setGameId(id);

    // Cleanup beim Unmount
    return () => {
      offMsg();
    };
  }, [id]);

//  4) UI-Zustände
  if (!game) {
    return (
      <div className="min-h-screen bg-blue-900 text-white flex items-center justify-center">
        <p className="text-xl">Spiel wird geladen…</p>
      </div>
    );
  }
  if (!game.started) {
    return (
      <div className="min-h-screen bg-blue-900 text-white flex items-center justify-center">
        <p className="text-xl">Warte auf Gegner…</p>
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

      {/* Euer Schachbrett */}
      <App />
    </div>
  );
}

