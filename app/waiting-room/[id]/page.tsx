"use client";

import { useEffect } from "react";
import { useParams } from "next/navigation";
import { useRouter } from "next/navigation";

export default function WaitingRoomPage() {
  const { id } = useParams();
  const router = useRouter();

  // Lösche das Spiel beim Verlassen der Seite
useEffect(() => {
  // Spiel löschen, wenn Seite verlassen wird
  const handleBeforeUnload = () => {
    const existing = JSON.parse(localStorage.getItem("waitingGames") || "[]");
    const updated = existing.filter((g: any) => g.id !== id);
    localStorage.setItem("waitingGames", JSON.stringify(updated));
  };

  window.addEventListener("beforeunload", handleBeforeUnload);

  // Alle 1 Sekunde prüfen, ob Spiel gestartet wurde
  const interval = setInterval(() => {
    const joinedGame = localStorage.getItem(`game-${id}`);
    if (joinedGame) {
      clearInterval(interval);
      window.location.href = `/game/${id}`;
    }
  }, 1000);

  return () => {
    handleBeforeUnload();
    window.removeEventListener("beforeunload", handleBeforeUnload);
    clearInterval(interval);
  };
}, [id]);


  return (
    <div className="min-h-screen bg-blue-900 text-white flex flex-col items-center justify-center space-y-6">
      <div className="w-16 h-16 border-4 border-blue-400 border-t-transparent rounded-full animate-spin"></div>
      <h1 className="text-xl font-semibold text-center px-6">
        Please wait until another player joins your game...
      </h1>
    </div>
  );
}

