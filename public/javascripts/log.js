import { WHITE, BLACK, INTERSECTIONS, POINT_OFFSET } from "./client_constants.js";
import { RingPlaceAnimation, RingMoveAnimation, RingRemoveAnimation } from "./animation.js";

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

    const side = this.getSide();

    let logText = "";
    let animation = null;

    // Ring placement
    if (log.ring) {
      animation = new RingPlaceAnimation(this.board, log.ring.vertical, log.ring.point, side);

      logText = this.getCoord(log.ring);
    }
    // Ring movement and marker flipping
    else if (log.from && log.to && log.flipped) {
      delete this.board.rings[this.getIndex(log.from.vertical, log.from.point)];
      animation = new RingMoveAnimation(this.board, log.from, log.to, log.flipped, side)

      logText = this.getCoord(log.from) + "-" + this.getCoord(log.to);
    }
    // Ring and marker removal
    else if (log.remove && log.remove.ring && log.remove.row && log.side != undefined) {
      delete this.board.rings[this.getIndex(log.remove.ring.vertical, log.remove.ring.point)];
      animation = new RingRemoveAnimation(this.board, log.remove.ring, log.remove.row, log.side);

      let first = null;
      let last = null;

      for (let index of log.remove.row) {
        if (first == null) first = index;
        last = index;

        delete this.board.markers[index];
      }

      logText =
        "x" + this.getCoord(this.getPosition(first)) +
        "-" + this.getCoord(this.getPosition(last)) +
        ";x" + this.getCoord(log.remove.ring);
    } else {
      return;
    }

    this.log.push(log);
    return {
      text: `${turnCounter + 1}-${side == WHITE ? "White" : "Black"}.${logText}`,
      animation: animation
    };
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