import { Position } from '@/models/Position';
import { GRID_SIZE } from '@/Constants';

export function getBoardPosition(
  clientX: number,
  clientY: number,
  boardLeft: number,
  boardTop: number,
  playerColor: 'white' | 'black'
): Position | null {
  let x = Math.floor((clientX - boardLeft) / GRID_SIZE);
  let y = 7 - Math.floor((clientY - boardTop) / GRID_SIZE);

  if (playerColor === 'black') {
    x = 7 - x;
    y = 7 - y;
  }

  if (x < 0 || x > 7 || y < 0 || y > 7) return null;
  return new Position(x, y);
}
