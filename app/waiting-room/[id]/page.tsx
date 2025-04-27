"use client";

import { useEffect } from "react";
import { useParams } from "next/navigation";
import { useRouter } from "next/navigation";
import { connectSocket, sendMessage, onMessage, connectToGame } from "@/websocket";

export default function WaitingRoomPage() {
  const { id } = useParams();
  const router = useRouter();

  // Lösche das Spiel beim Verlassen der Seite
useEffect(() => {
   console.log("[waiting-room] connect & join", id);
   connectSocket();
   //sendMessage({ type: "join", gameId: id });
   connectToGame(id);
     let gameCreated = false;
  onMessage((msg) => {
    if (msg.type === "game-created") {
      gameCreated = true;
      //sendMessage({ type: "join", gameId: id });
    }
    if (msg.type === "start") {
      console.log("[waiting-room] Spiel startet!", msg.color);
      router.push(`/game/${id}`);
     }
   });
   
  // Spiel löschen, wenn Seite verlassen wird
  const handleBeforeUnload = () => {
    const existing = JSON.parse(localStorage.getItem("waitingGames") || "[]");
    const updated = existing.filter((g: any) => g.id !== id);
    localStorage.setItem("waitingGames", JSON.stringify(updated));
  };

  window.addEventListener("beforeunload", handleBeforeUnload);


  return () => {
    handleBeforeUnload();
    window.removeEventListener("beforeunload", handleBeforeUnload);
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

