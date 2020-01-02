import Socket from "./socket.js"
import ClientBoard from "./client_board.js";
import { SOCKET_URL, ROLES, TURN_TYPE } from "./client_constants.js";

onload = () => {
  const socket = new Socket(new WebSocket(SOCKET_URL));
  const board = new ClientBoard(document.querySelector("#yinsh-board"));
  const url = new URL(window.location);
  const id = sessionStorage.getItem("id");
  const gameId = url.searchParams.get("id");

  const mouse = { x: 0, y: 0 };
  let animationFrame = null;
  let pathsPerRing = null;
  let possibleRows = [];
  let targetRing = null;
  let rowToRemove = null;

  let side = 2;
  let role = ROLES["waiting"];
  let turnType = TURN_TYPE["marker"];

  socket.setReceive("join", data => {
    role = ROLES[data.role];
  });

  socket.setReceive("side", data => {
    side = data.side;
  });

  socket.setReceive("row", data => {
    possibleRows = data;
    turnType = TURN_TYPE["remove"];
    targetRing = null;
    rowToRemove = null;
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
    }
  });

  socket.setReceive("boardUpdate", data => {
    board.rings = data.board.rings;
    board.markers = data.board.markers;
    update();
    console.log(data.log);
  });

  socket.ws.onopen = () => {
    const properties = {
      game: gameId,
      id,
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
          socket.send("turn", { id, game: gameId, from: { vertical, point } });
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
                id,
                game: gameId,
                from: targetRing,
                to: { vertical, point }
              });
              turnType = TURN_TYPE["none"];
              cancelAnimationFrame(animationFrame);
            }
          });
        }
      }

      if (turnType == TURN_TYPE["remove"]) {
        const { vertical, point } = board.nearestYinshCoordinate(mouse.x, mouse.y);
        const index = vertical * 11 + point;

        if (board.rings[index] == side) targetRing = index;
        else {
          let amount = 0;
          for (let row of possibleRows) {
            if (row.includes(index)) {
              amount++;
              rowToRemove = row;
            }
          }
  
          if (amount != 1) {
            rowToRemove = null;
          }
        }

        if (targetRing != null && rowToRemove != null) {
          socket.send("row", {
            id,
            game: gameId,
            row: rowToRemove,
            ring: {
              vertical: (targetRing / 11) | 0,
              point: targetRing % 11
            }
          });
          turnType = TURN_TYPE["none"];
          cancelAnimationFrame(animationFrame);
        }
      }
    }
  }

  function update() {
    board.ctx.clearRect(0, 0, board.ctx.canvas.width, board.ctx.canvas.height);

    if (turnType == TURN_TYPE["remove"]) {
      const { vertical, point } = board.nearestYinshCoordinate(mouse.x, mouse.y);
      const index = vertical * 11 + point;

      for (let row of possibleRows) board.highlightRow(row, !row.includes(index));
      if (board.rings[index] == side) board.highlightRow([index], true);

      if (targetRing != null) board.highlightRow([targetRing], false);
      if (rowToRemove != null) board.highlightRow(rowToRemove, false);
    }

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