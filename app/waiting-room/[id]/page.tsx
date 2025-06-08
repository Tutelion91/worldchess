"use client";
import { useEffect, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import { connectToGame, onMessage } from "@/websocket";

export default function WaitingRoom() {
  const params = useParams();
  const id = params.id as string;
  const router = useRouter();
  const hasJoinedRef = useRef(false);

  useEffect(() => {
    if (!hasJoinedRef.current) {
      connectToGame(id);
      hasJoinedRef.current = true;
    }

    const off = onMessage((msg) => {
      if (msg.type === "start") {
        if (msg.color) {
          localStorage.setItem("worldchess-color", msg.color);
        }
        router.push(`/game/${id}`);
      }
      if (msg.type === "error") {
        console.error("Join-Error:", msg.message);
      }
    });
    return () => off();
  }, [id, router]);

  return (
    <div className="min-h-screen bg-blue-900 text-white flex items-center justify-center">
      <p>Warte auf Gegner…</p>
    </div>
  );
}

