"use client";

import { useEffect, useMemo } from "react";
import App from "../../src/App";
import { enableLoopback, connectSocket, requestState } from "@/websocket";

export default function SingleplayerPage() {
  useEffect(() => {
    enableLoopback();   // Loopback einschalten
    connectSocket();    // no-op im Loopback
  }, []);

  const game = useMemo(() => ({
    id: "single-" + (typeof crypto !== "undefined" ? crypto.randomUUID() : Math.random().toString(36).slice(2)),
    timeControl: "15+10",
    stake: 0,         // wichtig: verhindert Payments
    started: true,    // sofort „gestartet“
  }), []);

  useEffect(() => {
    // Liefert initialen Zustand an den Referee
    requestState(game.id);
  }, [game.id]);

  return (
    <div className="min-h-screen bg-blue-900 text-white flex items-center justify-center p-4">
      <div className="w-full max-w-[1200px]">
        {/* Du spielst Weiß */}
        <App initialGame={game} playerColor="white" />
      </div>
    </div>
  );
}

