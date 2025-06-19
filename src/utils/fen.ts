import { Board } from '../models/Board';
import { Pawn } from '../models/Pawn';
import { Piece } from '../models/Piece';
import { Position } from '../models/Position';
import { PieceType, TeamType } from '../Types';
import { symbolToPieceType } from './pieceSymbols';

export function parseFen(fen: string): Board {
  const [placement, activeColor, castling, enPassant, , fullmove] = fen.split(" ");

  const pieces: Piece[] = [];
  const rows = placement.split('/');

  for (let row = 0; row < 8; row++) {
    const y = 7 - row;
    const rowString = rows[row];
    let x = 0;
    for (const char of rowString) {
      if (char >= '1' && char <= '8') {
        x += parseInt(char, 10);
        continue;
      }
      const type = symbolToPieceType(char);
      if (!type) continue;
      const team = char === char.toUpperCase() ? TeamType.OUR : TeamType.OPPONENT;
      const pos = new Position(x, y);

      let hasMoved = true;
      if (type === PieceType.PAWN) {
        const startRow = team === TeamType.OUR ? 1 : 6;
        hasMoved = y !== startRow;
        pieces.push(new Pawn(pos, team, hasMoved));
      } else {
        if (type === PieceType.KING) {
          const startRow = team === TeamType.OUR ? 0 : 7;
          const rights = team === TeamType.OUR ? castling.includes('K') || castling.includes('Q') : castling.includes('k') || castling.includes('q');
          hasMoved = !(rights && x === 4 && y === startRow);
        } else if (type === PieceType.ROOK) {
          const startRow = team === TeamType.OUR ? 0 : 7;
          if (team === TeamType.OUR) {
            if (x === 0 && y === startRow) {
              hasMoved = !castling.includes('Q');
            } else if (x === 7 && y === startRow) {
              hasMoved = !castling.includes('K');
            }
          } else {
            if (x === 0 && y === startRow) {
              hasMoved = !castling.includes('q');
            } else if (x === 7 && y === startRow) {
              hasMoved = !castling.includes('k');
            }
          }
        } else {
          const startRow = team === TeamType.OUR ? 0 : 7;
          hasMoved = y !== startRow;
        }
        pieces.push(new Piece(pos, type, team, hasMoved));
      }
      x += 1;
    }
  }

  const full = parseInt(fullmove, 10);
  const totalTurns = (full - 1) * 2 + (activeColor === 'w' ? 1 : 2);
  const board = new Board(pieces, totalTurns);

  if (enPassant && enPassant !== '-') {
    const files = 'abcdefgh';
    const epX = files.indexOf(enPassant[0]);
    const epY = parseInt(enPassant[1], 10) - 1;
    if (epX !== -1 && epY >= 0) {
      const lastMover = activeColor === 'w' ? TeamType.OPPONENT : TeamType.OUR;
      const pawnY = epY + (lastMover === TeamType.OUR ? 1 : -1);
      const pawn = board.pieces.find(p => p.isPawn && p.team === lastMover && p.position.x === epX && p.position.y === pawnY) as Pawn | undefined;
      if (pawn) pawn.enPassant = true;
    }
  }

  board.calculateAllMoves();
  return board;
}
