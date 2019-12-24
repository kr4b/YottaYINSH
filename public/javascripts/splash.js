const SOCKET_URL = "ws://localhost:3000";

onload = () => {
  const createGame = game => {
    const socket = new WebSocket(SOCKET_URL);
    const properties = {
      type: "create",
      game
    };

    socket.onopen = e => {
      socket.send(JSON.stringify(properties));
    };

    socket.onmessage = message => {
      const response = JSON.parse(message);
      window.location.assign(`game.html?id=${response.id}`);
    }
  }

  document.querySelector("#public").onclick = () => createGame("public");
  document.querySelector("#private").onclick = () => createGame("private");
  document.querySelector("#ai").onclick = () => createGame("ai");
}

