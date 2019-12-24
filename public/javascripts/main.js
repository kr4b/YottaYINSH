import Board from "./board.js"

let mx = 0, my = 0;

onload = () => {
  const b = new Board(document.getElementById("yinsh-board"));
  b.render();


  update();
  function update() {

    b.render();

    const yinsh = b.nearestYinshCoordinate(mx - b.ctx.canvas.offsetLeft, my - b.ctx.canvas.offsetTop);
    const canv = b.getCanvasCoordinate(yinsh.vertical, yinsh.point);
    b.ctx.strokeRect(canv.x - 3, canv.y - 3, 6, 6);
    b.ctx.strokeRect(mx - 3 - b.ctx.canvas.offsetLeft, my - 3 - b.ctx.canvas.offsetTop, 6, 6);

    const possible = b.getPossiblePaths(yinsh.vertical, yinsh.point);
    for (let index of possible) {
      const vertical = (index / 11) | 0;
      const point = index % 11;
      const coord = b.getCanvasCoordinate(vertical, point);
      b.ctx.fillRect(coord.x - 6, coord.y - 6, 12, 12);
    }

    requestAnimationFrame(update);
  }

  onresize = () => {
    b.resize();
  }
}

onmousemove = e => {
  mx = e.pageX;
  my = e.pageY;
}