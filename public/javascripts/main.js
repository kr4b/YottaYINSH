import Socket from "./socket.js";
import ClientBoard from "./client_board.js";
import { WHITE, TURN_TYPE, COLOR_PALETTES, formatTime } from "./client_constants.js";
import Log from "./log.js";
import AudioPlayer from "./audio.js";

onload = () => {
  {
    const cc = COLOR_PALETTES[(Math.random() * COLOR_PALETTES.length) | 0];
    document.body.style.setProperty("--highlight-color-light", cc[0]);
    document.body.style.setProperty("--highlight-color-dark", cc[1]);
  }

  // Constant values
  const socket = new Socket(new WebSocket(location.origin.replace(/^http/, 'ws')));
  const board = new ClientBoard(document.getElementById("yinsh-board"));
  const audioPlayer = new AudioPlayer();
  const log = new Log(board);
  const url = new URL(window.location);
  const gameId = url.searchParams.get("id");
  let id = sessionStorage.getItem("id");


  { // Add scrollbar width padding to some elements
    const LogHeader = document.getElementById("log-header");
    const logContainer = document.getElementById("log-container");
    const scrollbarWidth = logContainer.getBoundingClientRect().width - logContainer.clientWidth;
    LogHeader.style.paddingRight = `${scrollbarWidth}px`;
    LogHeader.style.paddingLeft = `${scrollbarWidth}px`;
    logContainer.style.paddingLeft = `${scrollbarWidth}px`;
  }

  // Variables to help with board interaction
  const mouse = { x: 0, y: 0 };
  let terminated = false;
  let startTime = null;
  let pathsPerRing = null;
  let possibleRows = [];
  let targetRing = null;
  let rowToRemove = null;
  let animations = [];

  // Variables to keep track of the game
  let side = null;
  let turnType = TURN_TYPE["none"];

  socket.setReceive("join", data => {
    if (data.role == "spectating") {
      document.getElementById("spectating").style.display = "block";
      socket.send("boardRequest", { game: gameId });
      board.name1 = data.name1;
      board.name2 = data.name2;
      startTime = data.startTime;
    } else if (data.role == "waiting") {
      return;
    } else {
      startTime = Date.now();
    }

    document.getElementById("yinsh-board").classList.remove("blurred");
    document.getElementById("waitscreen").classList.add("hidden");
    board.resize();
    update();
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
    } else {
      turnType = TURN_TYPE["marker"];
      targetRing = null;
      pathsPerRing = data.rings;
    }
  });

  window.onfocus = () => {
    socket.send("boardRequest", { game: gameId });
  }

  socket.setReceive("boardRequest", data => {
    for (let i = animations.length - 1; i >= 0; i--) {
      const animation = animations[i];
      if (!animation.done) {
        animation.update(audioPlayer);
      }

      if (animation.done) {
        animations.splice(i, 1);
      }
    }

    if (animations.length > 0) return;

    board.rings = data.rings;
    board.markers = data.markers;
    board.ringsRemoved = data.ringsRemoved;
  });

  socket.setReceive("boardUpdate", data => {
    const logContainer = document.getElementById("log-container");
    const logResult = log.addLog(data);
    if (logResult && logResult.text) {
      const turnNumber = logResult.text.replace(/^([0-9]+)-.*$/, "$1");
      const side = logResult.text.replace(/^.*(BLACK|WHITE).*$/i, "$1");
      const moveData = logResult.text.replace(/^.*\./, "");

      logContainer.innerHTML +=
        `<div class="log-entry">
          <div>${turnNumber}</div>
          <div>${side}</div>
          <div>${moveData}</div>
        </div>`;
    }

    if (logResult && logResult.animation) {
      animations.push(logResult.animation);
    }
  });

  socket.setReceive("terminate", data => {
    if (terminated) return;
    terminated = true;

    let winner;
    let yourResult;

    if (side == null) {
      if (data.winner == WHITE) winner = board.name1;
      else winner = board.name2;
      yourResult = "WATCHED"
    } else if (side == data.winner) {
      setTimeout(() => {
        audioPlayer.playAudio("WIN");
      }, 500);
      winner = board.name2;
      yourResult = "WON";
    } else {
      setTimeout(() => {
        audioPlayer.playAudio("LOSE");
      }, 500);
      winner = board.name1;
      yourResult = "LOST";
    }

    const endscreenName = document.getElementById("endscreen-name");
    const endscreenSide = document.getElementById("endscreen-side");

    document.getElementById("yinsh-board").classList.add("blurred");
    document.getElementById("endscreen").classList.remove("hidden");

    endscreenName.innerHTML = winner.replace(/\s\(YOU\)$/, "");
    endscreenSide.innerHTML = `You ${yourResult} the game!`;
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

  document.getElementById("fullscreen").onclick = e => {
    document.getElementById("canvas-container").requestFullscreen();
  }

  onresize = () => {
    board.resize();
  };

  onmousemove = e => {
    const rect = board.ctx.canvas.getBoundingClientRect()
    mouse.x = e.pageX - rect.left;
    mouse.y = e.pageY - rect.top;
  };

  onclick = e => {
    onmousemove(e);

    if (e.button == 0) {

      if (turnType == TURN_TYPE["ring"]) {
        board.validateRing(mouse.x, mouse.y, (vertical, point) => {
          socket.send("turn", { id, game: gameId, from: { vertical, point } });
          turnType = TURN_TYPE["none"];
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
        }
      }
    }
  };

  function update() {
    const turnIndicator = document.querySelector("#footer-left > input:nth-of-type(1)");
    turnIndicator.value = `Turn: ${turnType == TURN_TYPE["none"] ?
      board.name1.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, "\"") :
      board.name2.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, "\"")}`;

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

    for (let i = animations.length - 1; i >= 0; i--) {
      const animation = animations[i];
      if (animation.done) {
        animations.splice(i, 1);
      } else {
        animation.update(audioPlayer);
      }
    }

    if (startTime != null) {
      const timer = document.querySelector("#footer-left > input:nth-of-type(2)");
      timer.value = formatTime(Math.floor((Date.now() - startTime) / 1000));
    }

    requestAnimationFrame(update);
  }
};