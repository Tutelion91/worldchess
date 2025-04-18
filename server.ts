// server.ts

import WebSocket, { WebSocketServer } from 'ws';
import { createServer } from 'http';

const server = createServer();
const wss = new WebSocketServer({ server });

type GameMessage = {
  type: 'join' | 'move';
  gameId: string;
  data?: any;
};

type ConnectionInfo = {
  ws: WebSocket;
  gameId: string;
};

const connections: ConnectionInfo[] = [];

wss.on('connection', (ws: WebSocket) => {
  let currentGameId = '';

  ws.on('message', (msg: string | Buffer) => {
    const message: GameMessage = JSON.parse(msg.toString());
    if (message.type === 'join') {
      currentGameId = message.gameId;
      connections.push({ ws, gameId: currentGameId });
      console.log(`Client joined game ${currentGameId}`);
    }

    if (message.type === 'move') {
      // Broadcast to other clients in the same game
      connections
        .filter((conn) => conn.gameId === message.gameId && conn.ws !== ws)
        .forEach((conn) => {
          conn.ws.send(JSON.stringify({
            type: 'move',
            data: message.data,
          }));
        });
    }
  });

  ws.on('close', () => {
    const index = connections.findIndex((c) => c.ws === ws);
    if (index !== -1) {
      connections.splice(index, 1);
      console.log(`Client left game ${currentGameId}`);
    }
  });
});

server.listen(3001, () => {
  console.log('WebSocket server running on ws://localhost:3001');
});

