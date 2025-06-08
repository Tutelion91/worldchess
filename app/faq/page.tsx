"use client";
import Link from "next/link";

export default function FAQPage() {
  return (
    <div className="min-h-screen bg-blue-900 text-white p-8 flex flex-col items-center space-y-6">
      <h1 className="text-2xl font-bold">FAQ</h1>
      <p className="max-w-prose text-center">
        Hier findest du Antworten auf häufig gestellte Fragen rund um WorldChess.
      </p>
      <Link
        href="/"
        className="mt-8 px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded text-white font-semibold"
      >
        Zurück
      </Link>
    </div>
  );
}
