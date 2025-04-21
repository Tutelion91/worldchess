"use client";

import App from "@/App";

export default function SingleplayerPage() {
  return (
    <div className="min-h-screen bg-blue-900 text-white p-6">
      <h1 className="text-2xl font-bold text-center mb-6">Einzelspiel-Modus</h1>
      <div className="flex justify-center">
        <App />
      </div>
    </div>
  );
}

