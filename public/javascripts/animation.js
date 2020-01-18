import { INTERSECTIONS, BLACK, WHITE_COLOR, BLACK_COLOR } from "./client_constants.js";

// Linear interpolation
function lerp(v0, v1, t) {
  return (1 - t) * v0 + t * v1;
}

// Quadratic linear interpolation
function qlerp(v0, v1, t) {
  return lerp(v0, v1, t * t);
}

// Gets the vertical and point from an index on the board
function getPosition(index) {
  if (index == undefined || index < 0) return null;
  return {
    vertical: Math.floor(index / 11),
    point: index % 11,
  };
}

// Gets the index on the board from a vertical and a point
function getIndex(vertical, point) {
  if (vertical == undefined || point == undefined || point < 0 || point >= INTERSECTIONS[vertical]) return -1;
  return vertical * 11 + point;
}

// Abstract board animation class
class BoardAnimation {
  constructor(board) {
    this.DURATION = 1000;
    this.board = board;
    this.start = new Date().getTime();
    this.done = false;
  }

  // Update the time and end the animation if it is greater than the duration
  // Returns the current percentage of that the animation is at (0 to 1)
  updateTime() {
    const diff = new Date().getTime() - this.start;

    if (diff >= this.DURATION) {
      this.done = true;
    }

    return Math.min(1, diff / this.DURATION);
  }

  update() {
    throw new Error("This method should be overwritten by subclass and not be called directly")
  }
}

// Animation for ring placement
class RingPlaceAnimation extends BoardAnimation {
  constructor(board, vertical, point, side) {
    super(board);
    this.DURATION = 500;
    this.vertical = vertical;
    this.point = point;
    this.side = side;
  }

  update() {
    const frac = super.updateTime();

    const coord = this.board.getCanvasCoordinate(this.vertical, this.point);
    this.board.setStroke(this.side);
    this.board.ctx.globalAlpha = Math.min(1, frac + .3)
    this.board.ctx.lineWidth = qlerp(this.board.ringSize * 3, this.board.ringSize * .3, frac);

    this.board.drawSingleRing(
      coord.x,
      coord.y,
      qlerp(this.board.ringSize * 10, this.board.ringSize, frac)
    );

    this.board.ctx.globalAlpha = 1.0

    if (this.done) {
      this.board.rings[getIndex(this.vertical, this.point)] = this.side;
      return;
    }
  }
}

// Animation for ring movement and marker flipping
class RingMoveAnimation extends BoardAnimation {
  constructor(board, from, to, flipped, side) {
    super(board);
    // Dynamic duration so the speed of the ring movement is constant
    this.DURATION = Math.max(Math.abs(from.vertical - to.vertical), Math.abs(from.point - to.point)) / 3 * 800;
    this.from = from;
    this.to = to;
    this.flipped = flipped;
    this.side = side;
    delete this.board.rings[getIndex(this.from.vertical, this.from.point)];
  }

  update() {
    const frac = super.updateTime();

    this.board.ctx.fillStyle = this.side == BLACK ? WHITE_COLOR : BLACK_COLOR;
    this.board.drawSingleMarker(this.from.vertical, this.from.point);

    for (let key in this.flipped) {
      const index = this.flipped[key];
      const position = getPosition(index);

      this.board.ctx.fillStyle = this.board.markers[index] == BLACK ? WHITE_COLOR : BLACK_COLOR;
      this.board.ctx.globalAlpha = Math.max(0, 1 - frac);
      this.board.drawSingleMarker(position.vertical, position.point);

      this.board.ctx.fillStyle = this.board.markers[index] == BLACK ? BLACK_COLOR : WHITE_COLOR;
      this.board.ctx.globalAlpha = Math.min(1, frac);
      this.board.drawSingleMarker(position.vertical, position.point);
    }

    const fromCoord = this.board.getCanvasCoordinate(this.from.vertical, this.from.point);
    const toCoord = this.board.getCanvasCoordinate(this.to.vertical, this.to.point);

    this.board.ctx.globalAlpha = 1.0;
    this.board.ctx.lineWidth = this.board.ringWidth;
    this.board.setStroke(this.side);

    this.board.drawSingleRing(
      lerp(fromCoord.x, toCoord.x, frac),
      lerp(fromCoord.y, toCoord.y, frac),
    );

    if (this.done) {
      this.board.rings[getIndex(this.to.vertical, this.to.point)] = this.side;
      for (let key in this.flipped) {
        const index = this.flipped[key];
        this.board.markers[index] = (this.board.markers[index] + 1) % 2;
      }

      this.board.markers[getIndex(this.from.vertical, this.from.point)] = this.side;
      return;
    }
  }
}

// Animation for ring and marker removing
class RingRemoveAnimation extends BoardAnimation {
  constructor(board, ring, row, side) {
    super(board);
    this.DURATION = 1200;
    this.vertical = ring.vertical;
    this.point = ring.point;
    this.row = row;
    this.side = side;
  }

  update() {
    const frac = super.updateTime();

    const index = Math.min(4, Math.floor(frac * 5));

    this.board.ctx.globalAlpha = 1;
    for (let i = index + 1; i < 5; i++) {
      const position = getPosition(this.row[i]);
      this.board.ctx.fillStyle = this.side == BLACK ? WHITE_COLOR : BLACK_COLOR;
      this.board.drawSingleMarker(position.vertical, position.point);
    }

    const position = getPosition(this.row[index]);
    this.board.ctx.fillStyle = this.side == BLACK ? WHITE_COLOR : BLACK_COLOR;
    this.board.ctx.globalAlpha = 1 - (Math.min(0.99, frac) * 5) % 1;
    this.board.drawSingleMarker(position.vertical, position.point);

    const [x, y] = this.side == this.board.side ? [
      this.board.ctx.canvas.width - (this.board.ringSize * 2 + this.board.ringPadding) * 3 + this.board.ringWidth,
      this.board.ctx.canvas.height - (this.board.ringSize + this.board.ringPadding + this.board.ringWidth / 2),
    ] :
      [
        this.board.ringPadding + this.board.ringSize + this.board.ringWidth / 2,
        this.board.ringPadding + this.board.ringSize + this.board.ringWidth / 2,
      ];

    const fromCoord = this.board.getCanvasCoordinate(this.vertical, this.point);
    const toCoord = {
      x: x + this.board.getRingsRemoved(this.side) * (this.board.ringWidth + this.board.ringSize * 2 + this.board.ringPadding),
      y: y,
    };

    this.board.ctx.globalAlpha = 1.0;
    this.board.ctx.lineWidth = this.board.ringWidth;
    this.board.setStroke(this.side);

    this.board.drawSingleRing(
      lerp(fromCoord.x, toCoord.x, frac),
      lerp(fromCoord.y, toCoord.y, frac),
    );

    if (this.done) {
      this.board.ringsRemoved[this.side]++;
      return;
    }
  }
}

export { RingPlaceAnimation, RingMoveAnimation, RingRemoveAnimation };