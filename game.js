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
    } else if (this.player1 == null) {
      this.player1 = player;
      if (this.type == "ai") {
        this.player2 = {
          id: "&#x1F4BB; (AI)",
        };
      }
    } else {
      this.player2 = player;
      this.startTime = Date.now();
      this.player1.ws.send(JSON.stringify({ id: this.player2.id }));
      this.player2.ws.send(JSON.stringify({ id: this.player1.id }));

      this.yinsh.setSides(this.player1, this.player2);
      this.yinsh.sendTurnRequest(this.yinsh.players[0]);
    }
  }

  handleMove(from, to) {
    const valid = this.yinsh.validateMove(from, to);
    if (valid) {
      checkForWin();

      const message = JSON.stringify({ key: "boardUpdate", data: this.yinsh.getBoardJSON() });
      this.player1.ws.send(message);
      this.player1.ws.send(message);
      for (let i = 0; i < this.spectators.length; i++) {
        this.spectators[i].ws.send(message);
      }

    } else {

    }
  }
}

module.exports = Game;