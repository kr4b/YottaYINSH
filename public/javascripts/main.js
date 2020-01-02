import Socket from "./socket.js"
import ClientBoard from "./client_board.js";
import { SOCKET_URL, ROLES, TURN_TYPE } from "./client_constants.js";

onload = () => {
  const socket = new Socket(new WebSocket(SOCKET_URL));
  const board = new ClientBoard(document.querySelector("#yinsh-board"));
  const url = new URL(window.location);
  const gameId = url.searchParams.get("id");

  const mouse = { x: 0, y: 0 };
  let animationFrame = null;
  let pathsPerRing = null;
  let targetRing = null;

  let side = 2;
  let role = ROLES["waiting"];
  let turnType = TURN_TYPE["marker"];

  socket.setReceive("join", data => {
    role = ROLES[data.role];
  });

  socket.setReceive("side", data => {
    side = data.side;
  });

  socket.setReceive("turn", data => {
    if (data.turnNumber < 10) {
      turnType = TURN_TYPE["ring"];
      cancelAnimationFrame(animationFrame);
      animationFrame = requestAnimationFrame(update);
    } else {
      turnType = TURN_TYPE["marker"];
      targetRing = null;
      pathsPerRing = data.rings;
      cancelAnimationFrame(animationFrame);
      animationFrame = requestAnimationFrame(update);
      // socket.send("turn", {
      //   game: gameId,
      //   from: { vertical: 0, point: 0 },
      //   to: { vertical: 5, point: 5 }
      // });
    }
  });

  socket.setReceive("boardUpdate", data => {
    board.rings = data.rings;
    board.markers = data.markers;
  });

  socket.ws.onopen = () => {
    const sessionId = sessionStorage.getItem("id");
    const properties = {
      game: gameId,
      id: sessionId,
    };
    socket.send("join", properties);
  };

  onmousemove = e => {
    mouse.x = e.pageX - board.ctx.canvas.offsetLeft;
    mouse.y = e.pageY - board.ctx.canvas.offsetTop;
  }

  onclick = e => {
    mouse.x = e.pageX - board.ctx.canvas.offsetLeft;
    mouse.y = e.pageY - board.ctx.canvas.offsetTop;

    if (e.button == 0) {

      if (turnType == TURN_TYPE["ring"]) {
        board.validateRing(mouse.x, mouse.y, (vertical, point) => {
          socket.send("turn", { game: gameId, from: { vertical, point } });
          turnType = TURN_TYPE["none"];
          cancelAnimationFrame(animationFrame);
        });
      }

      if (turnType == TURN_TYPE["marker"]) {
        board.validateMarker(mouse.x, mouse.y, side, (vertical, point) => targetRing = { vertical, point });

        if (targetRing != null) {
          board.validateRing(mouse.x, mouse.y, (vertical, point) => {
            const index = vertical * 11 + point;

            if (pathsPerRing[targetRing.vertical * 11 + targetRing.point].includes(index)) {
              socket.send("turn", {
                game: gameId,
                from: targetRing,
                to: { vertical, point }
              });
            }
          });
        }
      }
    }
  }

  function update() {
    board.render();

    if (turnType == TURN_TYPE["ring"])
      board.validateRing(mouse.x, mouse.y, (vertical, point) => board.drawRing(vertical, point, side, true));
    else if (turnType == TURN_TYPE["marker"]) {
      board.validateMarker(mouse.x, mouse.y, side, (vertical, point) => board.drawMarker(vertical, point, side, true));

      if (targetRing != null) board.drawMarker(targetRing.vertical, targetRing.point, side, true);
    }

    animationFrame = requestAnimationFrame(update);
  };
}