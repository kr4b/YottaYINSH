import { WHITE, BLACK, WHITE_COLOR, BLACK_COLOR, WHITE_HINT_COLOR, BLACK_HINT_COLOR, WIN_RINGS, INTERSECTIONS } from "./client_constants.js";

// Board class for the client side
export default
  class ClientBoard {

  constructor(canvas) {
    if (canvas instanceof HTMLCanvasElement) {
      this.ctx = canvas.getContext("2d");

      this.rings = {};
      this.markers = {};
      this.ringsRemoved = [0, 0];
      this.name1 = "";
      this.name2 = "";
      this.side = BLACK;

      this.resize();
    } else {
      throw "Invalid argument";
    }
  }

  // Activates the callback when a ring can be placed near the canvas x, y
  validateRing(x, y, callback) {
    const { vertical, point, distance } = this.nearestYinshCoordinate(x, y);
    const index = vertical * 11 + point;
    if (this.rings[index] == undefined && this.markers[index] == undefined && distance <= this.ringSize)
      callback(vertical, point);
  }

  // Activates the callback when a marker can be placed near the canvas x, y
  validateMarker(x, y, side, callback) {
    const { vertical, point, distance } = this.nearestYinshCoordinate(x, y);
    const index = vertical * 11 + point;
    if (this.rings[index] == side && this.markers[index] == undefined && distance <= this.ringSize)
      callback(vertical, point);
  }

  // Resizes the spacings so the board dimensions are correct
  resize() {
    this.ctx.canvas.width = this.ctx.canvas.clientWidth;
    this.ctx.canvas.height = this.ctx.canvas.clientHeight;

    this.verticalSpacing = this.ctx.canvas.height * .095;
    this.horizontalSpacing = this.verticalSpacing / 2 * Math.sqrt(3);

    this.ringSize = this.horizontalSpacing * .45;
    this.ringPadding = this.ringSize * .2 + 2;
    this.ringWidth = this.ringSize * .3;

    this.render();
  }

  // Returns the { vertical, point } closest to the { x, y }
  nearestYinshCoordinate(x, y) {
    const left = (this.ctx.canvas.width - this.horizontalSpacing * (INTERSECTIONS.length - 1)) / 2;
    const right = (this.ctx.canvas.width + this.horizontalSpacing * (INTERSECTIONS.length - 1)) / 2;
    const vertical = Math.round(Math.min(Math.max(x - left, 0), right - left) / this.horizontalSpacing);

    const top = (this.ctx.canvas.height - this.verticalSpacing * (INTERSECTIONS[vertical] - 1)) / 2;
    const bottom = (this.ctx.canvas.height + this.verticalSpacing * (INTERSECTIONS[vertical] - 1)) / 2;
    const point = Math.round(Math.min(Math.max(y - top, 0), bottom - top) / this.verticalSpacing);

    const { x: canvasX, y: canvasY } = this.getCanvasCoordinate(vertical, point);
    const distance = Math.sqrt((canvasX - x) ** 2 + (canvasY - y) ** 2);

    return { vertical, point, distance };
  }

  // Returns the { x, y } at { vertical, point }
  getCanvasCoordinate(vertical, point) {
    if (point < 0 || point >= INTERSECTIONS[vertical]) return null;

    const left = (this.ctx.canvas.width - this.horizontalSpacing * (INTERSECTIONS.length - 1)) / 2;
    const top = (this.ctx.canvas.height - this.verticalSpacing * (INTERSECTIONS[vertical] - 1)) / 2;

    const x = left + vertical * this.horizontalSpacing;
    const y = top + point * this.verticalSpacing;

    return { x, y };
  }

  // Renders the board, rings and markers
  render() {
    this.ctx.font = "bold 28px 'Lucida Grande', Helvetica, Arial, sans-serif";
    this.ctx.strokeStyle = "#000";
    this.ctx.lineWidth = 2;

    // A function to help rendering the board
    const drawTriangle = (point, dirx, diry) => {
      this.ctx.beginPath();
      this.ctx.moveTo(point.x, point.y);

      this.ctx.lineTo(point.x + this.horizontalSpacing * dirx, point.y - this.verticalSpacing / 2);
      this.ctx.lineTo(point.x + this.horizontalSpacing * dirx * 2, point.y);
      this.ctx.lineTo(point.x + this.horizontalSpacing * dirx, point.y + this.verticalSpacing / 2);
      this.ctx.lineTo(point.x, point.y);
      this.ctx.lineTo(point.x, point.y + this.verticalSpacing * diry);
      this.ctx.moveTo(point.x + this.horizontalSpacing * 2 * dirx, point.y);
      this.ctx.lineTo(point.x + this.horizontalSpacing * 2 * dirx, point.y + this.verticalSpacing * diry);
      this.ctx.moveTo(point.x + this.horizontalSpacing * dirx, point.y - this.verticalSpacing / 2);
      this.ctx.lineTo(point.x + this.horizontalSpacing * dirx, point.y + this.verticalSpacing / 2);

      this.ctx.stroke();
    };

    const center = { x: this.ctx.canvas.width / 2, y: this.ctx.canvas.height / 2 };
    const half_i = (INTERSECTIONS.length / 2) | 0;
    for (let i = 2; i < half_i + 1; i++) {

      const half_j = Math.floor(INTERSECTIONS[half_i - i] / 2);

      for (let j = 0; j < half_j + 1; j++) {
        const a = this.getCanvasCoordinate(half_i - i, half_j - j);
        if (a == null) continue;

        a.x = a.x - center.x;
        a.y = a.y - center.y;

        drawTriangle({ x: center.x + a.x, y: center.y + a.y }, 1, 1);
        drawTriangle({ x: center.x - a.x, y: center.y + a.y }, -1, 1);
        drawTriangle({ x: center.x + a.x, y: center.y - a.y }, 1, -1);
        drawTriangle({ x: center.x - a.x, y: center.y - a.y }, -1, -1);
      }
    }

    // Render the rings
    for (let key in this.rings) {
      const vertical = (key / 11) | 0;
      const point = key % 11;

      this.drawRing(vertical, point, this.rings[key], false);
    }

    // Render the markers
    for (let key in this.markers) {
      const vertical = (key / 11) | 0;
      const point = key % 11;

      this.drawMarker(vertical, point, this.markers[key], false);
    }

    this.drawRemovedRings(
      this.ctx.canvas.width - (this.ringSize * 2 + this.ringPadding) * 3 + this.ringWidth,
      this.ctx.canvas.height - (this.ringSize + this.ringPadding + this.ringWidth / 2),
      this.side == BLACK ? BLACK : WHITE
    );
    this.drawRemovedRings(
      this.ringPadding + this.ringSize + this.ringWidth / 2,
      this.ringPadding + this.ringSize + this.ringWidth / 2,
      this.side == BLACK ? WHITE : BLACK
    );

    this.drawName(this.ringPadding, (this.ringPadding + this.ringSize) * 2 + this.ringWidth, this.name1, "top");
    this.drawName(
      this.ctx.canvas.width - this.ctx.measureText(this.name2).width - this.ringPadding,
      this.ctx.canvas.height - ((this.ringPadding + this.ringSize) * 2 + this.ringWidth),
      this.name2,
      "bottom"
    );
  }

  drawName(x, y, name, position) {
    const fillStyle = this.ctx.fillStyle;
    const textBaseline = this.ctx.textBaseline;

    {
      this.ctx.textBaseline = position;
      this.ctx.fillStyle = "#999";
      this.ctx.fillText(name, x, y);
    }

    this.ctx.fillStyle = fillStyle;
    this.ctx.textBaseline = textBaseline;
  }

  getRingsRemoved(side) {
    return this.ringsRemoved[side == WHITE ? 0 : 1];
  }

  setStroke(side) {
    this.ctx.strokeStyle = side == BLACK ? WHITE_COLOR : BLACK_COLOR;
  }

  // Renders the collected rings
  drawRemovedRings(x, y, side) {
    const lineWidth = this.ctx.lineWidth;
    const strokeStyle = this.ctx.strokeStyle;
    const globalAlpha = this.ctx.globalAlpha;

    this.ctx.lineWidth = this.ringWidth;

    for (let i = 0; i < WIN_RINGS; i++) {
      if (i >= this.getRingsRemoved(side)) {
        this.ctx.globalAlpha = .5;
        this.ctx.strokeStyle = side == BLACK ? WHITE_HINT_COLOR : BLACK_HINT_COLOR;
      } else {
        this.setStroke(side);
      }

      this.drawSingleRing(
        x + (this.ringWidth + this.ringSize * 2 + this.ringPadding) * i,
        y
      );
    }

    this.ctx.lineWidth = lineWidth;
    this.ctx.strokeStyle = strokeStyle;
    this.ctx.globalAlpha = globalAlpha;
  }

  // Renders a ring
  drawRing(vertical, point, side, outline) {
    const lineWidth = this.ctx.lineWidth;
    const strokeStyle = this.ctx.strokeStyle;
    const globalAlpha = this.ctx.globalAlpha;

    {
      this.ctx.lineWidth = this.ringWidth;
      const coord = this.getCanvasCoordinate(vertical, point);

      if (outline) this.ctx.globalAlpha = .5;

      this.setStroke(side);
      this.drawSingleRing(coord.x, coord.y);
    }

    this.ctx.lineWidth = lineWidth;
    this.ctx.strokeStyle = strokeStyle;
    this.ctx.globalAlpha = globalAlpha;
  }

  // Renders a single ring
  drawSingleRing(x, y, size = null) {
    this.ctx.beginPath();
    this.ctx.arc(x, y, size || this.ringSize, 0, Math.PI * 2);
    this.ctx.stroke();
  }

  // Renders a marker
  drawMarker(vertical, point, side, outline) {
    const fillStyle = this.ctx.fillStyle;
    const globalAlpha = this.ctx.globalAlpha;

    {
      if (outline) this.ctx.globalAlpha = .5;

      this.ctx.fillStyle = side == BLACK ? WHITE_COLOR : BLACK_COLOR;
      this.drawSingleMarker(vertical, point);
    }

    this.ctx.fillStyle = fillStyle;
    this.ctx.globalAlpha = globalAlpha;
  }

  // Renders a single marker
  drawSingleMarker(vertical, point) {
    const coord = this.getCanvasCoordinate(vertical, point);
    this.ctx.beginPath();
    this.ctx.arc(coord.x, coord.y, this.ringSize, 0, Math.PI * 2);
    this.ctx.fill();
  }

  // Renders a highlight at all indexes in the row
  highlightRow(row, outline) {
    const fillStyle = this.ctx.fillStyle;
    const globalAlpha = this.ctx.globalAlpha;

    this.ctx.fillStyle = "#e67e22";
    if (outline) this.ctx.globalAlpha = .5;

    for (let index of row) {
      const vertical = (parseInt(index) / 11) | 0;
      const point = parseInt(index) % 11;

      const { x, y } = this.getCanvasCoordinate(vertical, point);
      this.ctx.beginPath();
      this.ctx.arc(x, y, this.ringSize * 1.2, 0, Math.PI * 2);
      this.ctx.fill();
    }

    this.ctx.fillStyle = fillStyle;
    this.ctx.globalAlpha = globalAlpha;
  }
}