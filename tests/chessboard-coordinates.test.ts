/**
 * @jest-environment jsdom
 */

import { getBoardPosition } from '@/utils/getBoardPosition';
import { Board } from '@/models/Board';
import { Pawn } from '@/models/Pawn';
import { Piece } from '@/models/Piece';
import { Position } from '@/models/Position';
import { PieceType, TeamType } from '@/Types';

// Helper constants
const BOARD_LEFT = 0;
const BOARD_TOP = 0;

describe('getBoardPosition', () => {
  const corners = [
    { x: 0, y: 0, expectedWhite: { x: 0, y: 7 }, expectedBlack: { x: 7, y: 0 } },
    { x: 799, y: 0, expectedWhite: { x: 7, y: 7 }, expectedBlack: { x: 0, y: 0 } },
    { x: 0, y: 799, expectedWhite: { x: 0, y: 0 }, expectedBlack: { x: 7, y: 7 } },
    { x: 799, y: 799, expectedWhite: { x: 7, y: 0 }, expectedBlack: { x: 0, y: 7 } },
  ];

  test('corners for white orientation', () => {
    for (const corner of corners) {
      const pos = getBoardPosition(
        corner.x,
        corner.y,
        BOARD_LEFT,
        BOARD_TOP,
        'white'
      );
      expect(pos).not.toBeNull();
      expect(pos!.x).toBe(corner.expectedWhite.x);
      expect(pos!.y).toBe(corner.expectedWhite.y);
    }
  });

  test('corners for black orientation', () => {
    for (const corner of corners) {
      const pos = getBoardPosition(
        corner.x,
        corner.y,
        BOARD_LEFT,
        BOARD_TOP,
        'black'
      );
      expect(pos).not.toBeNull();
      expect(pos!.x).toBe(corner.expectedBlack.x);
      expect(pos!.y).toBe(corner.expectedBlack.y);
    }
  });
});

describe('pawn promotion', () => {
  test('promotion keeps coordinates within board and changes piece type', () => {
    const pawn = new Pawn(new Position(0, 6), TeamType.OUR, false);
    const board = new Board([pawn], 1);
    board.calculateAllMoves();

    const success = board.playMove(false, true, pawn, new Position(0, 7));
    expect(success).toBe(true);
    expect(pawn.position.x).toBe(0);
    expect(pawn.position.y).toBe(7);
    expect(pawn.position.x).toBeGreaterThanOrEqual(0);
    expect(pawn.position.x).toBeLessThanOrEqual(7);
    expect(pawn.position.y).toBeGreaterThanOrEqual(0);
    expect(pawn.position.y).toBeLessThanOrEqual(7);

    // simulate promotion to queen
    board.pieces = board.pieces.map((p) =>
      p === pawn ? new Piece(p.position.clone(), PieceType.QUEEN, p.team, true) : p
    );
    board.calculateAllMoves();

    expect(board.pieces[0].type).toBe(PieceType.QUEEN);
    expect(board.pieces[0].position.x).toBe(0);
    expect(board.pieces[0].position.y).toBe(7);
  });
});
