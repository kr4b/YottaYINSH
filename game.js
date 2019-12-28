class Game {
  constructor(id, type) {
    this.id = id;
    this.type = type;
    this.startTime = null;

    this.player1 = null;
    this.player2 = null;
    this.spectators = [];
  }

  is_full() {
    return this.player1 != null && this.player2 != null;
  }

  add_player(player) {
    if (this.is_full()) {
      this.spectators.push(player);
    } else if (this.player1 == null) {
      this.player1 = player;
    } else {
      this.player2 = player;
      this.player1.ws.send(JSON.stringify({ id: this.player2.id }));
      this.player2.ws.send(JSON.stringify({ id: this.player1.id }));
    }
  }
}

module.exports = Game;