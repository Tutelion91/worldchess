"use client";

import App from "@/App";

const dummyGame = {
  id: "local",
  timeControl: "0",
  stake: 0,
  started: true,
};

export default function SingleplayerPage() {
  const finishGame = () => {};
  return (
    <div className="min-h-screen bg-blue-900 text-white p-6">
      <h1 className="text-2xl font-bold text-center mb-6">Einzelspiel-Modus</h1>
      <div className="flex justify-center">
        <App initialGame={dummyGame} playerColor="white" finishGame={finishGame} />
      </div>
    </div>
  );
}

