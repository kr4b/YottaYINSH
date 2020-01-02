import { BLACK, WHITE, INTERSECTIONS } from "./client_constants.js";

// Board class for the client side
export default
  class ClientBoard {

  constructor(canvas) {
    if (canvas instanceof HTMLCanvasElement) {
      this.ctx = canvas.getContext('2d');

      this.rings = {};
      this.markers = {};

      this.resize();
    } else {
      throw "Invalid argument";
    }
  }

  validateRing(x, y, callback) {
    const { vertical, point, distance } = this.nearestYinshCoordinate(x, y);
    const index = vertical * 11 + point;
    if (this.rings[index] == undefined && this.markers[index] == undefined && distance <= this.ringSize)
      callback(vertical, point);
  }

  validateMarker(x, y, side, callback) {
    const { vertical, point, distance } = this.nearestYinshCoordinate(x, y);
    const index = vertical * 11 + point;
    if (this.rings[index] == side && this.markers[index] == undefined && distance <= this.ringSize)
      callback(vertical, point);
  }

  resize() {
    this.ctx.canvas.width = this.ctx.canvas.clientWidth;
    this.ctx.canvas.height = this.ctx.canvas.clientHeight;

    this.verticalSpacing = this.ctx.canvas.height * 0.095;
    this.horizontalSpacing = this.verticalSpacing / 2 * Math.sqrt(3);

    this.ringSize = this.horizontalSpacing * .45;

    this.render();
  }

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

  getCanvasCoordinate(vertical, point) {
    if (point < 0 || point >= INTERSECTIONS[vertical]) return null;

    const left = (this.ctx.canvas.width - this.horizontalSpacing * (INTERSECTIONS.length - 1)) / 2;
    const top = (this.ctx.canvas.height - this.verticalSpacing * (INTERSECTIONS[vertical] - 1)) / 2;

    const x = left + vertical * this.horizontalSpacing;
    const y = top + point * this.verticalSpacing;

    return { x, y };
  }

  render() {
    this.ctx.clearRect(0, 0, this.ctx.canvas.width, this.ctx.canvas.height);

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
    }

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

    for (let key in this.rings) {
      const vertical = (key / 11) | 0;
      const point = key % 11;

      this.drawRing(vertical, point, this.rings[key], false);
    }

    for (let key in this.markers) {
      const vertical = (key / 11) | 0;
      const point = key % 11;
  
      this.drawMarker(vertical, point, this.markers[key], false);
    }
  }

  drawRing(vertical, point, side, outline) {
    const lineWidth = this.ctx.lineWidth;
    const strokeStyle = this.ctx.strokeStyle;
    const globalAlpha = this.ctx.globalAlpha;

    {
      this.ctx.lineWidth = 10;
      const coord = this.getCanvasCoordinate(vertical, point);

      if (outline) this.ctx.globalAlpha = .5;

      this.ctx.strokeStyle = side == BLACK ? '#111' : '#ddd';
      this.ctx.beginPath();
      this.ctx.arc(coord.x, coord.y, this.ringSize, 0, Math.PI * 2);
      this.ctx.stroke();
    }

    this.ctx.lineWidth = lineWidth;
    this.ctx.strokeStyle = strokeStyle;
    this.ctx.globalAlpha = globalAlpha;
  }

  drawMarker(vertical, point, side, outline) {
    const fillStyle = this.ctx.fillStyle;
    const globalAlpha = this.ctx.globalAlpha;

    {
      const coord = this.getCanvasCoordinate(vertical, point);

      if (outline) this.ctx.globalAlpha = .5;

      this.ctx.fillStyle = side == BLACK ? '#111' : '#ddd';
      this.ctx.beginPath();
      this.ctx.arc(coord.x, coord.y, this.ringSize, 0, Math.PI * 2);
      this.ctx.fill();
    }

    this.ctx.fillStyle = fillStyle;
    this.ctx.globalAlpha = globalAlpha;
  }
}