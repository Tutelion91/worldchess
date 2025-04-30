"use client";
import {
  connectSocket,
  connectToGame,
  onMessage,
  sendMove,
  sendMessage,
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
  const [error, setError] = useState(null);
  
  useEffect(() => {
    // 1) WS initial aufbauen und Listener ANMELDEN
    console.log("GamePage component mounted with gameId:", id); // Hinzugefügt
    console.log("Current game state:", game);
    //connectSocket();
    //sendMessage({ type: "join", gameId: id });
    const offMsg = onMessage((data: any) => {
      console.log("[WS] received:", data);
      console.log("[DEBUG GamePage] WS message:", msg);

      if (data.type === "start") {
        // payload enthält: id, player1, player2, stake, started
        console.log("Start event received with payload:", data.payload);
        console.log("[DEBUG GamePage] ‹start›-Payload:", msg.payload, "Farbe:", msg.color);
        router.push(`/game/${id}`);
        //setGame(data.payload );
      }

      // Move-Events direkt ans Referee/Board weiterleiten
      if (data.type === "move") {
        // sendMove fürs lokale Update ignorieren (Referee nutzt onMove)
        console.log("[WS] move event received (ignored in GamePage)"); // Hinzugefügt
      }
      if (data.type === "player") {
        console.log("[WS] player info received:", data.payload);
        //setPlayer(data.payload); // auskommentiert, da setPlayer nicht definiert ist
      }
      if (data.type === "error") {
        console.error("[WS] error received:", data.message);
        setError(data.message);
      }
    });

    // 2) Direkt beim Mount initial per HTTP holen, falls man
    //    als Ersteller schon alle Daten hat
    console.log("Fetching game data from API..."); // Hinzugefügt
    fetch("http://localhost:3001/games")
      .then(res => {
        console.log("API response:", res); // Hinzugefügt
        return res.json();
      })
      .then((list: Game[]) => {
        console.log("Games list from API:", list); // Hinzugefügt
        const found = list.find(g => g.id === id);
        if (found) {
          console.log("Found game:", found); // Hinzugefügt
          setGame(found);
        } else {
          console.log("Game not found with id:", id); // Hinzugefügt
        }
      })
      .catch(err => {
        console.error("Error fetching game data:", err); // Hinzugefügt
      });

    // 3) Spiel joinen
    //console.log("Joining game with id:", id); // Hinzugefügt
    //connectToGame(id);
    //setGameId(id);

    // Cleanup beim Unmount
    return () => {
      console.log("GamePage component unmounted"); // Hinzugefügt
      offMsg();
    };
  }, [id]);

  //  4) UI-Zustände
  if (!game) {
    return (
      <div className="min-h-screen bg-blue-900 text-white flex items-center justify-center">
        <p className="text-xl">Spiel wird geladen…</p>
        {error && <p className="text-red-500 ml-4">Error: {error}</p>} {/* Hinzugefügt */}
      </div>
    );
  }
  if (!game.started) {
    return (
      <div className="min-h-screen bg-blue-900 text-white flex items-center justify-center">
        <p className="text-xl">Warte auf Gegner…</p>
        {error && <p className="text-red-500 ml-4">Error: {error}</p>} {/* Hinzugefügt */}
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
