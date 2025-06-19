export interface ServerMove {
  from: { x: number; y: number };
  to: { x: number; y: number };
  promotion?: string;
}

import { Board } from '@/models/Board';
import { TeamType } from '@/Types';

export function isServerEnPassant(move: ServerMove, board: Board): boolean {
  const piece = board.pieces.find(
    (p) => p.position.x === move.from.x && p.position.y === move.from.y
  );
  if (!piece || !piece.isPawn) return false;

  const direction = piece.team === TeamType.OUR ? 1 : -1;
  const diagonal = Math.abs(move.to.x - move.from.x) === 1;
  const forward = move.to.y - move.from.y === direction;
  const targetEmpty = !board.pieces.some(
    (p) => p.position.x === move.to.x && p.position.y === move.to.y
  );

  return diagonal && forward && targetEmpty;
}
