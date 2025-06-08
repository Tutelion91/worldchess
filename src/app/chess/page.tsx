// worldchess/app/chess/page.tsx
'use client';

import dynamic from 'next/dynamic';

// Lazily load the main chess application on the client only
const ChessGame = dynamic(() => import('@/App'), { ssr: false });

export default function ChessPage() {
  return (
    <main className="p-4">
      <h1 className="text-2xl font-bold mb-4">Schach</h1>
      <ChessGame />
    </main>
  );
}
