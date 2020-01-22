import express from "express";
import path from "path";
import cookieParser from "cookie-parser";

import http from "http";
import websocket from "ws";

import crypto from "crypto";

import Game from "./game.js";

import { formatTime } from "./public/javascripts/client_constants.js";

const __dirname = path.resolve();

const app = express();
const PORT = process.env.PORT || 3000;

// view engine setup
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "ejs");

// app.use(logger("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, "public")));

app.use(function (req, res) {
  const gameId = req.query.id;
  const game = getGamePrivate(gameId);
  if (game == null || req.path != "/game") {
    res.render("splash", {
      games: games.length,
      gamesTime: formatTime(games.reduce((acc, x) => acc + x.getTime(), 0)),
      players: players.length
    });
  } else {
    res.render("game", {});
  }
});

const server = http.createServer(app);
const wss = new websocket.Server({ server });

function generateId() {
  const buf = crypto.randomBytes(6);
  return parseInt(buf.join("")).toString(36);
}

const games = [];
const players = [];

// Close clients that don't respond within 10 seconds
setInterval(() => {
  for (let player of players) {
    const ws = player.ws;
    if (ws.alive === false) {
      ws.terminate();
      player.connected = false;
      deletePlayer(player.id);
    }

    ws.alive = false;
    ws.ping();
  }
}, 10000);

// Delete game with the given private id
function deleteGame(privateId) {
  for (let i = 0; i < games.length; i++) {
    if (games[i].privateId == privateId) {
      games.splice(i, 1);
      break;
    }
  }
}

// Gets a game by public game id
function getGamePublic(id) {
  for (let game of games) {
    if (game.publicId == id) {
      return game;
    }
  }

  return null;
}

// Gets a game by private game id (id in URL)
function getGamePrivate(id) {
  for (let game of games) {
    if (game.privateId == id) {
      return game;
    }
  }

  return null;
}

// Gets a player by a session id
function getPlayer(id) {
  for (let player of players) {
    if (player.id == id) {
      return player;
    }
  }

  return null;
}

// Deletes a player by a session id
function deletePlayer(id) {
  for (let i = 0; i < players.length; i++) {
    if (players[i].id == id) {
      players.splice(i, 1);
      break;
    }
  }
}

// Create a new game for the given client
function createGame(ws, message) {
  const game = new Game(generateId(), generateId(), message.game, deleteGame);
  games.push(game);
  return { id: game.publicId };
}

// Create a new session identifier for the given client
function createSession() {
  return { id: generateId() };
}

// Sends all games with required data to the given client
// availability, player1, player2, elapsedTime
function sendGames() {
  const gamesList = [];
  for (let game of games) {
    const gameData = {
      id: game.publicId,
      availability: game.isFull() ? "full" : game.type == "private" ? "private" : "open",
      player1: game.player1 ? game.player1.name : null,
      player2: game.player2 ? game.player2.name : null,
      elapsedTime: game.getTime(),
    };
    gamesList.push(gameData);
  }

  return { games: gamesList };
}

// Let the given client join the game
// If the game is full, the client becomes a spectator
function joinGame(ws, message) {
  const game = getGamePrivate(message.game);

  if (game == null) {
    return null;
  }

  if (message.id == null) {
    ws.send(JSON.stringify({ key: "session", data: createSession() }));
    return;
  }

  let role = "waiting";

  let player = getPlayer(message.id);
  if (player == null) {
    player = {
      ws,
      id: message.id,
      name: "Guest",
      connected: true
    };
  } else {
    const name = player.name;

    deletePlayer(player.id);
    player = {
      ws,
      id: message.id,
      name: name,
      connected: true
    };
  }

  players.push(player);

  const isFull = game.isFull();
  game.addPlayer(player);

  if (isFull) {
    return {
      role: "spectating",
      board: game.yinsh.getBoardJSON(),
      name1: game.yinsh.players[0].name,
      name2: game.yinsh.players[1].name,
      startTime: game.startTime,
    };
  }

  if (game.isFull()) {
    game.player1.ws.send(JSON.stringify({ key: "join", data: { role: "playing" } }));
    game.player2.ws.send(JSON.stringify({ key: "join", data: { role: "playing" } }));
  }

  return { role };
}

// Attempts to get the private game id if allowed
function getPrivateId(ws, message) {
  const game = getGamePublic(message.id);

  if (game == null || (game.type == "private" && !game.isFull() && game.player1 != null)) {
    return null;
  }

  return { id: game.privateId };
}

// Sets the name of the player with the given id
function setName(ws, data) {
  const player = getPlayer(data.id);
  if (player == null) {
    const player = {
      ws,
      id: data.id,
      name: data.name,
      connected: true
    };
    players.push(player);
  } else {
    player.name = data.name;
  }
}

// Handle request from the given client
function handleRequest(ws, message) {
  let response = null;
  const key = message.key;
  const data = message.data;

  if (data == null) return;

  switch (key) {
    case "games":
      response = sendGames(ws);
      break;

    case "create":
      response = createGame(ws, data);
      break;

    case "join":
      response = joinGame(ws, data);
      break;

    case "session":
      response = createSession(ws);
      break;

    case "public":
      response = getPrivateId(ws, data);
      break;

    case "turn": {
      const game = getGamePrivate(data.game);
      if (game != null) game.handleMove(data);
      break;
    }

    case "name":
      setName(ws, data);
      break;

    case "row": {
      const game = getGamePrivate(data.game);
      if (game != null) game.handleRingRemove(data);
      break;
    }

    default:
      console.log(`Unexpected request: '${message.key}'`);
      break;
  }

  if (response != null) {
    ws.send(JSON.stringify({ key: key, data: response }));
  }
}

// Handle client connections
wss.on("connection", ws => {
  ws.alive = true;

  ws.on("message", data => {
    const message = JSON.parse(data);
    handleRequest(ws, message);
  });

  ws.on("pong", () => ws.alive = true);
});

server.listen(PORT);

export default app;
