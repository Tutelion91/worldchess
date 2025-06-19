import { parseFen } from '@/utils/fen';
import { TeamType } from '@/Types';
import { Chess } from 'chess.js';
import { WebSocket } from 'ws';

describe('game over detection', () => {
  test('calculateAllMoves sets winningTeam on checkmate', () => {
    const board = parseFen('7k/6Q1/7K/8/8/8/8/8 b - - 0 1');
    expect(board.winningTeam).toBe(TeamType.OUR);
    expect(board.isStalemate).toBe(false);
  });

  test('calculateAllMoves sets isStalemate on stalemate', () => {
    const board = parseFen('7k/5Q2/7K/8/8/8/8/8 b - - 0 1');
    expect(board.winningTeam).toBeUndefined();
    expect(board.isStalemate).toBe(true);
  });

  test('server sends game-over message after checkmate', () => {
    const startFen = '7k/5Q2/6K1/8/8/8/8/8 w - - 0 1';
    const game = {
      board: new Chess(startFen),
      players: [
        { readyState: WebSocket.OPEN, send: jest.fn() },
        { readyState: WebSocket.OPEN, send: jest.fn() },
      ],
      moves: [] as Array<{ from: { x: number; y: number }; to: { x: number; y: number }; promotion?: string }>,
      finished: false,
    };

    const files = 'abcdefgh';
    const coordsToAlgebraic = (x: number, y: number) => `${files[x]}${y + 1}`;
    const algebraicToCoords = (sq: string) => ({ x: files.indexOf(sq[0]), y: parseInt(sq[1], 10) - 1 });

    function processMove(move: { from: { x: number; y: number }; to: { x: number; y: number }; promotion?: string }) {
      const fromAlg = coordsToAlgebraic(move.from.x, move.from.y);
      const toAlg = coordsToAlgebraic(move.to.x, move.to.y);
      const result = game.board.move({ from: fromAlg, to: toAlg, promotion: move.promotion });
      if (!result) return;
      game.moves.push({ from: algebraicToCoords(result.from), to: algebraicToCoords(result.to), promotion: move.promotion });
      game.players.forEach(p => {
        if (p.readyState === WebSocket.OPEN) {
          p.send(JSON.stringify({ type: 'state', fen: game.board.fen(), moves: game.moves }));
        }
      });
      if (game.board.isGameOver()) {
        let winner: 'white' | 'black' | null = null;
        let reason: 'checkmate' | 'stalemate' | 'draw';
        if (game.board.isCheckmate()) {
          reason = 'checkmate';
          winner = game.board.turn() === 'w' ? 'black' : 'white';
        } else if (game.board.isStalemate()) {
          reason = 'stalemate';
        } else {
          reason = 'draw';
        }
        game.finished = true;
        game.players.forEach(p => {
          if (p.readyState === WebSocket.OPEN) {
            p.send(JSON.stringify({ type: 'game-over', payload: { winner, reason } }));
          }
        });
      }
    }

    processMove({ from: { x: 5, y: 6 }, to: { x: 6, y: 6 } });

    const expectedMsg = JSON.stringify({ type: 'game-over', payload: { winner: 'white', reason: 'checkmate' } });
    expect(game.players[0].send).toHaveBeenCalledWith(expectedMsg);
    expect(game.players[1].send).toHaveBeenCalledWith(expectedMsg);
  });
});
