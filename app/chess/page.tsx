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
// app/page.tsx
import React from "react";

export default function Page() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-gray-900 via-gray-800 to-black text-white">
      {/* Rotierende Weltkugel */}
      <div
        className="rounded-full bg-cover shadow-inner w-64 h-64 md:w-80 md:h-80"
        style={{
          backgroundImage: "url('/world-map.jpg')",
          animation: "spinEarth 20s linear infinite"
        }}
      />
      {/* Button-Gruppe */}
      <div className="mt-8 w-4/5 max-w-md flex flex-col space-y-4">
        <button className="w-full bg-gray-800 hover:bg-gray-700 text-white font-semibold py-3 px-4 rounded-lg">
          FAQ
        </button>
        <button className="w-full bg-gray-800 hover:bg-gray-700 text-white font-semibold py-3 px-4 rounded-lg">
          Spiel erstellen
        </button>
        <button className="w-full bg-gray-800 hover:bg-gray-700 text-white font-semibold py-3 px-4 rounded-lg">
          Wartende Spiele
        </button>
      </div>

      {/* Globale CSS für Keyframe-Animation */}
      <style jsx global>{`
        @keyframes spinEarth {
          from { background-position: 0% 0; }
          to   { background-position: 100% 0; }
        }
      `}</style>
    </div>
  );
}
