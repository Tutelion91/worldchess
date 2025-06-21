"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { connectSocket, connectToGame, onMessage, requestState } from "@/websocket";
import App from "../../../src/App";
import { MiniKit, tokenToDecimals, Tokens, PayCommandInput } from "@worldcoin/minikit-js";
import { useRef } from "react";

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
  const paidRef = useRef(false);

  useEffect(() => {
    const stored = localStorage.getItem("worldchess-color");
    if (stored === "white" || stored === "black") {
      setPlayerColor(stored);
    }
  }, []);

  useEffect(() => {
    connectSocket();
    connectToGame(id as string);
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
      if (msg.type === "state") {
        if (msg.game || msg.payload) {
          const gameData = msg.game ?? msg.payload;
          setGame(gameData);
        }
        if (msg.color) {
          setPlayerColor(msg.color);
          localStorage.setItem("worldchess-color", msg.color);
        }
      }
      if (msg.type === "error") {
        setError(msg.message);
      }
    });
    return () => off();
  }, [id]);

  useEffect(() => {
    const payStake = async () => {
      if (!game || paidRef.current || game.stake === 0) return;
      paidRef.current = true;

      for (let i = 0; i < 2; i++) {
        const res = await fetch('/api/initiate-pay', { method: 'POST' });
        const { id: reference } = await res.json();

        const payload: PayCommandInput = {
          reference,
          to: '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045',
          tokens: [
            {
              symbol: Tokens.WLD,
              token_amount: tokenToDecimals(game.stake, Tokens.WLD).toString(),
            },
          ],
          description: `Stake payment for game ${game.id}`,
        };

        if (!MiniKit.isInstalled()) continue;

        const { finalPayload } = await MiniKit.commandsAsync.pay(payload);
        if (finalPayload.from) {
          try {
            localStorage.setItem("userAddress", finalPayload.from);
          } catch {}
        }

        await fetch('/api/confirm-payment', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(finalPayload),
        });
      }
    };

    payStake();
  }, [game]);

  if (error) return <p>Fehler: {error}</p>;
  if (!game) return <p>Spiel wird geladen…</p>;
  if (!game.started || !playerColor) return <p>Warte auf Gegner…</p>;

  return <App initialGame={game} playerColor={playerColor} />;
}

