"use client";

import dynamic from "next/dynamic";

const ChessGame = dynamic(() => import("@/App"), { ssr: false });


export default function Page() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4">
      <ChessGame />
    </main>
  );
}
