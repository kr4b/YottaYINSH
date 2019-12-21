const intersections = [4, 7, 8, 9, 10, 9, 10, 9, 8, 7, 4];

export default
  class Board {

  constructor(canvas) {
    if (canvas instanceof HTMLCanvasElement) {

      canvas.width = canvas.clientWidth;
      canvas.height = canvas.clientHeight;
      this.ctx = canvas.getContext('2d');

      this.boardSpace = new Uint8Array(121);
      this.verticalSpacing = this.ctx.canvas.height / 15;
      this.horizontalSpacing = this.verticalSpacing / 2 * Math.sqrt(3);

    } else {
      throw "Invalid argument";
    }
  }

  nearestYinshCoordinate(x, y) {
    const centerX   = (this.ctx.canvas.width - this.horizontalSpacing * intersections.length) / 2;
    const vertical  = Math.min(Math.round(Math.max(x - centerX, 0) / this.horizontalSpacing), intersections.length - 1);

    const centerY   = (this.ctx.canvas.height - this.verticalSpacing * intersections[vertical]) / 2;
    const point     = Math.min(Math.round(Math.max(y - centerY, 0) / this.verticalSpacing), intersections[vertical]);
  
    const { x: canvasX, y: canvasY } = this.getCanvasCoordinate(vertical, point);
    const distance = Math.sqrt((canvasX - x)**2 + (canvasY - y)**2);

    return { vertical, point, distance };
  }

  getCanvasCoordinate(vertical, point) {
    if (point < 0 || point >= intersections[vertical]) return null;

    const centerX = (this.ctx.canvas.width - this.horizontalSpacing * intersections.length) / 2;
    const centerY = (this.ctx.canvas.height - this.verticalSpacing * intersections[vertical]) / 2;

    const x = centerX + vertical * this.horizontalSpacing;
    const y = centerY + point * this.verticalSpacing;

    return { x, y };
  }

  render() {
    this.ctx.clearRect(0, 0, this.ctx.canvas.width, this.ctx.canvas.height);

    for (let i = 0; i < 121; i++) {
      const coords = this.getCanvasCoordinate(i % 11, (i / 11) | 0);
      if (coords == null) continue;

      this.ctx.beginPath();
      this.ctx.arc(coords.x, coords.y, 2, 0, Math.PI * 2);
      this.ctx.stroke();
    }
  }
}