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

// LCG id numbers
const a = 25214903917;
const c = 11;
const m = Math.pow(2, 48);
let seed = Date.now();

function generateId() {
  seed = (a * seed + c) % m;
  return seed.toString(36);
}

const games = [];

setInterval(() => {
  wss.clients.forEach(ws => {
    if (ws.alive === false) ws.terminate();

    ws.alive = false;
    ws.ping();
  })
}, 5000);

wss.on("connection", ws => {
  ws.alive = true;

  ws.on("message", data => {
    const message = JSON.parse(data);
    if (message.type == "create") {
      const game = new Game(generateId(), message.game);
      const response = JSON.stringify({ id: game.id });
      ws.send(response);
    }
  });

  ws.on("pong", () => ws.alive = true);
});

server.listen(PORT);

module.exports = app;
