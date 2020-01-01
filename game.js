const Yinsh = require("./yinsh.js");

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

  handleMove(from, to) {
    let valid = false;
    if (this.yinsh.turnCounter < 10) {
      const side = this.yinsh.turnCounter % 2;
      valid = this.yinsh.board.placeRing(from.vertical, from.point, side);
    } else {
      valid = this.yinsh.validateMove(from, to);
      if (valid) {
        const side = this.yinsh.turnCounter % 2 + 1;
        checkForWin();

        this.yinsh.board.moveRing(from, to);
      }
    }

    if (valid) {
      const message = JSON.stringify({ key: "boardUpdate", data: this.yinsh.getBoardJSON() });
      this.player1.ws.send(message);
      this.player2.ws.send(message);
      for (let i = 0; i < this.spectators.length; i++) {
        this.spectators[i].ws.send(message);
      }

      this.yinsh.turnCounter++;
      const turnCounter = this.yinsh.turnCounter;
      if (turnCounter < 10) {
        this.yinsh.sendTurnRequest(this.yinsh.players[turnCounter % 2]);
      } else {
        this.yinsh.sendTurnRequest(this.yinsh.players[turnCounter % 2 + 1]);
      }
    }
  }
}

module.exports = Game;