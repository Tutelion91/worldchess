import express, { Request, Response } from "express";
import { WebSocketServer, WebSocket } from "ws";
import http from "http";
import cors from "cors";

const app = express();
app.use(cors());

const server = http.createServer(app);
const wss = new WebSocketServer({ server });

const games: Record<string, { id: string; players: WebSocket[]; timeControl: string; stake: number }> = {};

console.log("Server läuft auf http://localhost:3001 und WebSocket ws://localhost:3001");

wss.on("connection", (ws) => {
  console.log("Ein Spieler hat sich verbunden.");

  ws.on("message", (message) => {
    try {
      const data = JSON.parse(message.toString());

      if (data.type === "new-game") {
        const newGame = {
          id: data.payload.id,
          players: [],
          timeControl: data.payload.timeControl,
          stake: data.payload.stake,
        };
        games[newGame.id] = newGame;

        // Info an alle Clients schicken
        wss.clients.forEach((client) => {
          if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify({ type: "new-game", payload: newGame }));
          }
        });
      }

      if (data.type === "join") {
        const gameId = data.gameId;
        const game = games[gameId];

        if (!game) {
          ws.send(JSON.stringify({ type: "error", message: "Spiel existiert nicht" }));
          return;
        }

        if (game.players.length >= 2) {
          ws.send(JSON.stringify({ type: "error", message: "Spielraum voll" }));
          return;
        }

        game.players.push(ws);
        console.log(`Spieler hat Raum ${gameId} betreten.`);

        if (game.players.length === 2) {
          game.players.forEach((player, index) => {
            player.send(JSON.stringify({ type: "start", color: index === 0 ? "white" : "black" }));
          });

          // Wenn 2 Spieler da, entfernen wir das Spiel aus der Warteliste für andere
          wss.clients.forEach((client) => {
            if (client.readyState === WebSocket.OPEN) {
              client.send(JSON.stringify({ type: "game-started", gameId }));
            }
          });
        }
      }

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
    } catch (err) {
      console.error("Fehler beim Parsen der Nachricht:", err);
    }
  });

  ws.on("close", () => {
    console.log("Ein Spieler hat die Verbindung geschlossen.");

    // Spieler aus Räumen entfernen
    for (const gameId in games) {
      const game = games[gameId];
      game.players = game.players.filter((player) => player !== ws);

      // Wenn Spiel leer ist, komplett löschen
      if (game.players.length === 0) {
        delete games[gameId];
      }
    }
  });
});

// HTTP Endpoint: GET /games → gibt alle offenen Spiele
app.get("/games", (req: Request, res: Response) => {
  const openGames = Object.values(games).filter((g) => g.players.length < 2);
  res.json(openGames);
});

// Server starten
server.listen(3001, () => {
  console.log("HTTP Server läuft auf Port 3001");
});

