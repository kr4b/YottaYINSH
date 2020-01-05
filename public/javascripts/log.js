import { WHITE, BLACK, INTERSECTIONS } from "./client_constants.js";


export default
  class Log {
  constructor(board) {
    this.board = board;
    this.turnCounter = 0;
    this.log = [];
  }

  // Adds log and updates the board
  addLog(turnCounter, log) {
    this.turnCounter = turnCounter;
    if (log.ring && log.ring.vertical && log.ring.point) {
      this.board.rings[this.getIndex(log.ring.vertical, log.ring.point)] = this.getSide();
    }

    if (log.from && log.to && log.flipped) {
      const fromIndex = this.getIndex(log.from.vertical, log.from.point);
      const side = this.getSide();

      delete this.board.rings[fromIndex];
      this.board.rings[this.getIndex(log.to.vertical, log.to.point)] = side;

      for (let key in log.flipped) {
        const index = log.flipped[key];
        this.board.makers[index] = (this.board.markers[index] + 1) % 2;
      }

      this.board.markers[fromIndex] = side;
    }

    if (log.remove && log.remove.ring && log.remove.row) {
      const ring = this.getIndex(log.remove.ring.vertical, log.remove.ring.point);
      delete this.board.rings[ring];

      for (let index of log.remove.row) {
        delete this.board.markers[index];
      }
    }

    this.log.push(log);
  }

  // Gets the current side whoms turn it is
  getSide() {
    if (this.turnCounter < 10) {
      return this.turnCounter % 2 == 0 ? WHITE : BLACK;
    } else {
      return (this.turnCounter + 1) % 2 == 0 ? WHITE : BLACK;
    }
  }

  // Gets the string coordinate of a position { vertical, point }
  getCoord(position) {
    return `${INTERSECTIONS[position.vertical] - position.point + POINT_OFFSET[position.vertical]}${String.fromCharCode("a".charCodeAt(0) + position.vertical)}`;
  }

  // Gets the index on the board from a vertical and a point
  getIndex(vertical, point) {
    if (vertical == undefined || point == undefined || point < 0 || point >= INTERSECTIONS[vertical]) return -1;
    return vertical * 11 + point;
  }

  // Gets the vertical and point from an index on the board
  getPosition(index) {
    if (index == undefined || index < 0) return null;
    return {
      vertical: Math.floor(index / 11),
      point: index % 11,
    };
  }
}