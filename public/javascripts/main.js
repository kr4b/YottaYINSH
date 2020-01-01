import Board from "./board.js"
import Socket from "./socket.js"

const SOCKET_URL = "ws://localhost:3000";
const ROLES = { "waiting": 0, "playing": 1, "spectating": 2 };
let mx = 0, my = 0;

onload = () => {
  const socket = new Socket(new WebSocket(SOCKET_URL));
  const b = new Board(document.getElementById("yinsh-board"));
  let role = ROLES["waiting"];
  b.render();

  socket.setReceive("join", data => {
    role = ROLES[data.role];
  });

  socket.ws.onopen = () => {
    const sessionId = sessionStorage.getItem("id");
    const url = new URL(window.location);
    const gameId = url.searchParams.get("id");
    const properties = {
      game: gameId,
      id: sessionId,
    };
    socket.send("join", properties);
  };

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