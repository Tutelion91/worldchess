import express, { Request, Response } from "express";
import cors from "cors";
import { WebSocketServer, WebSocket } from "ws";

const app = express();
const HTTP_PORT = 3001; 
const WS_PORT = 8080;

app.use(cors());
app.use(express.json());

// In‑Memory Speicher für offene Spiele
const games: Record<
  string,
  { id: string; players: WebSocket[]; timeControl: string; stake: number; started: boolean; }
> = {};

// HTTP‑Server starten
app.get("/games", (req: Request, res: Response) => {
  // nur Spiele mit <2 Spielern zurückliefern
  const openGames = Object.values(games).filter((g) => g.players.length < 2);
  res.json(openGames);
});

app.listen(HTTP_PORT, () => {
  console.log(`HTTP Server läuft auf http://localhost:${HTTP_PORT}`);
});

// WebSocket‑Server auf eigenem Port
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

    // 1) Initial‑Abfrage aller offenen Spiele
    if (data.type === "get-waiting-games") {
      const openGames = Object.values(games).filter((g) => g.players.length < 2);
      ws.send(JSON.stringify({ type: "waiting-games", payload: openGames }));
    }

    // 2) Neues Spiel erstellt
    if (data.type === "new-game") {
      const newGame = {
        id: data.payload.id,
        players: [] as WebSocket[],
        timeControl: data.payload.timeControl,
        stake: data.payload.stake,
        started: false,
      };
      games[newGame.id] = newGame;
      // Broadcast an alle verbundenen Clients
      wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify({ type: "new-game", payload: newGame }));
        }
      });
    }

    // 3) Join eines Spielers
    if (data.type === "join") {
      const gameId: string = data.gameId;
      const game = games[gameId];
      if (!game) {
        return ws.send(JSON.stringify({ type: "error", message: "Spiel existiert nicht" }));
      }
      if (game.players.length >= 2) {
        return ws.send(JSON.stringify({ type: "error", message: "Raum voll" }));
      }
      game.players.push(ws);
      console.log(`Spieler beigetreten: ${gameId}`);

      // sobald 2 Spieler, Spiel starten und Warteliste bereinigen
      if (game.players.length === 2) {
      game.started = true;
      const gameData = {
    id:      game.id,
    player1: "Player 1", 
    player2: "Player 2", 
    stake:   game.stake,
    started: true};
        // an beide Spieler Start-Nachricht senden
        game.players.forEach((player, i) => {
          player.send(
            JSON.stringify({ type: "start", payload: gameData, 
        color: i === 0 ? "white" : "black" })
          );
        });
        // Wartelisten‑Client informieren, dass Spiel wegfällt
        wss.clients.forEach((client) => {
          if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify({ type: "game-started", gameId }));
          }
        });
      }
    }

    // 4) Züge weiterleiten
    if (data.type === "move") {
      const { gameId, move } = data;
      const game = games[gameId];
      if (game) {
        game.players.forEach((player) => {
          if (player !== ws && player.readyState === WebSocket.OPEN) {
            player.send(JSON.stringify({ type: "move", move }));
          }
        });
      }
    }
  });

  ws.on("close", () => {
    console.log("WebSocket: Client getrennt");
    // Alle Räume säubern
    for (const id in games) {
      const room = games[id];
    if (room.started && room.players.includes(ws)) {
      room.players = room.players.filter((p) => p !== ws);
      if (room.players.length === 0) {
        console.log("Lösche fertig gespielten Raum", id);
        delete games[id];}}
    }
  });
//  ws.on("message", (message) => {
//  console.log("[Server] Nachricht reinkommend:", message.toString());
//  const data = JSON.parse(message.toString());
//  if (data.type === "get-waiting-games") {
//    console.log("[Server] get-waiting-games erhalten");
    // ...
//  }
//  if (data.type === "new-game") {
//    console.log("[Server] new-game payload:", data.payload);
    // ...
//  }
  // etc.
//});

});

