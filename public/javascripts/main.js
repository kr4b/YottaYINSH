import Socket from "./socket.js"
import ClientBoard from "./client_board.js";

const SOCKET_URL = "ws://localhost:3000";
const ROLES = { "waiting": 0, "playing": 1, "spectating": 2 };
let mx = 0, my = 0;

onload = () => {
  const socket = new Socket(new WebSocket(SOCKET_URL));
  const board = new ClientBoard(document.querySelector("#yinsh-board"));
  let role = ROLES["waiting"];

  socket.setReceive("join", data => {
    role = ROLES[data.role];
  });

  socket.setReceive("turnRequest", data => {
    const url = new URL(window.location);
    const gameId = url.searchParams.get("id");

    socket.send("turnResponse", {
      game: gameId,
      from: { vertical: 0, point: 0 },
      to: { vertical: 5, point: 5 }
    });
  });

  socket.setReceive("boardUpdate", data => {
    board.rings = data.rings;
    board.markers = data.markers;
    board.render();
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
}

onmousemove = e => {
  mx = e.pageX;
  my = e.pageY;
}