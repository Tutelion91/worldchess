import { Board } from '@/models/Board';
import { Pawn } from '@/models/Pawn';
import { Piece } from '@/models/Piece';
import { Position } from '@/models/Position';
import { PieceType, TeamType } from '@/Types';

describe('server move application', () => {
  test('en passant capture removes the pawn', () => {
    const whitePawn = new Pawn(new Position(4, 4), TeamType.OUR, false);
    const blackPawn = new Pawn(new Position(5, 6), TeamType.OPPONENT, false);
    const whiteKing = new Piece(new Position(0, 0), PieceType.KING, TeamType.OUR, false);
    const blackKing = new Piece(new Position(7, 7), PieceType.KING, TeamType.OPPONENT, false);
    const board = new Board([whitePawn, blackPawn, whiteKing, blackKing], 1);
    board.calculateAllMoves();

    // black pawn double step
    board.playMove(false, true, blackPawn, new Position(5, 4));
    board.totalTurns += 1;
    board.calculateAllMoves();

    const move = { from: { x: 4, y: 4 }, to: { x: 5, y: 5 } };
    const piece = board.pieces.find(
      (p) => p.position.x === move.from.x && p.position.y === move.from.y
    )!;
    const enPassant =
      piece.isPawn &&
      Math.abs(move.to.x - move.from.x) === 1 &&
      move.to.y - move.from.y === (piece.team === TeamType.OUR ? 1 : -1) &&
      !board.pieces.some(
        (p) => p.position.x === move.to.x && p.position.y === move.to.y
      );

    board.playMove(enPassant, true, piece, new Position(move.to.x, move.to.y));

    expect(board.pieces.some((p) => p.position.x === 5 && p.position.y === 4)).toBe(
      false
    );
    const ourPawn = board.pieces.find((p) => p.team === TeamType.OUR)!;
    expect(ourPawn.position.x).toBe(5);
    expect(ourPawn.position.y).toBe(5);
  });

  test('castling moves king and rook', () => {
    const king = new Piece(new Position(4, 0), PieceType.KING, TeamType.OUR, false);
    const rook = new Piece(new Position(7, 0), PieceType.ROOK, TeamType.OUR, false);
    const blackKing = new Piece(new Position(4, 7), PieceType.KING, TeamType.OPPONENT, false);
    const board = new Board([king, rook, blackKing], 1);
    board.calculateAllMoves();

    const piece = board.pieces.find((p) => p.isKing)!;
    board.playMove(false, true, piece, new Position(6, 0));

    expect(piece.position.x).toBe(6);
    const movedRook = board.pieces.find((p) => p.isRook)!;
    expect(movedRook.position.x).toBe(5);
    expect(piece.hasMoved).toBe(true);
    expect(movedRook.hasMoved).toBe(true);
  });
});
