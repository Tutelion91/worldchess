import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import { WebSocketServer, WebSocket } from "ws";

const app = express();
const HTTP_PORT = 3001;
const WS_PORT = 8080;

app.use(cors());
app.use(express.json());

// In-Memory Speicher für offene Spiele
interface Game {
  id: string;
  players: WebSocket[];
  timeControl: string;
  stake: number;
  started: boolean;
}
const games: Record<string, Game> = {};

// HTTP-Endpoint: Liste offener Spiele (weniger als 2 Spieler)
app.get("/games", (req: Request, res: Response, next: NextFunction) => {
  console.log(
    "GET /games → Spieler pro Spiel:",
    Object.values(games).map(g => ({ id: g.id, playersCount: g.players.length }))
  );
  const openGames = Object.values(games).filter(g => g.players.length < 2);
  res.json(openGames);
});

// HTTP-Endpoint: Einzelnes Spiel (auch gestartete)
app.get("/games/:id", (req: Request, res: Response, next: NextFunction) => {
  const game = games[req.params.id];
  if (!game) {
    res.status(404).json({ error: "Spiel nicht gefunden" });
    return;
  }
  res.json({
    id: game.id,
    players: game.players.length,
    timeControl: game.timeControl,
    stake: game.stake,
    started: game.started
  });
});

// HTTP-Server starten
app.listen(HTTP_PORT, () => {
  console.log(`HTTP Server läuft auf http://localhost:${HTTP_PORT}`);
});

// WebSocket-Server
const wss = new WebSocketServer({ port: WS_PORT });
console.log(`WebSocket Server läuft auf ws://localhost:${WS_PORT}`);

wss.on("connection", (ws) => {
  console.log("WebSocket: Ein Client verbunden");

  ws.on("message", (message) => {
    let data: any;
    try {
      data = JSON.parse(message.toString());
    } catch {
      return console.error("Ungültiges JSON:", message);
    }

    // Neues Spiel anlegen
    if (data.type === "new-game") {
      const { id, timeControl, stake } = data.payload;
      games[id] = { id, timeControl, stake, players: [ws], started: false };
      ws.send(JSON.stringify({ type: "new-game-ack", gameId: id }));
      // Notify waiting-games
      wss.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN && client !== ws) {
          client.send(JSON.stringify({ type: "new-game", payload: { id, timeControl, stake } }));
        }
      });
    }

    // Spieler beitreten (sicherstellen, dass ein Client nur einmal hinzugefügt wird)
    if (data.type === "join") {
      const game = games[data.gameId];
      if (!game) {
        ws.send(JSON.stringify({ type: "error", message: "Spiel nicht gefunden" }));
        return;
      }
      // Füge Client nur hinzu, wenn noch nicht enthalten
      if (!game.players.includes(ws)) {
        if (game.players.length >= 2) {
          ws.send(JSON.stringify({ type: "error", message: "Raum voll" }));
          return;
        }
        game.players.push(ws);
      }
      // Starte Spiel erst, wenn genau 2 unterschiedliche Clients verbunden sind
      if (!game.started && game.players.length === 2) {
        game.started = true;
        game.players.forEach((player, idx) => {
          const color = idx === 0 ? "white" : "black";
          player.send(
            JSON.stringify({
              type: "start",
              payload: { id: game.id, timeControl: game.timeControl, stake: game.stake, started: true },
              color
            })
          );
        });
        // Broadcast an alle Sessions: Spiel gestartet
        wss.clients.forEach((client) => {
          if (client !== ws && client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify({ type: "game-started", gameId: data.gameId }));
          }
        });
      }
    }

    // Spielfiguren-Movement
    if (data.type === "move") {
      const game = games[data.gameId];
      if (game) {
        game.players.forEach(player => {
          if (player !== ws && player.readyState === WebSocket.OPEN) {
            player.send(JSON.stringify({ type: "move", payload: data.payload }));
          }
        });
      }
    }

  });

  ws.on("close", () => {
    console.log("WebSocket: Client getrennt");
    for (const id in games) {
      const room = games[id];
      room.players = room.players.filter(p => p !== ws);
      // Nur ungestartete Räume sofort löschen
      if (!room.started && room.players.length === 0) {
        console.log("Lösche ungenutzten Raum", id);
        delete games[id];
      }
      // Abbrechen bei Spielabbrüchen
      else if (room.started && room.players.length > 0) {
        room.players.forEach(player =>
          player.send(JSON.stringify({ type: "game-aborted", message: "Gegner hat das Spiel verlassen" }))
        );
      }
    }
  });
});

