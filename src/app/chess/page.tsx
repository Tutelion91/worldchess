// worldchess/app/chess/page.tsx
'use client';

import { Game } from '@/components/Game';

export default function ChessPage() {
  return (
    <main className="p-4">
      <h1 className="text-2xl font-bold mb-4">Schach</h1>
      <Game />
    </main>
  );
}
