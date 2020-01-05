const Yinsh = require("./yinsh.js");
const { WHITE, BLACK, INTERSECTIONS, POINT_OFFSET } = require("./server_constants").loadConstants();

class Game {
  constructor(publicId, privateId, type, terminateCallback) {
    this.publicId = publicId;
    this.privateId = privateId;
    this.type = type;
    this.terminateCallback = terminateCallback;

    this.startTime = null;
    this.player1 = null;
    this.player2 = null;
    this.spectators = [];

    this.yinsh = new Yinsh();
  }

  // Checks if the game has player1 and player2
  isFull() {
    return this.player1 != null && this.player2 != null;
  }

  // Adds a player to the game in the following order
  // player1 + AI (when applicable) -> player2 -> spectator
  addPlayer(player) {
    if (this.isFull()) {
      this.spectators.push(player);
      player.ws.send(JSON.stringify({
        key: "boardUpdate",
        data: { board: this.yinsh.getBoardJSON(), log: "" }
      }));
      return;
    } else if (this.player1 == null) {
      this.player1 = player;
      this.player1.ws.on("close", () => { this.terminateGame(WHITE) });
      if (this.type == "ai") {
        this.player2 = {
          ai: true,
          name: "&#x1F4BB; (AI)",
          ws: { send: () => { }, on: () => { } }
        };
      } else {
        return;
      }
    } else {
      // If the player connecting is the same as player1, do nothing
      if (this.player1.id == player.id) {
        return;
      }

      this.player2 = player;
    }

    this.startTime = Date.now();

    this.yinsh.setSides(this.player1, this.player2);
    this.yinsh.sendTurnRequest(this.yinsh.players[0]);

    const iv = setInterval(() => {
      if (this.yinsh.players[WHITE].connected == false || this.yinsh.players[BLACK].connected == false) {
        this.terminateGame(this.yinsh.players[WHITE].connected ? BLACK : WHITE);
        clearInterval(iv);
      }
    }, 1000);

    this.yinsh.players[WHITE].ws.on("close", () => {
      this.terminateGame(BLACK);
      clearInterval(iv);
    });

    this.yinsh.players[BLACK].ws.on("close", () => {
      this.terminateGame(WHITE);
      clearInterval(iv);
    });
  }

  // Terminates the game and sends all players a terminate request
  terminateGame(winner) {
    const message = {
      key: "terminate",
      data: {
        winner
      }
    };
    this.messagePlayers(message);
    this.terminateCallback(this.privateId);
  }

  // Sends a message (Object) to all players and spectators together
  messagePlayers(message) {
    message = JSON.stringify(message);
    if (this.player1) this.player1.ws.send(message);
    if (this.player2) this.player2.ws.send(message);
    for (let i = 0; i < this.spectators.length; i++) {
      this.spectators[i].ws.send(message);
    }
  }

  // Sends an updated board to all players and spectators together with a log of the move made
  updateBoard(log) {
    const message = {
      key: "boardUpdate",
      data: {
        board: this.yinsh.getBoardJSON(),
        log
      }
    };
    this.messagePlayers(message);
  }

  // Gets the color of a given side
  getColor(side) {
    return side == BLACK ? "BLACK" : "WHITE";
  }

  // Gets the string coordinate of a position { vertical, point }
  getCoord(position) {
    return `${INTERSECTIONS[position.vertical] - position.point + POINT_OFFSET[position.vertical]}${String.fromCharCode("a".charCodeAt(0) + position.vertical)}`;
  }

  // Gets the log prompt of a given side
  // 'COLOR-TURN:'
  getLogPrompt(side) {
    return `${this.getColor(side)}-${this.yinsh.turnCounter + 1}:`;
  }

  // Handles a players move
  // This can be either a ring placement or a ring move
  handleMove(data) {
    const from = data.from;
    const to = data.to;
    const side = this.yinsh.getSide();

    // Someone with an incorrect id sent a move, so ignore it
    if (data.id != this.yinsh.getPlayer(side).id) {
      return;
    }

    let foundRow = false;
    let valid = false;

    // Turn counter is smaller than 10, so the move is a ring placement
    if (this.yinsh.turnCounter < 10 && from != undefined) {
      valid = this.yinsh.board.placeRing(from.vertical, from.point, side);
      if (valid) {
        this.updateBoard(`${this.getLogPrompt(side)} ${this.getCoord(from)}`);
      }
    }
    // Turn counter is greater than or equal to 10, so the move is a ring placement
    else if (from != undefined && to != undefined) {
      valid = this.yinsh.validateMove(from, to);

      if (valid) {
        this.yinsh.board.moveRing(from, to);
        foundRow = this.checkFiveInRow();
        this.updateBoard(`${this.getLogPrompt(side)} ${this.getCoord(from)}-${this.getCoord(to)}`);
      }
    }

    if (!foundRow) {
      if (valid) {
        this.yinsh.turnCounter++;
      }

      this.yinsh.sendTurnRequest(this.yinsh.getPlayer(this.yinsh.getSide()));
    }
  }

  // Handles ring and markers remove
  handleRingRemove(data) {
    const row = data.row;
    const ring = data.ring;

    let foundRow = false;

    if (this.yinsh.turnCounter >= 10 && row != undefined && ring != undefined) {
      const side = this.yinsh.getSide();
      const rows = this.yinsh.board.checkFiveInRow();

      this.handleFiveInRow(side, rows, data);
      this.handleFiveInRow(side == WHITE ? BLACK : WHITE, rows, data);

      foundRow = this.checkFiveInRow();
    }

    if (!foundRow) {
      this.yinsh.turnCounter++;
      this.yinsh.sendTurnRequest(this.yinsh.getPlayer(this.yinsh.getSide()));
    }
  }

  handleFiveInRow(side, rows, data) {
    let valid = rows[side].some(value => value.every(index => data.row.includes(index)));

    if (valid && this.yinsh.board.removeRing(data.ring.vertical, data.ring.point)) {
      for (let index of data.row) {
        this.yinsh.board.removeMarker(index);
      }

      this.yinsh.board.setRingsRemoved(side, this.yinsh.board.getRingsRemoved(side) + 1);
      this.updateBoard(`${this.getLogPrompt(side)} x${this.getCoord(data.ring)}`);

      if (this.yinsh.board.getRingsRemoved(side) == 3) {
        this.terminateGame(side);
      }
    }
  }

  checkFiveInRow() {
    const side = this.yinsh.getSide();
    const otherSide = side == BLACK ? WHITE : BLACK;

    const rows = this.yinsh.board.checkFiveInRow();

    if (rows[side].length != 0) {
      this.yinsh.getPlayer(side).ws.send(JSON.stringify({ key: "row", data: rows[side] }));
      return true;
    }

    if (rows[otherSide].length != 0) {
      this.yinsh.getPlayer(otherSide).ws.send(JSON.stringify({ key: "row", data: rows[otherSide] }));
      return true;
    }

    return false;
  }
}

module.exports = Game;