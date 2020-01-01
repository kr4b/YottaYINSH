const createError = require("http-errors");
const express = require("express");
const path = require("path");
const cookieParser = require("cookie-parser");
const logger = require("morgan");

const http = require("http");
const websocket = require("ws");

const crypto = require("crypto");
const querystring = require("querystring");

const Game = require("./game");

const app = express();
const PORT = process.argv[2] || 3000;

// view engine setup
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "ejs");

app.use(logger("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, "public")));

app.use(function (req, res, next) {
  const gameId = req.query.id;
  const game = getGamePrivate(gameId);
  if (game == null || req.path != "/game") {
    res.render("splash", {});
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
  wss.clients.forEach(ws => {
    if (ws.alive === false) {
      for (let player of players) {
        if (ws == player) {
          player.connected = false;
          break;
        }
      }
      ws.terminate();
    }

    ws.alive = false;
    ws.ping();
  })
}, 10000);

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

// Create a new game for the given client
function createGame(ws, message) {
  const game = new Game(generateId(), generateId(), message.game);
  games.push(game);
  return { id: game.publicId };
}

// Create a new session identifier for the given client
function createSession(ws) {
  return { id: generateId() };
}

// Sends all games with required data to the given client
// availability, player1, player2, elapsedTime
function sendGames(ws) {
  const gamesList = [];
  for (let game of games) {
    const gameData = {
      id: game.publicId,
      availability: game.isFull() ? "full" : game.type == "private" ? "private" : "open",
      player1: game.player1 ? game.player1.id : null,
      player2: game.player2 ? game.player2.id : null,
      elapsedTime: game.startTime ? Math.floor((Date.now() - game.startTime) / 1000) : 0,
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

  let role = "waiting";
  if (game.isFull()) role = "spectating";

  const player = {
    ws,
    id: message.id,
    connected: true
  };
  players.push(player);
  game.addPlayer(player);

  if (game.isFull()) role = "playing";

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

// Handle request from the given client
function handleRequest(ws, message) {
  let response = null;
  const key = message.key;
  const data = message.data;

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

    default:
      console.log(`Unexpected request: ${message.data}`);
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

module.exports = app;
