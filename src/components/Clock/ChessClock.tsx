import { useEffect, useRef, useState } from 'react';
import { TeamType } from '@/Types';

interface ChessClockProps {
  timeControl: string;
  currentTurn: TeamType;
  totalTurns: number;
  onTimeout: (winner: TeamType) => void;
}

function parseTimeControl(tc: string): { base: number; inc: number } {
  const [m, i] = tc.split('+').map(Number);
  const base = (isNaN(m) ? 0 : m) * 60;
  const inc = isNaN(i) ? 0 : i;
  return { base, inc };
}

function format(sec: number): string {
  const m = Math.floor(sec / 60)
    .toString()
    .padStart(2, '0');
  const s = Math.floor(sec % 60)
    .toString()
    .padStart(2, '0');
  return `${m}:${s}`;
}

export default function ChessClock({
  timeControl,
  currentTurn,
  totalTurns,
  onTimeout,
}: ChessClockProps) {
  const { base, inc } = parseTimeControl(timeControl);
  const [whiteTime, setWhiteTime] = useState(base + 5); // 5s bonus for white
  const [blackTime, setBlackTime] = useState(base);
  const [gameOver, setGameOver] = useState(false);
  const [active, setActive] = useState<'white' | 'black'>(
    currentTurn === TeamType.OUR ? 'white' : 'black'
  );
  const prevTurns = useRef(totalTurns);
  const incRef = useRef(inc);

  useEffect(() => {
    if (gameOver) return;
    const timer = setInterval(() => {
      setWhiteTime((t) => {
        const next = active === 'white' ? Math.max(t - 1, 0) : t;
        if (!gameOver && active === 'white' && next === 0) {
          setGameOver(true);
          onTimeout(TeamType.OPPONENT);
        }
        return next;
      });
      setBlackTime((t) => {
        const next = active === 'black' ? Math.max(t - 1, 0) : t;
        if (!gameOver && active === 'black' && next === 0) {
          setGameOver(true);
          onTimeout(TeamType.OUR);
        }
        return next;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [active, gameOver, onTimeout]);

  useEffect(() => {
    if (gameOver || totalTurns === prevTurns.current) return;
    const timer = setInterval(() => {
      setWhiteTime((t) => (active === 'white' ? Math.max(t - 1, 0) : t));
      setBlackTime((t) => (active === 'black' ? Math.max(t - 1, 0) : t));
    }, 1000);
    return () => clearInterval(timer);
  }, [active]);

  useEffect(() => {
    if (totalTurns === prevTurns.current) return;
    const newActive = currentTurn === TeamType.OUR ? 'white' : 'black';
    const last = newActive === 'white' ? 'black' : 'white';
    if (last === 'white') setWhiteTime((t) => t + incRef.current);
    else setBlackTime((t) => t + incRef.current);
    setActive(newActive);
    prevTurns.current = totalTurns;
  }, [totalTurns, currentTurn, gameOver]);
  }, [totalTurns, currentTurn]);


  return (
    <div className="flex justify-center space-x-6 text-xl text-white mb-4">
      <div>Weiß: {format(whiteTime)}</div>
      <div>Schwarz: {format(blackTime)}</div>
    </div>
  );
}
