import Board from "./board.js"

const SOCKET_URL = "ws://localhost:3000";
const ROLES = { "waiting": 0, "playing": 1, "spectating": 2 };
let mx = 0, my = 0;

onload = () => {
  const socket = new WebSocket(SOCKET_URL)
  const b = new Board(document.getElementById("yinsh-board"));
  let role = ROLES["waiting"];
  b.render();

  socket.onopen = e => {
    const sessionId = sessionStorage.getItem("id");
    const url = new URL(window.location);
    const gameId = url.searchParams.get("id");
    const properties = {
      type: "join",
      game: gameId,
      id: sessionId,
    };
    socket.send(JSON.stringify(properties));
  };

  socket.onmessage = message => {
    const response = JSON.parse(message.data);
    if (response.type == "start") {
      role = ROLES[response.role];
    } else {
      console.log(response);
    }
  };

  update();
  function update() {

    b.render();

    const yinsh = b.nearestYinshCoordinate(mx - b.ctx.canvas.offsetLeft, my - b.ctx.canvas.offsetTop);
    const canv = b.getCanvasCoordinate(yinsh.vertical, yinsh.point);
    b.ctx.strokeRect(canv.x - 3, canv.y - 3, 6, 6);
    b.ctx.strokeRect(mx - 3 - b.ctx.canvas.offsetLeft, my - 3 - b.ctx.canvas.offsetTop, 6, 6);

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