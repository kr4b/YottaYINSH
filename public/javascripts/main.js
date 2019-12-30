import Board from "./board.js"

const SOCKET_URL = "ws://localhost:3000";
const ROLES = { "waiting": 0, "playing": 1, "spectating": 2 };
let mx = 0, my = 0;

onload = () => {
  const socket = {};//new WebSocket(SOCKET_URL)
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

  b.placeRing(0, 0, 0);
  b.placeMarker(1, 2, 0);
  b.placeMarker(2, 3, 1);
  b.moveRing({ vertical: 0, point: 0 }, { vertical: 3, point: 4 });

  update();
  function update() {

    b.render();

    const yinsh = b.nearestYinshCoordinate(mx - b.ctx.canvas.offsetLeft, my - b.ctx.canvas.offsetTop);
    const canv = b.getCanvasCoordinate(yinsh.vertical, yinsh.point);
    b.ctx.strokeRect(canv.x - 3, canv.y - 3, 6, 6);
    b.ctx.strokeRect(mx - 3 - b.ctx.canvas.offsetLeft, my - 3 - b.ctx.canvas.offsetTop, 6, 6);

    const possible = b.getPossiblePaths(yinsh.vertical, yinsh.point, {});
    for (let index of possible) {
      const vertical = (index / 11) | 0;
      const point = index % 11;
      const coord = b.getCanvasCoordinate(vertical, point);
      b.ctx.fillRect(coord.x - 6, coord.y - 6, 12, 12);
    }

    //requestAnimationFrame(update);
  }

  onresize = () => {
    b.resize();
  }
}

onmousemove = e => {
  mx = e.pageX;
  my = e.pageY;
}