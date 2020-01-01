import Socket from "./socket.js"
import ClientBoard from "./client_board.js";

const SOCKET_URL = "ws://localhost:3000";
const ROLES = { "waiting": 0, "playing": 1, "spectating": 2 };
const TURN_TYPE = { "ring": 0, "marker": 1, "none": 2 };
let mx = 0, my = 0;

onload = () => {
  const socket = new Socket(new WebSocket(SOCKET_URL));
  const board = new ClientBoard(document.querySelector("#yinsh-board"));
  const url = new URL(window.location);
  const gameId = url.searchParams.get("id");

  let role = ROLES["waiting"];
  let turnType = TURN_TYPE["none"];

  socket.setReceive("join", data => {
    role = ROLES[data.role];
  });

  socket.setReceive("turn", data => {
    if (data.turnNumber < 10) {
      turnType = TURN_TYPE["ring"];
      // socket.send("turn", {
      //   game: gameId,
      //   from: { vertical: 0, point: 0 },
      // });
    } else {
      turnType = TURN_TYPE["marker"];
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
    board.render();
  });

  socket.ws.onopen = () => {
    const sessionId = sessionStorage.getItem("id");
    const properties = {
      game: gameId,
      id: sessionId,
    };
    socket.send("join", properties);
  };
}

onmousemove = e => {
  mx = e.pageX;
  my = e.pageY;
}