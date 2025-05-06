"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { connectSocket, onMessage } from "@/websocket";
import App from "../../../src/App";

export default function GamePage() {
  const { id } = useParams();
  const [game, setGame] = useState<{ id: string; timeControl: string; stake: number; started: boolean; } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    connectSocket();
    // HTTP-Fallback
    fetch(`http://localhost:3001/games/${id}`)
      .then(res => {
        if (!res.ok) throw new Error("Spiel nicht gefunden");
        return res.json();
      })
      .then(data => setGame(data))
      .catch(() => {});

    const off = onMessage((msg) => {
      if (msg.type === "start") {
        setGame(msg.payload);
        localStorage.setItem("worldchess-color", msg.color);
        console.log(localStorage.getItem("worldchess-color"));
      }
      if (msg.type === "error") {
        setError(msg.message);
      }
    });
    return () => off();
  }, [id]);

  if (error) return <p>Fehler: {error}</p>;
  if (!game) return <p>Spiel wird geladen…</p>;
  if (!game.started) return <p>Warte auf Gegner…</p>;

  return <App initialGame={game} />;
}

