import { Board } from '@/models/Board';
import { Pawn } from '@/models/Pawn';
import { Piece } from '@/models/Piece';
import { Position } from '@/models/Position';
import { isServerEnPassant } from "@/utils/serverMove";
import { PieceType, TeamType } from '@/Types';
import { parseFen } from '@/utils/fen';
import { symbolToPieceType } from '@/utils/pieceSymbols';

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
    const enPassant = isServerEnPassant(move, board);

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

  test('black en passant capture from FEN state', () => {
    const board = parseFen('7k/8/8/8/3pP3/8/8/4K3 b - e3 0 1');
    const move = { from: { x: 3, y: 3 }, to: { x: 4, y: 2 } };
    const piece = board.pieces.find(p => p.position.x === move.from.x && p.position.y === move.from.y)!;
    const enPassant = isServerEnPassant(move, board);
    board.playMove(enPassant, true, piece, new Position(move.to.x, move.to.y));

    expect(board.pieces.some(p => p.position.x === 4 && p.position.y === 3)).toBe(false);
    expect(piece.position.x).toBe(4);
    expect(piece.position.y).toBe(2);
  });

  test('black castling from FEN moves king and rook', () => {
    const board = parseFen('r3k2r/8/8/8/8/8/8/4K3 b k - 0 1');
    const king = board.pieces.find(p => p.isKing && p.team === TeamType.OPPONENT)!;
    board.playMove(false, true, king, new Position(6, 7));

    expect(king.position.x).toBe(6);
    const rook = board.pieces.find(p => p.isRook && p.team === TeamType.OPPONENT && p.position.x === 5)!;
    expect(rook.position.x).toBe(5);
    expect(king.hasMoved).toBe(true);
    expect(rook.hasMoved).toBe(true);
  });

  test('black pawn promotion applied from server move', () => {
    const board = parseFen('7k/8/8/8/8/8/p7/4K3 b - - 0 1');
    const move = { from: { x: 0, y: 1 }, to: { x: 0, y: 0 }, promotion: 'q' };
    const piece = board.pieces.find(p => p.position.x === move.from.x && p.position.y === move.from.y)!;
    const enPassant = isServerEnPassant(move, board);
    board.playMove(enPassant, true, piece, new Position(move.to.x, move.to.y));
    const promotionType = symbolToPieceType(move.promotion!);
    board.pieces = board.pieces.map(p =>
      p.position.x === move.to.x && p.position.y === move.to.y && p.team === piece.team
        ? new Piece(p.position.clone(), promotionType!, p.team, true)
        : p
    );

    const promoted = board.pieces.find(p => p.position.x === 0 && p.position.y === 0 && p.team === TeamType.OPPONENT)!;
    expect(promoted.type).toBe(PieceType.QUEEN);
  });
});
