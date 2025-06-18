"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { connectSocket, onMessage, requestState } from "@/websocket";
import App from "../../../src/App";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

interface Game {
  id: string;
  timeControl: string;
  stake: number;
  started: boolean;
}

export default function GamePage() {
  const { id } = useParams();
  const [game, setGame] = useState<{ id: string; timeControl: string; stake: number; started: boolean; } | null>(null);
  const [playerColor, setPlayerColor] = useState<"white" | "black" | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem("worldchess-color");
    if (stored === "white" || stored === "black") {
      setPlayerColor(stored);
    }
  }, []);

  useEffect(() => {
    connectSocket();
    requestState(id as string);
    // HTTP-Fallback
    fetch(`${API_URL}/games/${id}`)
      .then(res => {
        if (!res.ok) throw new Error("Spiel nicht gefunden");
        return res.json();
      })
      .then(data => setGame(data))
      .catch(() => {});

    const off = onMessage((msg) => {
      if (msg.type === "start") {
        setGame(msg.payload);
        setPlayerColor(msg.color);
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
  if (!game.started || !playerColor) return <p>Warte auf Gegner…</p>;

  return <App initialGame={game} playerColor={playerColor} />;
}

