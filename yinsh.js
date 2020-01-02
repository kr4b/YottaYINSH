const ServerBoard = require("./server_board.js");
const { BLACK, WHITE } = require("./server_constants").loadConstants();

class Yinsh {

  constructor() {
    this.board = new ServerBoard();
    this.turnCounter = 0;

    this.players = [];
  }

  setSides(p1, p2) {
    if (Math.round(Math.random()) == 0) {
      this.players.push(p1);
      this.players.push(p2);
    } else {
      this.players.push(p2);
      this.players.push(p1);
    }

    this.players[0].ws.send(JSON.stringify({ key: "side", data: { side: WHITE } }));
    this.players[1].ws.send(JSON.stringify({ key: "side", data: { side: BLACK } }));
  }

  getSide() {
    if (this.turnCounter < 10) {
      return this.turnCounter % 2;
    } else {
      return (this.turnCounter + 1) % 2;
    }
  }

  // Lets the player know it should make a move and what moves it can make
  sendTurnRequest(player) {
    const side = this.getSide();
    const rings = {};
    for (let ring in this.board.rings) {
      if (this.board.rings[ring] == side) {
        const position = this.board.getPosition(ring);
        rings[ring] = this.board.getPossiblePaths(position.vertical, position.point, {});
      }
    }

    player.ws.send(JSON.stringify({ key: "turn", data: { turnNumber: this.turnCounter, rings } }));
  }

  // Checks if a move is valid
  // Arguments from and to should be { vertical: int, point: int };
  validateMove(from, to) {
    const possiblePaths = this.board.getPossiblePaths(from.vertical, from.point, {});
    return possiblePaths.includes(this.board.getIndex(to.vertical, to.point));
  }

  // Sends the updated board data (markers and rings) to all clients
  getBoardJSON() {
    return {
      rings: this.board.rings,
      markers: this.board.markers
    };
  }
}

module.exports = Yinsh;

// send turn request to socket
// get move
// validate move
// check for five in a row -> act if so
// perform move serverside
// send updated board to all players and spectators
// increment turnCounter and send a new request

