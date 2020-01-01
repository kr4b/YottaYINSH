const intersections = [4, 7, 8, 9, 10, 9, 10, 9, 8, 7, 4];
const black = 0;
const white = 1;

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
    if (vertical == undefined || point == undefined || point < 0 || point >= intersections[vertical]) return -1;
    return vertical * 11 + point;
  }

  placeRing(vertical, point, side) {
    const index = this.getIndex(vertical, point);
    if (index < 0 || this.rings[index] != undefined) return false;
    this.rings[index] = side;
    return true;
  }
  
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

  placeMarker(vertical, point, side) {
    const index = this.getIndex(vertical, point);
    if (index < 0 || this.markers[index] != undefined) return false;
    this.markers[index] = side;
    return true;
  }

  flipMarker(vertical, point) {
    const index = this.getIndex(vertical, point);
    if (index < 0 || this.markers[index] == undefined) return false;
    this.markers[index] = (this.markers[index] + 1) % 2;
    return false;
  }

  removeMarker(vertical, point) {
    const index = this.getIndex(vertical, point);
    if (index < 0 || this.markers[index] == undefined) return false;
    delete this.markers[index];
    return true;
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
      out = out.concat(this.getPossiblePaths(vertical + 1, point + Math.floor((intersections[vertical + 1] - intersections[vertical]) / 2), flipped, 1, passed_marker));
    if (direction == -1 || direction == 2)
      out = out.concat(this.getPossiblePaths(vertical + 1, point + Math.floor((intersections[vertical + 1] - intersections[vertical]) / 2) + 1, flipped, 2, passed_marker));
    if (direction == -1 || direction == 3)
      out = out.concat(this.getPossiblePaths(vertical, point + 1, flipped, 3, passed_marker));
    if (direction == -1 || direction == 4)
      out = out.concat(this.getPossiblePaths(vertical - 1, point + Math.floor((intersections[vertical - 1] - intersections[vertical]) / 2) + 1, flipped, 4, passed_marker));
    if (direction == -1 || direction == 5)
      out = out.concat(this.getPossiblePaths(vertical - 1, point + Math.floor((intersections[vertical - 1] - intersections[vertical]) / 2), flipped, 5, passed_marker));

    return out;
  }

  checkFiveInRow() {
    const recursiveCheck = (index, side, out, counter = 1, prev = []) => {
      const vertical = (index / 11) | 0;
      const point = index % 11;
      const neighbours = [
        this.getIndex(vertical, point - 1),
        this.getIndex(vertical + 1, point + Math.floor((intersections[vertical + 1] - intersections[vertical]) / 2)),
        this.getIndex(vertical + 1, point + Math.floor((intersections[vertical + 1] - intersections[vertical]) / 2) + 1),
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
    out[black] = [];
    out[white] = [];

    for (let index in this.markers) {
      const tmp = [];
      recursiveCheck(parseInt(index), 0, tmp);
      if (tmp.length == 5) out[this.markers[index]].push(tmp);
    }

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


    this.ctx.save();
    this.ctx.lineWidth = 10;
    for (let key in this.rings) {
      const vertical = (key / 11) | 0;
      const point = key % 11;
      const coord = this.getCanvasCoordinate(vertical, point);

      this.ctx.strokeStyle = this.rings[key] == black ? '#111' : '#ddd';
      this.ctx.beginPath();
      this.ctx.arc(coord.x, coord.y, this.horizontalSpacing * .35, 0, Math.PI * 2);
      this.ctx.stroke();
    }
    this.ctx.restore();

    
    this.ctx.save();
    for (let key in this.markers) {
      const vertical = (key / 11) | 0;
      const point = key % 11;
      const coord = this.getCanvasCoordinate(vertical, point);

      this.ctx.fillStyle = this.markers[key] == black ? '#111' : '#ddd';
      this.ctx.beginPath();
      this.ctx.arc(coord.x, coord.y, this.horizontalSpacing * .35, 0, Math.PI * 2);
      this.ctx.fill();
    }
    this.ctx.restore();
  }
}