const Yinsh = require("./yinsh.js");
const { BLACK, INTERSECTIONS, POINT_OFFSET } = require("./server_constants").loadConstants();

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
      this.yinsh.sendTurnRequest(this.yinsh.players[0]);
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
    let log = "";
    if (this.yinsh.turnCounter < 10 && from != undefined) {
      if (data.id == this.yinsh.players[side].id) {
        valid = this.yinsh.board.placeRing(from.vertical, from.point, side);
      }

      if (valid) {
        log = `${this.getLog(side)} ${this.getCoord(from)}`;
      }
    } else if (from != undefined && to != undefined) {
      if (data.id == this.yinsh.players[side].id) {
        valid = this.yinsh.validateMove(from, to);
      }
      if (valid) {
        log = `${this.getLog(side)} ${this.getCoord(from)}-${this.getCoord(to)}`;
        this.yinsh.board.moveRing(from, to);
        const rows = this.yinsh.board.checkFiveInRow();
        if (rows[side].length != 0) {
          this.yinsh.players[side].ws.send(JSON.stringify({ key: "row", data: rows[side] }));
          foundRow = true;
        }
        if (rows[(side + 1) % 2].length != 0) {
          const otherSide = (side + 1) % 2;
          this.yinsh.players[otherSide].ws.send(JSON.stringify({ key: "row", data: rows[otherSide] }));
          foundRow = true;
        }
      }
    }

    if (valid) {
      this.updateBoard(log);
    }

    if (!foundRow && valid) {
      this.yinsh.turnCounter++;
    }

    if (!foundRow) {
      this.yinsh.sendTurnRequest(this.yinsh.players[this.yinsh.getSide()]);
    }
  }

  handleRingRemove(data) {
    const row = data.row;
    const ring = data.ring;

    let foundRow = false;

    if (this.yinsh.turnCounter >= 10 && row != undefined && ring != undefined) {
      let activeSide = this.yinsh.getSide();

      for (let i = 0; i < 2; i++) {
        const side = (activeSide + i) % 2;
        const rows = this.yinsh.board.checkFiveInRow();

        let valid = rows[side].some(value => value.every(index => row.includes(index)));

        if (valid && this.yinsh.board.removeRing(ring.vertical, ring.point)) {
          for (let index of row) {
            this.yinsh.board.removeMarker(index);
          }
          
          let log = `${this.getLog(side)} x${this.getCoord(ring)}`;
          this.updateBoard(log);
          
          this.yinsh.board.ringsRemoved[side] += 1;
          if (this.yinsh.board.ringsRemoved[side] == 3) {
            console.log("win");
          }

          const rows = this.yinsh.board.checkFiveInRow();
          if (rows[side].length != 0) {
            this.yinsh.players[side].ws.send(JSON.stringify({ key: "row", data: rows[side] }));
            foundRow = true;
          }
          if (rows[(side + 1) % 2].length != 0) {
            const otherSide = (side + 1) % 2;
            this.yinsh.players[otherSide].ws.send(JSON.stringify({ key: "row", data: rows[otherSide] }));
            foundRow = true;
          }
        }
      }
    }

    if (!foundRow) {
      this.yinsh.turnCounter++;
      this.yinsh.sendTurnRequest(this.yinsh.players[this.yinsh.getSide()]);
    }
  }
}

module.exports = Game;