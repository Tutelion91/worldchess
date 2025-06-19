import { Board } from '@/models/Board';
import { Pawn } from '@/models/Pawn';
import { Piece } from '@/models/Piece';
import { Position } from '@/models/Position';
import { PieceType, TeamType } from '@/Types';

describe('Board move logic', () => {
  test('en passant capture removes the captured pawn', () => {
    const whitePawn = new Pawn(new Position(4, 4), TeamType.OUR, false);
    const blackPawn = new Pawn(new Position(5, 6), TeamType.OPPONENT, false);
    const whiteKing = new Piece(new Position(0, 0), PieceType.KING, TeamType.OUR, false);
    const blackKing = new Piece(new Position(7, 7), PieceType.KING, TeamType.OPPONENT, false);
    const board = new Board([whitePawn, blackPawn, whiteKing, blackKing], 1);
    board.calculateAllMoves();

    // Black pawn double step to enable en passant
    board.playMove(false, true, blackPawn, new Position(5, 4));
    board.totalTurns += 1;
    board.calculateAllMoves();

    // White pawn captures en passant
    const success = board.playMove(true, true, whitePawn, new Position(5, 5));
    expect(success).toBe(true);

    // Captured pawn should be removed
    expect(board.pieces.some(p => p.position.x === 5 && p.position.y === 4)).toBe(false);
    expect(whitePawn.position.x).toBe(5);
    expect(whitePawn.position.y).toBe(5);
  });

  test('castling via king move updates king and rook positions', () => {
    const king = new Piece(new Position(4, 0), PieceType.KING, TeamType.OUR, false);
    const rook = new Piece(new Position(7, 0), PieceType.ROOK, TeamType.OUR, false);
    const blackKing = new Piece(new Position(4, 7), PieceType.KING, TeamType.OPPONENT, false);
    const board = new Board([king, rook, blackKing], 1);
    board.calculateAllMoves();

    const success = board.playMove(false, true, king, new Position(6, 0));
    expect(success).toBe(true);

    // King should end up on g1 (6,0) and rook on f1 (5,0)
    expect(king.position.x).toBe(6);
    expect(rook.position.x).toBe(5);
    expect(king.hasMoved).toBe(true);
    expect(rook.hasMoved).toBe(true);
  });
});
