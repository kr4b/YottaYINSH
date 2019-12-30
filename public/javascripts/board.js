const intersections = [4, 7, 8, 9, 10, 9, 10, 9, 8, 7, 4];

export default
  class Board {

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

  getIndex(vertical, point) {
    if (point < 0 || point >= intersections[vertical]) return -1;
    return vertical * 11 + point;
  }

  placeRing(vertical, point, side) {
    const index = this.getIndex(vertical, point);
    if (index < 0 || this.rings[index] != undefined) return false;
    this.rings[index] = side;
    return true;
  }

  placeMarker(vertical, point, side) {
    const index = this.getIndex(vertical, point);
    if (index < 0) return false;
    this.markers[index] = side;
    return true;
  }

  getPossiblePaths(vertical, point, direction = -1, passed_marker = false) {
    const index = this.getIndex(vertical, point);
    if (index < 0 || isNaN(vertical) || isNaN(point)) return [];
    if (this.direction != -1 && this.rings[index] != undefined) return [];
    if (passed_marker && this.rings[index] == undefined && this.markers[index] == undefined) return [index];

    if (this.markers[index] != undefined) passed_marker = true;

    let out = [];
    if (this.markers[index] == undefined) out.push(index);

    if (direction == -1 || direction == 0)
      out = out.concat(this.getPossiblePaths(vertical, point - 1, 0, passed_marker));
    if (direction == -1 || direction == 1)
      out = out.concat(this.getPossiblePaths(vertical + 1, point + Math.floor((intersections[vertical + 1] - intersections[vertical]) / 2), 1, passed_marker));
    if (direction == -1 || direction == 2)
      out = out.concat(this.getPossiblePaths(vertical + 1, point + Math.floor((intersections[vertical + 1] - intersections[vertical]) / 2) + 1, 2, passed_marker));
    if (direction == -1 || direction == 3)
      out = out.concat(this.getPossiblePaths(vertical, point + 1, 3, passed_marker));
    if (direction == -1 || direction == 4)
      out = out.concat(this.getPossiblePaths(vertical - 1, point + Math.floor((intersections[vertical - 1] - intersections[vertical]) / 2) + 1, 4, passed_marker));
    if (direction == -1 || direction == 5)
      out = out.concat(this.getPossiblePaths(vertical - 1, point + Math.floor((intersections[vertical - 1] - intersections[vertical]) / 2), 5, passed_marker));

    return out;
  }

  resize() {
    this.ctx.canvas.width = this.ctx.canvas.clientWidth;
    this.ctx.canvas.height = this.ctx.canvas.clientHeight;

    this.verticalSpacing = this.ctx.canvas.height * 0.095;
    this.horizontalSpacing = this.verticalSpacing / 2 * Math.sqrt(3);

    this.render();
  }

  nearestYinshCoordinate(x, y) {
    const left = (this.ctx.canvas.width - this.horizontalSpacing * (intersections.length - 1)) / 2;
    const right = (this.ctx.canvas.width + this.horizontalSpacing * (intersections.length - 1)) / 2;
    const vertical = Math.round(Math.min(Math.max(x - left, 0), right - left) / this.horizontalSpacing);

    const top = (this.ctx.canvas.height - this.verticalSpacing * (intersections[vertical] - 1)) / 2;
    const bottom = (this.ctx.canvas.height + this.verticalSpacing * (intersections[vertical] - 1)) / 2;
    const point = Math.round(Math.min(Math.max(y - top, 0), bottom - top) / this.verticalSpacing);

    const { x: canvasX, y: canvasY } = this.getCanvasCoordinate(vertical, point);
    const distance = Math.sqrt((canvasX - x) ** 2 + (canvasY - y) ** 2);

    return { vertical, point, distance };
  }

  getCanvasCoordinate(vertical, point) {
    if (point < 0 || point >= intersections[vertical]) return null;

    const left = (this.ctx.canvas.width - this.horizontalSpacing * (intersections.length - 1)) / 2;
    const top = (this.ctx.canvas.height - this.verticalSpacing * (intersections[vertical] - 1)) / 2;

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
    const half_i = (intersections.length / 2) | 0;
    for (let i = 2; i < half_i + 1; i++) {

      const half_j = Math.floor(intersections[half_i - i] / 2);

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
      const coord = this.getCanvasCoordinate(vertical, point);

      this.ctx.fillRect(coord.x - 10, coord.y - 10, 20, 20);
    }
  }
}