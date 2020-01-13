import Socket from "./socket.js";
import ClientBoard from "./client_board.js";
import { WHITE, SOCKET_URL, TURN_TYPE } from "./client_constants.js";
import Log from "./log.js";

onload = () => {
  // Constant values
  const socket = new Socket(new WebSocket(SOCKET_URL));
  const board = new ClientBoard(document.querySelector("#yinsh-board"));
  const log = new Log(board);
  const url = new URL(window.location);
  const gameId = url.searchParams.get("id");
  let id = sessionStorage.getItem("id");

  // Variables to help with board interaction
  const mouse = { x: 0, y: 0 };
  let animationFrame = null;
  let pathsPerRing = null;
  let possibleRows = [];
  let targetRing = null;
  let rowToRemove = null;
  let turnNumber = 0;

  // Variables to keep track of the game
  let side = null;
  let turnType = TURN_TYPE["none"];

  socket.setReceive("join", data => {
    if (data.role == "spectating") {
      document.querySelector("#spectating").style.display = "block";
      board.rings = data.board.rings;
      board.markers = data.board.markers;
      board.ringsRemoved = data.board.ringsRemoved;
      board.name1 = data.name1;
      board.name2 = data.name2;
    } else if (data.role == "waiting") {
      return;
    }

    document.querySelector("#overlay").classList.remove("overlay");
    document.querySelector("#waiting").parentElement.style.display = "none";
    board.resize();
  });

  socket.setReceive("side", data => {
    side = data.side;
    board.side = side;
    board.name1 = data.name1;
    board.name2 = data.name2 + " (YOU)";
  });

  socket.setReceive("row", data => {
    possibleRows = data;
    turnType = TURN_TYPE["remove"];
    targetRing = null;
    rowToRemove = null;
  });

  socket.setReceive("turn", data => {
    if (data.turnCounter < 10) {
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
    const logContainer = document.querySelector("#log-container");
    const logText = log.addLog(data.turnCounter, data.log);
    logContainer.innerHTML += `<div>${logText}</div>`;
    update();
  });

  socket.setReceive("terminate", data => {
    let winner;

    if (side == null) {
      if (data.winner == WHITE) winner = board.name1;
      else winner = board.name2;
    } else if (side == data.winner) {
      winner = board.name2;
    } else {
      winner = board.name1;
    }

    const endscreen = document.querySelector("#endscreen");
    endscreen.innerHTML = `${winner}<div>won the game</div>`;
    endscreen.classList.add("visible");

    // setTimeout(() => {
    //   window.location.assign("/");
    // }, 10000);
  });

  socket.setReceive("session", data => {
    if (id == null) {
      id = data.id;
      sessionStorage.setItem("id", data.id);
      socket.send("join", {
        game: gameId,
        id
      });
    }
  });

  socket.ws.onopen = () => {
    if (id == null) {
      socket.send("session", {});
      return;
    }

    socket.send("join", {
      game: gameId,
      id
    });
  };

  onresize = () => {
    board.resize();
  };

  onmousemove = e => {
    mouse.x = e.pageX - board.ctx.canvas.offsetLeft;
    mouse.y = e.pageY - board.ctx.canvas.offsetTop;
  };

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
  };

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

      if (targetRing != null) {
        board.drawMarker(targetRing.vertical, targetRing.point, side, true);

        let paths = board.getPossiblePaths(targetRing.vertical, targetRing.point, {});
        paths.splice(paths.indexOf(targetRing.vertical * 11 + targetRing.point), 1);
        board.highlightRow(paths, true, 0.6);
      }
    }

    animationFrame = requestAnimationFrame(update);
  }
};