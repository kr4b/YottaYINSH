const createError = require('http-errors');
const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const logger = require('morgan');

const indexRouter = require('./routes/index');
const usersRouter = require('./routes/users');

const http = require('http');
const websocket = require('ws');

const Game = require('./game');

const app = express();
const PORT = process.argv[2] || 3000;

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', indexRouter);
app.use('/users', usersRouter);

// catch 404 and forward to error handler
app.use(function (req, res, next) {
  next(createError(404));
});

// error handler
app.use(function (err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

const server = http.createServer(app);
const wss = new websocket.Server({ server });

// LCG id numbers for semi-random id's
const a = 25214903917;
const c = 11;
const m = Math.pow(2, 48);
let seedGame = Date.now();
let seedSession = Date.now() + 28411;

function generateId(seed) {
  seed = (a * seed + c) % m;
  return seed;
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

// Gets a game by game id (id in URL)
function getGame(id) {
  for (let game of games) {
    if (game.id == id) {
      return game;
    }
  }

  return null;
}

// Create a new game for the given client
function createGame(ws, message) {
  seedGame = generateId(seedGame);
  const game = new Game(seedGame.toString(36), message.game);
  const response = JSON.stringify({ id: game.id });
  ws.send(response);
  games.push(game);
}

// Create a new session identifier for the given client
function createSession(ws) {
  seedSession = generateId(seedSession);
  const response = JSON.stringify({ type: "session", id: seedSession.toString(36) });
  ws.send(response);
}

// Sends all games with required data to the given client
// availability, player1, player2, elapsedTime
function sendGames(ws) {
  const gamesList = [];
  for (let game of games) {
    const gameData = {
      id: game.id,
      availability: game.isFull() ? "full" : game.type == "private" ? "private" : "open",
      player1: game.player1 ? game.player1.id : null,
      player2: game.player2 ? game.player2.id : null,
      elapsedTime: game.startTime ? Math.floor((Date.now() - game.startTime) / 1000) : 0,
    };
    gamesList.push(gameData);
  }

  ws.send(JSON.stringify({ type: "games", games: gamesList }));
}

// Let the given client join the game
// If the game is full, the client becomes a spectator
function joinGame(ws, message) {
  const game = getGame(message.game);

  const player = {
    ws,
    id: message.id,
    connected: true
  };
  players.push(player);
  game.addPlayer(player);
}

// Handle request from a client
function handleRequest(ws, message) {
  switch (message.type) {
    case "games":
      sendGames(ws);
      break;

    case "create":
      createGame(ws, message);
      break;

    case "join":
      joinGame(ws, message);
      break;

    case "session":
      createSession(ws);
      break;

    default:
      console.log(`Unexpected request: ${message}`);
      break;
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
