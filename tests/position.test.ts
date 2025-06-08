import { Position } from '@/models/Position';

describe('Position', () => {
  test('clone creates an equal but distinct object', () => {
    const pos = new Position(1, 2);
    const cloned = pos.clone();
    expect(cloned).not.toBe(pos);
    expect(cloned.x).toBe(pos.x);
    expect(cloned.y).toBe(pos.y);
    expect(cloned.samePosition(pos)).toBe(true);
  });
});
