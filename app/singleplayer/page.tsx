"use client";

import { useEffect, useMemo, useState } from "react";
import App from "../../src/App";
import { enableLoopback, disableLoopback, connectSocket, requestState, connectToGame } from "@/websocket";

export default function SingleplayerPage() {
  const [loopbackReady, setLoopbackReady] = useState(false);

  useEffect(() => {
    enableLoopback();   // Loopback einschalten
    connectSocket();    // no-op im Loopback
    setLoopbackReady(true);
    return () => {
      disableLoopback();
      setLoopbackReady(false);
    };
  }, []);

  const game = useMemo(() => ({
    id: "single-" + (typeof crypto !== "undefined" ? crypto.randomUUID() : Math.random().toString(36).slice(2)),
    timeControl: "15+10",
    stake: 0,         // wichtig: verhindert Payments
    started: true,    // sofort „gestartet“
  }), []);

  useEffect(() => {
    if (!loopbackReady) return;
    // Für Singleplayer muss der Loopback-Socket wissen, welche Game-ID aktiv ist
    connectToGame(game.id);
    // Liefert initialen Zustand an den Referee
    requestState(game.id);
  }, [game.id, loopbackReady]);

  if (!loopbackReady) {
    return null;
  }

  return (
    <div className="min-h-screen bg-blue-900 text-white flex items-center justify-center p-4">
      <div className="w-full max-w-[1200px]">
        {/* Du spielst Weiß */}
        <App initialGame={game} playerColor="white" finishGame={() => {}} />
      </div>
    </div>
  );
}

