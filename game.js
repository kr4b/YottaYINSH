const Yinsh = require("./yinsh.js");
const { WHITE, BLACK, INTERSECTIONS, POINT_OFFSET } = require("./server_constants").loadConstants();

class Game {
  constructor(publicId, privateId, type) {
    this.publicId = publicId;
    this.privateId = privateId;
    this.type = type;
    this.startTime = null;

    this.player1 = null;
    this.player2 = null;
    this.spectators = [];

    this.yinsh = new Yinsh();
  }

  isFull() {
    return this.player1 != null && this.player2 != null;
  }

  addPlayer(player) {
    if (this.isFull()) {
      this.spectators.push(player);
      player.ws.send(JSON.stringify({ key: "boardUpdate", data: this.yinsh.getBoardJSON() }));
    } else if (this.player1 == null) {
      this.player1 = player;
      if (this.type == "ai") {
        this.player2 = {
          name: "&#x1F4BB; (AI)",
        };
      }
    } else {
      this.player2 = player;
      this.startTime = Date.now();

      this.yinsh.setSides(this.player1, this.player2);
      this.yinsh.sendTurnRequest(this.yinsh.getPlayer(WHITE));
    }
  }

  updateBoard(log) {
    const message = JSON.stringify({ key: "boardUpdate", data: { board: this.yinsh.getBoardJSON(), log } });
    this.player1.ws.send(message);
    this.player2.ws.send(message);
    for (let i = 0; i < this.spectators.length; i++) {
      this.spectators[i].ws.send(message);
    }
  }

  getColor(side) {
    return side == BLACK ? "BLACK" : "WHITE";
  }

  getCoord(position) {
    return `${INTERSECTIONS[position.vertical] - position.point + POINT_OFFSET[position.vertical]}${String.fromCharCode("a".charCodeAt(0) + position.vertical)}`;
  }

  getLog(side) {
    return `${this.getColor(side)}-${this.yinsh.turnCounter + 1}:`;
  }

  handleMove(data) {
    const from = data.from;
    const to = data.to;
    const side = this.yinsh.getSide();

    let foundRow = false;
    let valid = false;

    if (this.yinsh.turnCounter < 10 && from != undefined) {
      if (data.id == this.yinsh.getPlayer(side).id) {
        valid = this.yinsh.board.placeRing(from.vertical, from.point, side);
      }
      if (valid) {
        this.updateBoard(`${this.getLog(side)} ${this.getCoord(from)}`);
      }
    }
    // All the rings have been put down
    else if (from != undefined && to != undefined) {
      if (data.id == this.yinsh.getPlayer(side).id) {
        valid = this.yinsh.validateMove(from, to);
      }
      if (valid) {
        this.yinsh.board.moveRing(from, to);
        foundRow = this.checkFiveInRow();
        this.updateBoard(`${this.getLog(side)} ${this.getCoord(from)}-${this.getCoord(to)}`);
      }
    }

    if (!foundRow) {
      if (valid) {
        this.yinsh.turnCounter++;
      }

      this.yinsh.sendTurnRequest(this.yinsh.getPlayer(this.yinsh.getSide()));
    }
  }

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

      this.updateBoard(`${this.getLog(side)} x${this.getCoord(data.ring)}`);
      this.yinsh.board.setRingsRemoved(side, this.yinsh.board.getRingsRemoved(side) + 1);

      if (this.yinsh.board.getRingsRemoved(side) == 3) {
        console.log("win");
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