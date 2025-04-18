import './App.css';
import Referee from './components/Referee/Referee';
import { useEffect, useState } from 'react';
import { connectToGame, sendMove, setGameId } from "@/src/websocket";


function App() {
  const [isFlipped, setIsFlipped] = useState<boolean | null>(null);

  useEffect(() => {
    const color = localStorage.getItem("worldchess-color");
    if (color) {
      setIsFlipped(color === "black");
    }
  }, []);

  if (isFlipped === null) {
    return (
      <div className="text-white text-center mt-10">
        Lade Brett...
      </div>
    );
  }

  return (
    <div id="app">
      <Referee isFlipped={isFlipped} />
    </div>
  );
}

export default App;

