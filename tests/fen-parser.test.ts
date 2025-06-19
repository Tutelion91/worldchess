import { parseFen } from '@/utils/fen';
import { PieceType, TeamType } from '@/Types';
import { Pawn } from '@/models/Pawn';

describe('parseFen', () => {
  test('parses starting position', () => {
    const board = parseFen('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');
    expect(board.pieces.length).toBe(32);
    const whiteKing = board.pieces.find(p => p.type === PieceType.KING && p.team === TeamType.OUR)!;
    expect(whiteKing.hasMoved).toBe(false);
    const rook = board.pieces.find(p => p.type === PieceType.ROOK && p.team === TeamType.OUR && p.position.x === 7)!;
    expect(rook.hasMoved).toBe(false);
    expect(board.totalTurns).toBe(1);
  });

  test('marks en passant pawn', () => {
    const board = parseFen('rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1');
    const pawn = board.pieces.find(p => p.position.x === 4 && p.position.y === 3) as Pawn;
    expect(pawn).toBeDefined();
    expect(pawn.enPassant).toBe(true);
    expect(board.currentTeam).toBe(TeamType.OPPONENT);
  });

  test('no castling rights sets hasMoved', () => {
    const board = parseFen('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w - - 0 1');
    const king = board.pieces.find(p => p.type === PieceType.KING && p.team === TeamType.OUR)!;
    expect(king.hasMoved).toBe(true);
    const rook = board.pieces.find(p => p.type === PieceType.ROOK && p.team === TeamType.OUR && p.position.x === 7)!;
    expect(rook.hasMoved).toBe(true);
  });
});
