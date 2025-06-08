"use client";

import dynamic from "next/dynamic";

const ChessGame = dynamic(() => import("@/App"), { ssr: false });

const dummyGame = {
  id: "local",
  timeControl: "0",
  stake: 0,
  started: true,
};

export default function Page() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4">
      <ChessGame initialGame={dummyGame} playerColor="white" />
    </main>
  );
}
