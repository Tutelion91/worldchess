import './App.css';
import Referee from './components/Referee/Referee';

interface AppProps {
  initialGame: {
    id: string;
    timeControl: string;
    stake: number;
    started: boolean;
  };
  playerColor: 'white' | 'black';
  finishGame: () => void;
}



export default function App({ initialGame, playerColor, finishGame }: AppProps) {
  return (
    <div id="app">
      {/* Pass both game data and playerColor to your Referee */}
      <Referee initialGame={initialGame} playerColor={playerColor} finishGame={finishGame} />
    </div>
  );
}
