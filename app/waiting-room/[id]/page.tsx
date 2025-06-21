"use client";
import { useEffect, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import { connectToGame, onMessage } from "@/websocket";
import Link from "next/link";

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
    <div className="min-h-screen bg-blue-900 text-white flex flex-col items-center justify-center space-y-4">
      <p>Warte auf Gegner…</p>
      <Link
        href="/"
        className="px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded text-white font-semibold"
      >
        Zurück
      </Link>
    </div>
  );
}

