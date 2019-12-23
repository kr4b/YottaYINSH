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

    requestAnimationFrame(update);
  }
}

onmousemove = e => {
  mx = e.pageX;
  my = e.pageY;
}