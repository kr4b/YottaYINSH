const { BLACK, WHITE, INTERSECTIONS } = require('./server_constants').loadConstants();

class ServerBoard {

  constructor() {
    this.rings = {};
    this.markers = {};
  }

  placeRing(vertical, point, side) {
    const index = this.getIndex(vertical, point);
    if (index < 0 || this.rings[index] != undefined) return false;
    this.rings[index] = side;
    return true;
  }

  // Moves a ring, leaving a marker and flipping the ones it jumped over
  moveRing(from, to) {
    const from_index = this.getIndex(from.vertical, from.point);
    const to_index = this.getIndex(to.vertical, to.point);
    if (from_index < 0 || to_index < 0 || this.rings[from_index] == undefined) return false;

    const flipped = {};
    const paths = this.getPossiblePaths(from.vertical, from.point, flipped);
    if (!paths.includes(to_index)) return false;

    if (flipped[to_index] != undefined) {
      for (let key of flipped[to_index]) {
        this.markers[key] = (this.markers[key] + 1) % 2;
      }
    }

    this.markers[from_index] = this.rings[from_index];
    this.rings[to_index] = this.rings[from_index];
    delete this.rings[from_index];
    return true;
  }

  removeRing(vertical, point) {
    const index = this.getIndex(vertical, point);
    if (index < 0 || this.rings[index] == undefined) return false;
    delete this.rings[index];
    return true;
  }

  removeMarker(index) {
    if (index < 0 || this.markers[index] == undefined) return false;
    delete this.markers[index];
    return true;
  }

  getIndex(vertical, point) {
    if (vertical == undefined || point == undefined || point < 0 || point >= INTERSECTIONS[vertical]) return -1;
    return vertical * 11 + point;
  }

  getPosition(index) {
    if (index == undefined || index < 0) return null;
    return {
      vertical: Math.floor(index / 11),
      point: index % 11,
    };
  }

  getPossiblePaths(vertical, point, flipped, direction = -1, passed_marker = false) {
    const index = this.getIndex(vertical, point);
    if (index < 0 || isNaN(vertical) || isNaN(point)) return [];
    if (direction != -1 && this.rings[index] != undefined) return [];
    if (direction == -1) {
      flipped[0] = [];
      flipped[1] = [];
      flipped[2] = [];
      flipped[3] = [];
      flipped[4] = [];
      flipped[5] = [];
    }
    if (passed_marker && this.rings[index] == undefined && this.markers[index] == undefined) {
      flipped[index] = flipped[direction];
      delete flipped[direction];
      return [index];
    }

    if (this.markers[index] != undefined) passed_marker = true;

    let out = [];
    if (this.markers[index] == undefined) out.push(index);
    else if (direction != -1 && this.markers[index] != undefined) flipped[direction].push(index);

    if (direction == -1 || direction == 0)
      out = out.concat(this.getPossiblePaths(vertical, point - 1, flipped, 0, passed_marker));
    if (direction == -1 || direction == 1)
      out = out.concat(this.getPossiblePaths(vertical + 1, point + Math.floor((INTERSECTIONS[vertical + 1] - INTERSECTIONS[vertical]) / 2), flipped, 1, passed_marker));
    if (direction == -1 || direction == 2)
      out = out.concat(this.getPossiblePaths(vertical + 1, point + Math.floor((INTERSECTIONS[vertical + 1] - INTERSECTIONS[vertical]) / 2) + 1, flipped, 2, passed_marker));
    if (direction == -1 || direction == 3)
      out = out.concat(this.getPossiblePaths(vertical, point + 1, flipped, 3, passed_marker));
    if (direction == -1 || direction == 4)
      out = out.concat(this.getPossiblePaths(vertical - 1, point + Math.floor((INTERSECTIONS[vertical - 1] - INTERSECTIONS[vertical]) / 2) + 1, flipped, 4, passed_marker));
    if (direction == -1 || direction == 5)
      out = out.concat(this.getPossiblePaths(vertical - 1, point + Math.floor((INTERSECTIONS[vertical - 1] - INTERSECTIONS[vertical]) / 2), flipped, 5, passed_marker));

    return out;
  }

  // Returns for white and black the possible rows
  checkFiveInRow() {
    const recursiveCheck = (index, side, out, counter = 1, prev = []) => {
      const vertical = (index / 11) | 0;
      const point = index % 11;
      const neighbours = [
        this.getIndex(vertical, point - 1),
        this.getIndex(vertical + 1, point + Math.floor((INTERSECTIONS[vertical + 1] - INTERSECTIONS[vertical]) / 2)),
        this.getIndex(vertical + 1, point + Math.floor((INTERSECTIONS[vertical + 1] - INTERSECTIONS[vertical]) / 2) + 1),
      ];

      prev.push(index);

      if (this.markers[index] != side) return 0;
      else if (counter > 5) return counter;
      else out.push(index);

      for (let i in neighbours) {
        if (neighbours[i] >= 0 && this.markers[neighbours[i]] == side && !prev.includes(neighbours[i])) {
          counter = recursiveCheck(neighbours[i], side, out, counter + 1, prev);
        }
      }

      return counter;
    }

    const out = {};
    out[BLACK] = [];
    out[WHITE] = [];

    for (let index in this.markers) {
      const tmp = [];
      recursiveCheck(parseInt(index), 0, tmp);
      if (tmp.length == 5) out[this.markers[index]].push(tmp);
    }

    return out;
  }
}

module.exports = ServerBoard;